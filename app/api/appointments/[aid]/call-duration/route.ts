import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnAppointment } from '@/lib/authz';

export async function PATCH(request: NextRequest, { params }: { params: { aid: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { aid } = params;
        const body = await request.json();
        const { start_time, end_time, duration_minutes } = body;

        if (!end_time && duration_minutes === undefined) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Unauthenticated and unscoped before: any caller could write call
        // timestamps and duration onto any appointment.
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const existing = owned.data;

        const callStartedAt = existing.call_started_at;
        const callEndedAt = existing.call_ended_at;

        const effectiveStart = callStartedAt || start_time || new Date().toISOString();
        const effectiveEnd = callEndedAt || end_time || new Date().toISOString();

        const parsedDuration = duration_minutes !== undefined ? Number(duration_minutes) : NaN;
        const rawMinutes = Number.isFinite(parsedDuration)
            ? parsedDuration
            : Math.max(
                  0,
                  (new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime()) / 60000
              );
        // Both duration columns are integer; a fractional value aborts the whole update.
        const computedDuration = Math.min(1440, Math.max(0, Math.round(rawMinutes)));

        // Duration only. Ending the call must not complete the visit — that is an
        // explicit doctor action via PATCH /api/doctor/appointments — so status is
        // deliberately left untouched here.

        const [data] = await sql`
            UPDATE appointments
            SET call_started_at = COALESCE(call_started_at, ${effectiveStart}),
                call_ended_at = ${effectiveEnd},
                duration_minutes = ${computedDuration},
                call_duration_minutes = ${computedDuration}
            WHERE aid = ${aid} AND did = ${auth.data.did}
            RETURNING *
        `;

        console.log(`[API] Updated call duration for appointment ${aid}: ${computedDuration} minutes`);
        return NextResponse.json({ success: true, data, message: 'Call duration updated successfully' });
    } catch (error: any) {
        console.error('[API] Call duration update error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
