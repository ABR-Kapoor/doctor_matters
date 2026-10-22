import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const updateSchema = z.object({
  aid: z.string().uuid(),
  status: z.string().optional().nullable(),
  mode: z.enum(['online', 'offline']).optional().nullable()
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        let uid = request.nextUrl.searchParams.get('uid');
        if (!uid) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        if (uid.startsWith('user_')) {
            const [dbUser] = await sql`SELECT uid FROM users WHERE auth_id = ${uid}`;
            if (dbUser) {
                uid = dbUser.uid;
            } else {
                return NextResponse.json({ success: true, appointments: { pending: [], confirmed: [], today: [], completed: [], cancelled: [] } });
            }
        }

        const [doctor] = await sql`SELECT did FROM doctors WHERE uid = ${uid}`;
        if (!doctor) return NextResponse.json({ success: true, appointments: { pending: [], confirmed: [], today: [], completed: [], cancelled: [] } });

        const allAppointments = await sql`
            SELECT a.*,
                   rr.refund_id,
                   rr.amount as refund_amount,
                   rr.reason as refund_reason,
                   rr.status as refund_status,
                   (rr.refund_id IS NOT NULL) as refund_requested
            FROM appointments a
            LEFT JOIN refund_requests rr ON a.aid = rr.aid
            WHERE a.did = ${doctor.did}
            ORDER BY a.scheduled_date ASC, a.scheduled_time ASC
        `;

        if (!allAppointments || allAppointments.length === 0) {
            return NextResponse.json({ success: true, appointments: { pending: [], confirmed: [], today: [], completed: [], cancelled: [] } });
        }

        const patientIds = [...new Set(allAppointments.map(apt => apt.pid))];

        const patients = await sql`
            SELECT p.pid, p.uid, u.name, u.email, u.phone, u.profile_image_url
            FROM patients p JOIN users u ON p.uid = u.uid
            WHERE p.pid = ANY(${patientIds}::uuid[])
        `;

        const enrichedAppointments = allAppointments.map((apt: any) => ({
            ...apt, complaint_description: apt.chief_complaint, payment_status: apt.payment_status,
            patient: (() => {
                const p = patients?.find(pat => pat.pid === apt.pid);
                return p ? { pid: p.pid, uid: p.uid, user: { name: p.name, email: p.email, phone: p.phone, profile_image_url: p.profile_image_url } } : null;
            })()
        }));

        const now = new Date();
        const todayString = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
        const toDateStr = (d: any): string => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

        return NextResponse.json({
            success: true,
            appointments: {
                pending: enrichedAppointments.filter((a: any) => a.status === 'scheduled'),
                confirmed: enrichedAppointments.filter((a: any) => ['confirmed', 'in_progress'].includes(a.status) && toDateStr(a.scheduled_date) !== todayString),
                today: enrichedAppointments.filter((a: any) => toDateStr(a.scheduled_date) === todayString && ['confirmed', 'in_progress', 'scheduled'].includes(a.status)),
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
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitRes = await checkRateLimit(`doctor_apt_${ip}`);
        if (!rateLimitRes.success) return rateLimitRes.response!;

        const body = await request.json();
        const validated = updateSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json({ error: 'Invalid input data', details: validated.error.flatten().fieldErrors }, { status: 400 });
        }
        
        const { aid, status, mode } = validated.data;

        const [existing] = await sql`
            SELECT aid, status, mode, call_started_at
            FROM appointments
            WHERE aid = ${aid}
        `;

        if (!existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Mode-only change
        if (mode && !status) {
            if (!['online', 'offline'].includes(mode)) {
                return NextResponse.json({ error: 'Invalid mode. Must be online or offline' }, { status: 400 });
            }
            const [data] = await sql`
                UPDATE appointments SET mode = ${mode} WHERE aid = ${aid} RETURNING *
            `;
            return NextResponse.json({ success: true, appointment: data });
        }

        // Status change
        if (!status) return NextResponse.json({ error: 'Status or mode required' }, { status: 400 });

        const nowIso = new Date().toISOString();
        let callEndedAt: string | null = null;
        let durationMinutes: number | null = null;

        if (status === 'cancelled' || status === 'completed') {
            callEndedAt = nowIso;
            if (existing.call_started_at) {
                durationMinutes = Math.max(
                    0,
                    (new Date(nowIso).getTime() - new Date(existing.call_started_at).getTime()) / 60000
                );
            }
        }

        const [data] = await sql`
            UPDATE appointments
            SET status = ${status},
                call_ended_at = COALESCE(${callEndedAt}, call_ended_at),
                duration_minutes = COALESCE(${durationMinutes}, duration_minutes),
                call_duration_minutes = COALESCE(${durationMinutes}, call_duration_minutes)
            WHERE aid = ${aid}
            RETURNING *
        `;

        // If doctor cancels and payment was made, automatically request a full refund for the patient
        if (status === 'cancelled' && (data.payment_status === 'paid' || data.payment_status === 'completed')) {
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
        }

        return NextResponse.json({ success: true, appointment: data });
    } catch (error) {
        console.error('Update appointment error:', error);
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }
}

// DELETE is intentionally disabled — appointment records must not be deleted
export async function DELETE() {
    return NextResponse.json(
        { error: 'Deleting appointment records is not permitted' },
        { status: 403 }
    );
}
