import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnAppointment, isJoinableStatus } from '@/lib/authz';

export async function POST(request: NextRequest, { params }: { params: { aid: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { aid } = params;

        // Unauthenticated and unscoped before: any caller could start a call on
        // any appointment and drive its status to `in_progress`.
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const appointment = owned.data;

        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return NextResponse.json({
                success: false,
                error: `Cannot start call for ${appointment.status} appointment`,
            }, { status: 409 });
        }

        // A scheduled appointment must be confirmed by the doctor first. This
        // route previously only rejected cancelled/completed, so the doctor's
        // explicit confirmation step could be bypassed by just starting the call.
        if (!isJoinableStatus(appointment.status)) {
            return NextResponse.json({
                success: false,
                error: 'Confirm the appointment before starting the call',
            }, { status: 409 });
        }

        if (appointment.call_started_at) {
            return NextResponse.json({ success: true, message: 'Call already started', data: appointment });
        }

        const [data] = await sql`
            UPDATE appointments
            SET call_started_at = ${new Date().toISOString()},
                call_ended_at = NULL,
                status = 'in_progress'
            WHERE aid = ${aid} AND did = ${auth.data.did}
            RETURNING *
        `;

        return NextResponse.json({ success: true, data, message: 'Call started successfully' });
    } catch (error: any) {
        console.error('[API] Start call error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
