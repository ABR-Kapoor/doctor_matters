import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { aid: string } }) {
    try {
        const { aid } = params;

        const [appointment] = await sql`SELECT call_started_at, status FROM appointments WHERE aid = ${aid}`;

        if (!appointment) {
            return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
        }

        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return NextResponse.json({
                success: false,
                error: `Cannot start call for ${appointment.status} appointment`,
            }, { status: 409 });
        }

        if (appointment?.call_started_at) {
            return NextResponse.json({ success: true, message: 'Call already started', data: appointment });
        }

        const [data] = await sql`
            UPDATE appointments
            SET call_started_at = ${new Date().toISOString()},
                call_ended_at = NULL,
                status = 'in_progress'
            WHERE aid = ${aid} RETURNING *
        `;

        return NextResponse.json({ success: true, data, message: 'Call started successfully' });
    } catch (error: any) {
        console.error('[API] Start call error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
