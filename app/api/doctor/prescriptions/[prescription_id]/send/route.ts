import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnPrescription } from '@/lib/authz';
import { notifyOnce, PATIENT_PUSH_CHANNEL } from '@/lib/shared/notifications/inApp';

/**
 * Notifies the patient backend that the (now delivered) prescription exists.
 * If the service hop is unavailable, directly delivers in-app and Expo push notifications.
 */
async function notifyPatientPrescription(
    payload: Record<string, unknown>,
    prescriptionId: string,
    patientPid: string,
    doctorDid: string,
): Promise<void> {
    const patientApi = process.env.PATIENT_API_URL;
    const serviceSecret = process.env.INTERNAL_SERVICE_SECRET;
    let delivered = false;

    if (patientApi && serviceSecret) {
        try {
            const res = await fetch(`${patientApi.replace(/\/$/, '')}/api/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-service-secret': serviceSecret,
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(8000),
            });

            if (res.ok) {
                delivered = true;
            } else {
                console.warn(`[send] patient notification service hop failed (${res.status}), trying direct push`);
            }
        } catch (err) {
            console.warn('[send] patient notification service error, trying direct push:', err);
        }
    }

    if (!delivered) {
        try {
            const [pt] = await sql`SELECT uid FROM patients WHERE pid = ${patientPid} LIMIT 1`;
            const [doc] = await sql`
                SELECT u.name, u.profile_image_url 
                FROM doctors d JOIN users u ON d.uid = u.uid 
                WHERE d.did = ${doctorDid} LIMIT 1
            `;
            if (pt?.uid) {
                const docName = doc?.name ? `Dr. ${doc.name.replace(/^Dr\.?\s+/i, '')}` : 'Your doctor';
                await notifyOnce({
                    uid: pt.uid,
                    title: 'New Prescription Received',
                    body: `${docName} has sent you a new prescription with medications and instructions.`,
                    type: 'prescription',
                    actionUrl: '/dashboard/prescriptions',
                    eventKey: `prescription:${prescriptionId}:sent`,
                    metadata: {
                        prescription_id: prescriptionId,
                        did: doctorDid,
                        pid: patientPid,
                        doctor_name: docName,
                        image_url: doc?.profile_image_url || null,
                    },
                    pushChannelId: PATIENT_PUSH_CHANNEL,
                });
            }
        } catch (directErr) {
            console.error('[send] direct prescription push error:', directErr);
        }
    }
}

// Mirror the DB trigger's frequency-to-times mapping
function parseFrequencyTimes(frequency: string): string[] {
    const f = (frequency || '').toLowerCase().trim();
    if (f.includes('twice') || f.includes('2 times') || f.includes('two times') ||
        f.includes('morning') && f.includes('night') || f.includes('morning') && f.includes('evening')) {
        return ['09:00', '21:00'];
    }
    if (f.includes('thrice') || f.includes('3 times') || f.includes('three times') ||
        f.includes('morning') && f.includes('afternoon') && f.includes('night') ||
        f.includes('morning') && f.includes('afternoon') && f.includes('evening')) {
        return ['09:00', '14:00', '21:00'];
    }
    if (f.includes('4 times') || f.includes('four times')) {
        return ['08:00', '12:00', '16:00', '20:00'];
    }
    if (f.includes('bedtime') || (f.includes('night') && !f.includes('morning'))) {
        return ['22:00'];
    }
    if (f.includes('afternoon') || f.includes('lunch')) {
        return ['14:00'];
    }
    if (f.includes('morning') || f.includes('breakfast')) {
        return ['08:00'];
    }
    return ['09:00']; // default: once daily
}

function parseDurationDays(duration: string): number {
    const d = (duration || '').toLowerCase().trim();
    const num = parseInt(d) || 0;
    if (d.includes('month')) return (num || 1) * 30;
    if (d.includes('week')) return (num || 1) * 7;
    if (d.includes('day')) return num || 7;
    if (num > 0) return num;
    return 7; // default
}

export async function POST(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;

        // This route had no authentication at all: anyone could mark any
        // prescription as delivered to a patient and materialise their
        // medication schedule.
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        const did = auth.data.did;

        // NOTE: this route previously issued `CREATE OR REPLACE FUNCTION
        // auto_create_adherence_records()` on every single request. That is a DDL
        // statement executed from an HTTP handler on each send — it took a schema
        // lock, required elevated privileges, and meant the deployed trigger was
        // whatever the last request happened to write. The function is now
        // applied once, manually, to the database.
        //
        // Adherence rows are generated by the app-level loop below, which is
        // idempotent (ON CONFLICT DO NOTHING), so the trigger is a backstop
        // rather than a requirement.

        // Fetch the prescription first so we have the data even if a trigger fires
        const [existing] = await sql`
            SELECT * FROM prescriptions WHERE prescription_id = ${prescription_id} AND did = ${did}
        `;
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        // Mark as sent — the app-level code below generates the adherence records
        let data = existing;
        try {
            const [updated] = await sql`
                UPDATE prescriptions SET sent_to_patient = true, sent_at = ${new Date().toISOString()}
                WHERE prescription_id = ${prescription_id} AND did = ${did}
                RETURNING *
            `;
            if (updated) data = updated;
        } catch (updateErr: any) {
            console.error('[Send] UPDATE failed (likely trigger error):', updateErr.message);
            try {
                const [fallback] = await sql`
                    UPDATE prescriptions SET sent_to_patient = true, sent_at = ${new Date().toISOString()},
                        updated_at = ${new Date().toISOString()}
                    WHERE prescription_id = ${prescription_id} AND did = ${did} AND sent_to_patient = false
                    RETURNING *
                `;
                if (fallback) data = fallback;
            } catch (fallbackErr: any) {
                console.error('[Send] Fallback UPDATE also failed:', fallbackErr.message);
                return NextResponse.json({ success: false, error: 'Failed to send prescription: ' + updateErr.message }, { status: 500 });
            }
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        // Auto-generate adherence records now that the prescription is sent
        const pid = data.pid;
        const medicines = Array.isArray(data.medicines)
            ? data.medicines
            : JSON.parse(data.medicines || '[]');

        const now = new Date();
        let insertedCount = 0;

        for (const med of medicines) {
            const times = parseFrequencyTimes(med.frequency || '');
            const days = parseDurationDays(med.duration || '');

            for (let i = 0; i < days; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() + i);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                for (const time of times) {
                    await sql`
                        INSERT INTO medication_adherence
                            (pid, prescription_id, medicine_name, scheduled_date, scheduled_time, is_taken, is_skipped)
                        VALUES
                            (${pid}, ${prescription_id}, ${med.name}, ${dateStr}, ${time}, false, false)
                        ON CONFLICT (prescription_id, medicine_name, scheduled_date, scheduled_time) DO NOTHING
                    `;
                    insertedCount++;
                }
            }
        }

        // Refresh materialized view for stats
        try {
            await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY adherence_progress_summary`;
        } catch {
            try { await sql`REFRESH MATERIALIZED VIEW adherence_progress_summary`; } catch { /* ignore */ }
        }

        console.log(`[Send] Prescription ${prescription_id} sent. Generated ${insertedCount} adherence records.`);

        // Fire only now: the prescription just became visible to the patient.
        await notifyPatientPrescription(
            {
                type: 'prescription_created',
                data: { patientId: pid, doctorId: did, diagnosis: data.diagnosis, medicines, instructions: data.instructions },
            },
            prescription_id,
            pid,
            did,
        );

        return NextResponse.json({
            success: true,
            prescription: data,
            message: 'Prescription sent to patient successfully',
            adherenceRecordsCreated: insertedCount
        });
    } catch (error: any) {
        console.error('[API] Send prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
