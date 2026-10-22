import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { aid: string } }) {
    try {
        const { aid } = params;
        const body = await request.json();
        const { start_time, end_time, duration_minutes } = body;

        if (!end_time && duration_minutes === undefined) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const [existing] = await sql`
            SELECT call_started_at, call_ended_at, call_duration_minutes, duration_minutes, status
            FROM appointments
            WHERE aid = ${aid}
        `;

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
        }

        const callStartedAt = existing.call_started_at || existing.callStartedAt;
        const callEndedAt = existing.call_ended_at || existing.callEndedAt;

        const effectiveStart = callStartedAt || start_time || new Date().toISOString();
        const effectiveEnd = callEndedAt || end_time || new Date().toISOString();

        const parsedDuration = duration_minutes !== undefined ? Number(duration_minutes) : NaN;
        const computedDuration = Number.isFinite(parsedDuration)
            ? parsedDuration
            : Math.max(
                  0,
                  (new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime()) / 60000
              );

        const nextStatus = existing.status === 'cancelled' ? 'cancelled' : 'completed';

        const [data] = await sql`
            UPDATE appointments
            SET call_started_at = COALESCE(call_started_at, ${effectiveStart}),
                call_ended_at = ${effectiveEnd},
                duration_minutes = ${computedDuration},
                call_duration_minutes = ${computedDuration},
                status = ${nextStatus}
            WHERE aid = ${aid} RETURNING *
        `;

        console.log(`[API] Updated call duration for appointment ${aid}: ${computedDuration} minutes`);
        return NextResponse.json({ success: true, data, message: 'Call duration updated successfully' });
    } catch (error: any) {
        console.error('[API] Call duration update error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
