import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireDoctor, requireOwnAppointment } from '@/lib/authz';
import { closeOpenCallForAppointment, hasOpenCallForAppointment } from '@/lib/callSessions';

const updateSchema = z.object({
    aid: z.string().uuid(),
    // Whitelist the status transition target. Previously any arbitrary string was
    // written straight to the column.
    //
    // The legacy aliases (`booked`, `requested`) are accepted as SOURCE values
    // only — a doctor confirming one of those writes the canonical `confirmed`.
    // They are kept in the enum so a PATCH against an appointment still stored
    // with an alias does not fail validation with a 400.
    status: z.enum(['scheduled', 'pending', 'booked', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional().nullable(),
    mode: z.enum(['online', 'offline']).optional().nullable()
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        // The `?uid=` selector is gone: the session is the only identity, so a
        // doctor can no longer read another doctor's appointment list by
        // swapping the query parameter.
        const doctor = { did: auth.data.did };

        const allAppointments = await sql`
            SELECT a.*,
                   rr.refund_id,
                   rr.amount as refund_amount,
                   rr.reason as refund_reason,
                   rr.status as refund_status,
                   (rr.refund_id IS NOT NULL) as refund_requested,
                   (((a.scheduled_date + a.scheduled_time) AT TIME ZONE 'Asia/Kolkata') - interval '10 minutes') AS call_opens_at,
                   (
                       a.mode = 'online'
                       AND a.status IN ('confirmed', 'in_progress')
                       AND NOW() >= (((a.scheduled_date + a.scheduled_time) AT TIME ZONE 'Asia/Kolkata') - interval '10 minutes')
                   ) AS call_available,
                   NOW() AS server_time
            FROM appointments a
            LEFT JOIN refund_requests rr ON a.aid = rr.aid
            WHERE a.did = ${doctor.did}
            ORDER BY a.scheduled_date ASC, a.scheduled_time ASC
        `;

        if (!allAppointments || allAppointments.length === 0) {
            return NextResponse.json({ success: true, appointments: { pending: [], confirmed: [], today: [], completed: [], cancelled: [] } });
        }

        const patientIds = [...new Set(allAppointments.map(apt => apt.pid))];
        const appointmentIds = allAppointments.map(apt => apt.aid);

        const patients = await sql`
            SELECT p.pid, p.uid, u.name, u.email, u.phone, u.profile_image_url
            FROM patients p JOIN users u ON p.uid = u.uid
            WHERE p.pid = ANY(${patientIds}::uuid[])
        `;

        // Count unread patient messages for each appointment
        const unreadCounts = await sql`
            SELECT aid, COUNT(*)::int as count
            FROM appointment_messages
            WHERE aid = ANY(${appointmentIds}::uuid[])
              AND sender_role = 'patient'
              AND read_at IS NULL
            GROUP BY aid
        `;
        const unreadMap = new Map((unreadCounts || []).map((r: any) => [r.aid, Number(r.count)]));

        const enrichedAppointments = allAppointments.map((apt: any) => ({
            ...apt, complaint_description: apt.chief_complaint, payment_status: apt.payment_status,
            callAvailable: Boolean(apt.call_available), callOpensAt: apt.call_opens_at, serverTime: apt.server_time,
            unread_messages_count: unreadMap.get(apt.aid) || 0, unreadMessagesCount: unreadMap.get(apt.aid) || 0,
            patient: (() => {
                const p = patients?.find(pat => pat.pid === apt.pid);
                return p ? { pid: p.pid, uid: p.uid, user: { name: p.name, email: p.email, phone: p.phone, profile_image_url: p.profile_image_url } } : null;
            })()
        }));

        const now = new Date();
        const todayString = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
        const toDateStr = (d: any): string => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

        // `pending`/`confirmed`/`completed`/`cancelled` are buckets by LIFECYCLE
        // STATUS. `today` is an orthogonal DATE filter and therefore deliberately
        // overlaps the others — an appointment can legitimately be both pending
        // and today.
        //
        // These used to exclude today from `pending`/`confirmed`, which made the
        // status buckets mutually exclusive with `today`. The consequence: the
        // appointment you had just booked (always scheduled for today) was served
        // *only* under `today`, so the doctor's default Pending tab rendered
        // "No appointments in this category" and a new booking looked lost.
        const PENDING: string[] = ['scheduled', 'pending', 'booked', 'requested'];
        const CONFIRMED: string[] = ['confirmed', 'in_progress'];
        const OPEN = [...PENDING, ...CONFIRMED];

        return NextResponse.json({
            success: true,
            appointments: {
                pending: enrichedAppointments.filter((a: any) => PENDING.includes(a.status)),
                confirmed: enrichedAppointments.filter((a: any) => CONFIRMED.includes(a.status)),
                today: enrichedAppointments.filter((a: any) => toDateStr(a.scheduled_date) === todayString && OPEN.includes(a.status)),
                completed: enrichedAppointments.filter((a: any) => a.status === 'completed'),
                cancelled: enrichedAppointments.filter((a: any) => a.status === 'cancelled'),
            },
        });
    } catch (error) {
        console.error('Appointments API error:', error);
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitRes = await checkRateLimit(`doctor_apt_${auth.data.did}_${ip}`);
        if (!rateLimitRes.success) return rateLimitRes.response!;

        const body = await request.json();
        const validated = updateSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json({ error: 'Invalid input data', details: validated.error.flatten().fieldErrors }, { status: 400 });
        }
        
        const { aid, status, mode } = validated.data;

        // This route previously took a bare `aid` from the body with no session
        // check and no ownership check, so anyone could confirm, complete or
        // cancel any appointment in the system and trigger a refund.
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const existing = owned.data;

        // Mode-only change
        if (mode && !status) {
            if (mode !== 'online' && await hasOpenCallForAppointment(aid)) {
                return NextResponse.json({
                    success: false,
                    code: 'CALL_IN_PROGRESS',
                    error: 'End the active call before changing this appointment to in-person.',
                }, { status: 409 });
            }

            const [data] = await sql`
                UPDATE appointments SET mode = ${mode} WHERE aid = ${aid} AND did = ${auth.data.did} RETURNING *
            `;
            try {
                const [pt] = await sql`
                    SELECT p.uid as patient_uid, p.pid as patient_pid, u.name as patient_name, u.profile_image_url as patient_image
                    FROM appointments ap 
                    JOIN patients p ON ap.pid = p.pid 
                    JOIN users u ON p.uid = u.uid 
                    WHERE ap.aid = ${aid}
                `;
                const [docUser] = await sql`
                    SELECT u.name as doctor_name, u.profile_image_url as doctor_image
                    FROM doctors d
                    JOIN users u ON d.uid = u.uid
                    WHERE d.did = ${auth.data.did}
                `;
                const rawDocName = docUser?.doctor_name || 'your doctor';
                const docName = rawDocName.replace(/^Dr\.?\s+/i, '');
                const displayDocName = `Dr. ${docName}`;
                const doctorImage = docUser?.doctor_image || null;
                const patientImage = pt?.patient_image || null;
                const patientName = pt?.patient_name || 'patient';
                const modeLabel = mode === 'online' ? 'Online Video Consultation' : 'In-Clinic Visit';
                const ptMsg = 'Your appointment mode has been changed to ' + modeLabel + '.';
                const docMsg = 'Appointment mode with ' + patientName + ' was changed to ' + modeLabel + '.';

                if (pt?.patient_uid) {
                    await sql`
                        INSERT INTO notifications (uid, title, body, type, is_read, metadata)
                        VALUES (
                            ${pt.patient_uid},
                            'Visit Mode Updated',
                            ${ptMsg},
                            'appointment',
                            false,
                            ${JSON.stringify({
                                image_url: doctorImage,
                                avatar_url: doctorImage,
                                doctor_name: displayDocName,
                                did: auth.data.did,
                                appointment_id: aid,
                            })}::jsonb
                        )
                    `;
                }
                await sql`
                    INSERT INTO notifications (uid, title, body, type, is_read, metadata)
                    VALUES (
                        ${auth.data.uid},
                        'Visit Mode Updated',
                        ${docMsg},
                        'appointment',
                        false,
                        ${JSON.stringify({
                            image_url: patientImage,
                            avatar_url: patientImage,
                            patient_name: patientName,
                            pid: pt?.patient_pid || data.pid,
                            appointment_id: aid,
                        })}::jsonb
                    )
                `;
            } catch (notifErr) {
                console.error('Mode change notification error:', notifErr);
            }

            return NextResponse.json({ success: true, appointment: data });
        }

        // Status change
        if (!status) return NextResponse.json({ error: 'Status or mode required' }, { status: 400 });

        const nowIso = new Date().toISOString();
        let callEndedAt: string | null = null;
        let durationMinutes: number | null = null;

        if (status === 'cancelled' || status === 'completed') {
            const callSession = await closeOpenCallForAppointment(
                aid,
                status === 'cancelled' ? 'appointment_cancelled' : 'appointment_completed',
            );
            const effectiveCallStart = callSession.acceptedAt || existing.call_started_at;
            callEndedAt = nowIso;
            if (effectiveCallStart) {
                const rawMinutes = (new Date(nowIso).getTime() - new Date(effectiveCallStart).getTime()) / 60000;
                // duration_minutes / call_duration_minutes are integer columns, and a stale
                // call_started_at can yield a fractional or absurdly large value.
                durationMinutes = Math.min(1440, Math.max(0, Math.round(rawMinutes)));
            }
        }

        let data: any;
        try {
            [data] = await sql`
                UPDATE appointments
                SET status = ${status},
                    call_ended_at = COALESCE(${callEndedAt}, call_ended_at),
                    duration_minutes = COALESCE(${durationMinutes}, duration_minutes),
                    call_duration_minutes = COALESCE(${durationMinutes}, call_duration_minutes)
                WHERE aid = ${aid} AND did = ${auth.data.did}
                RETURNING *
            `;
        } catch (updateErr: any) {
            console.error('[PATCH Appointments] UPDATE appointments failed:', updateErr.message, updateErr.code);
            throw updateErr;
        }

        // If doctor cancels and payment was made, automatically request a full refund for the patient
        if (status === 'cancelled' && (data.payment_status === 'paid' || data.payment_status === 'completed')) {
            try {
                const [existingRefund] = await sql`
                    SELECT refund_id FROM refund_requests WHERE aid = ${aid}
                `;
                if (!existingRefund) {
                    // Fetch paid amount from finance_transactions
                    const [tx] = await sql`
                        SELECT amount FROM finance_transactions 
                        WHERE aid = ${aid} AND transaction_type = 'consultation' AND status = 'paid'
                        ORDER BY created_at DESC LIMIT 1
                    `;
                    const refundAmount = tx ? tx.amount : 0;
                    
                    await sql`
                        INSERT INTO refund_requests (aid, pid, did, amount, reason, status)
                        VALUES (${aid}, ${data.pid}, ${data.did}, ${refundAmount}, 'Doctor cancelled appointment', 'pending')
                    `;
                }
            } catch (refundErr: any) {
                // Log but don't fail the cancellation — refund can be retried separately
                console.error('[PATCH Appointments] Auto-refund insert failed:', refundErr.message, refundErr.code, refundErr);
            }
        }


        // In-app notifications for status transitions (confirmed, in_progress, completed, cancelled)
        try {
            const [pt] = await sql`
                SELECT p.uid as patient_uid, p.pid as patient_pid, u.name as patient_name, u.profile_image_url as patient_image
                FROM appointments ap 
                JOIN patients p ON ap.pid = p.pid 
                JOIN users u ON p.uid = u.uid 
                WHERE ap.aid = ${aid}
            `;
            const [docUser] = await sql`
                SELECT u.name as doctor_name, u.profile_image_url as doctor_image
                FROM doctors d
                JOIN users u ON d.uid = u.uid
                WHERE d.did = ${auth.data.did}
            `;
            const rawDocName = docUser?.doctor_name || 'your doctor';
            const docName = 'Dr. ' + rawDocName.replace(/^Dr\.?\s+/i, '');
            const ptName = pt?.patient_name || 'Patient';
            const doctorImage = docUser?.doctor_image || null;
            const patientImage = pt?.patient_image || null;
            const patientMeta = {
                image_url: doctorImage,
                avatar_url: doctorImage,
                doctor_name: docName,
                did: auth.data.did,
                appointment_id: aid,
            };
            const doctorMeta = {
                image_url: patientImage,
                avatar_url: patientImage,
                patient_name: ptName,
                pid: pt?.patient_pid || data.pid,
                appointment_id: aid,
            };

            let patientTitle = '';
            let patientBody = '';
            let doctorTitle = '';
            let doctorBody = '';

            if (status === 'confirmed') {
                patientTitle = 'Appointment Confirmed';
                patientBody = docName + ' has confirmed your consultation for ' + data.scheduled_date + ' at ' + data.scheduled_time + '.';
                doctorTitle = 'Appointment Confirmed';
                doctorBody = 'You confirmed the appointment with ' + ptName + '.';
            } else if (status === 'in_progress') {
                patientTitle = 'Consultation Started';
                patientBody = docName + ' has started your consultation session.';
                doctorTitle = 'Consultation In Progress';
                doctorBody = 'Consultation with ' + ptName + ' is currently in progress.';
            } else if (status === 'completed') {
                patientTitle = 'Consultation Completed';
                patientBody = 'Your consultation with ' + docName + ' has been marked as completed.';
                doctorTitle = 'Consultation Completed';
                doctorBody = 'You marked the consultation with ' + ptName + ' as completed.';
            } else if (status === 'cancelled') {
                patientTitle = 'Appointment Cancelled';
                patientBody = docName + ' cancelled the appointment on ' + data.scheduled_date + '. Full refund will be processed.';
                doctorTitle = 'Appointment Cancelled';
                doctorBody = 'You cancelled the appointment with ' + ptName + '.';
            }

            if (patientTitle && pt?.patient_uid) {
                await sql`
                    INSERT INTO notifications (uid, title, body, type, is_read, metadata)
                    VALUES (${pt.patient_uid}, ${patientTitle}, ${patientBody}, 'appointment', false, ${JSON.stringify(patientMeta)}::jsonb)
                `;
            }

            if (doctorTitle) {
                await sql`
                    INSERT INTO notifications (uid, title, body, type, is_read, metadata)
                    VALUES (${auth.data.uid}, ${doctorTitle}, ${doctorBody}, 'appointment', false, ${JSON.stringify(doctorMeta)}::jsonb)
                `;
            }
        } catch (notifErr) {
            console.error('Failed to record doctor appointment status notification:', notifErr);
        }


        return NextResponse.json({ success: true, appointment: data });
    } catch (error: any) {
        console.error('Update appointment error:', error);
        return NextResponse.json({ error: 'Failed to update appointment', details: error?.message, code: error?.code, constraint: error?.constraint_name }, { status: 500 });
    }
}

// DELETE is intentionally disabled — appointment records must not be deleted
export async function DELETE() {
    return NextResponse.json(
        { error: 'Deleting appointment records is not permitted' },
        { status: 403 }
    );
}
