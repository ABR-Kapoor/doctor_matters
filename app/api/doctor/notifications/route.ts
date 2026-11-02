import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const auth = await requireDoctor();
        if (!auth.ok) return auth.response;

        // Sync patient medication adherence alerts for this doctor (e.g. patients with doses scheduled today)
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const patientAdherence = await sql`
                SELECT DISTINCT pt.pid, u.name as patient_name, u.profile_image_url as patient_image, ma.medicine_name, ma.scheduled_time
                FROM medication_adherence ma
                JOIN prescriptions pr ON ma.prescription_id = pr.prescription_id
                JOIN patients pt ON ma.pid = pt.pid
                JOIN users u ON pt.uid = u.uid
                WHERE pr.did = ${auth.data.did}
                  AND ma.scheduled_date = ${todayStr}
                  AND (ma.is_taken IS FALSE OR ma.is_taken IS NULL)
                ORDER BY ma.scheduled_time ASC
                LIMIT 5
            `;

            for (const item of patientAdherence) {
                const notifTitle = 'Patient Medication Reminder: ' + (item.patient_name || 'Patient');
                const notifBody = (item.patient_name || 'Your patient') + ' has a scheduled dose of ' + item.medicine_name + ' at ' + String(item.scheduled_time).substring(0, 5) + '.';
                
                const [existing] = await sql`
                    SELECT notification_id FROM notifications
                    WHERE uid = ${auth.data.uid}
                      AND title = ${notifTitle}
                      AND created_at::date = CURRENT_DATE
                    LIMIT 1
                `;

                if (!existing) {
                    await sql`
                        INSERT INTO notifications (uid, title, body, type, is_read, metadata)
                        VALUES (
                            ${auth.data.uid},
                            ${notifTitle},
                            ${notifBody},
                            'reminder',
                            false,
                            ${JSON.stringify({
                                image_url: item.patient_image || null,
                                avatar_url: item.patient_image || null,
                                patient_name: item.patient_name || 'Patient',
                                pid: item.pid,
                            })}::jsonb
                        )
                    `;
                }
            }
        } catch (doseErr) {
            console.error('Failed to sync doctor medication alerts:', doseErr);
        }

        let notifications = await sql`
            SELECT * FROM notifications
            WHERE uid = ${auth.data.uid}
            ORDER BY created_at DESC
            LIMIT 50
        `;

        if (!notifications || notifications.length === 0) {
            // Seed initial notifications for doctor so the page shows real updates
            await sql`
                INSERT INTO notifications (uid, title, body, type, is_read)
                VALUES 
                    (${auth.data.uid}, 'Welcome to Doctor Portal', 'Your practice workspace is active. You can manage consultations, view patient history, and create digital prescriptions.', 'general', false),
                    (${auth.data.uid}, 'Appointments System Active', 'New patient appointment requests and queue notifications will appear here.', 'general', false)
            `;
            notifications = await sql`
                SELECT * FROM notifications
                WHERE uid = ${auth.data.uid}
                ORDER BY created_at DESC
                LIMIT 50
            `;
        }

        const enrichedNotifications = await Promise.all(
            (notifications || []).map(async (n: any) => {
                let meta = n.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch {}
                }
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch {}
                }

                const appointmentId = meta?.appointment_id || meta?.aid || null;
                const patientId = meta?.pid || null;
                const appointmentRelated =
                    n.type === 'appointment' ||
                    ['appointment_status', 'appointment_cancelled', 'mode_change'].includes(String(n.type || '')) ||
                    /appointment|consultation|refund|patient/i.test(`${n.title || ''} ${n.body || ''}`);

                let imageUrl = meta?.image_url || meta?.avatar_url || n.image_url || null;
                let patientName = meta?.patient_name || n.patient_name || null;

                try {
                    // 1. Resolve the exact appointment.
                    if (appointmentId) {
                        const [apt] = await sql`
                            SELECT p.pid, u.name as patient_name, u.profile_image_url
                            FROM appointments a
                            JOIN patients p ON a.pid = p.pid
                            JOIN users u ON p.uid = u.uid
                            WHERE a.aid = ${appointmentId} AND a.did = ${auth.data.did}
                            LIMIT 1
                        `;
                        if (apt) {
                            imageUrl = apt.profile_image_url || imageUrl;
                            patientName = patientName || apt.patient_name;
                        }
                    }

                    // 2. Resolve by patient id if present.
                    if (patientId && (!imageUrl || !patientName)) {
                        const [patient] = await sql`
                            SELECT p.pid, u.name as patient_name, u.profile_image_url
                            FROM patients p
                            JOIN users u ON p.uid = u.uid
                            WHERE p.pid = ${patientId}
                              AND EXISTS (
                                  SELECT 1 FROM appointments a
                                  WHERE a.pid = p.pid AND a.did = ${auth.data.did}
                              )
                            LIMIT 1
                        `;
                        if (patient) {
                            imageUrl = imageUrl || patient.profile_image_url || null;
                            patientName = patientName || patient.patient_name;
                        }
                    }

                    // 3. Match the patient name from the notification body.
                    if (appointmentRelated && (!imageUrl || !patientName)) {
                        const body = String(n.body || '');
                        const candidates: string[] = [];
                        const withMatch = body.match(/(?:with|by)\s+([^.]+?)(?:\s+(?:is|was|on|has|requested)\b|\.|$)/i);
                        if (withMatch) candidates.push(withMatch[1]);
                        const requestedMatch = body.match(/^([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3})\s+requested/i);
                        if (requestedMatch) candidates.push(requestedMatch[1]);
                        const doseMatch = body.match(/^(.+?)\s+has a scheduled dose/i);
                        if (doseMatch) candidates.push(doseMatch[1]);

                        for (const candidate of candidates) {
                            const searchedName = candidate.trim();
                            if (!searchedName) continue;
                            const [matchedPatient] = await sql`
                                SELECT p.pid, u.name as patient_name, u.profile_image_url
                                FROM patients p
                                JOIN users u ON p.uid = u.uid
                                WHERE u.name ILIKE ${'%' + searchedName + '%'}
                                  AND EXISTS (
                                      SELECT 1 FROM appointments a
                                      WHERE a.pid = p.pid AND a.did = ${auth.data.did}
                                  )
                                LIMIT 1
                            `;
                            if (matchedPatient) {
                                imageUrl = imageUrl || matchedPatient.profile_image_url || null;
                                patientName = patientName || matchedPatient.patient_name;
                                break;
                            }
                        }
                    }

                    // 4. Fallback: most recent patient this doctor has seen.
                    if (appointmentRelated && !imageUrl) {
                        const [apt] = await sql`
                            SELECT p.pid, u.name as patient_name, u.profile_image_url
                            FROM appointments a
                            JOIN patients p ON a.pid = p.pid
                            JOIN users u ON p.uid = u.uid
                            WHERE a.did = ${auth.data.did}
                            ORDER BY a.created_at DESC
                            LIMIT 1
                        `;
                        if (apt) {
                            imageUrl = imageUrl || apt.profile_image_url || null;
                            patientName = patientName || apt.patient_name;
                        }
                    }
                } catch (fallbackErr) {
                    console.error('Error resolving notification patient image:', fallbackErr);
                }

                return {
                    ...n,
                    image_url: imageUrl,
                    avatar_url: imageUrl,
                    patient_name: patientName,
                };
            })
        );

        return NextResponse.json({
            success: true,
            notifications: enrichedNotifications || [],
        });
    } catch (error) {
        console.error('Error fetching doctor notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
