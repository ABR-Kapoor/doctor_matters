import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnAppointment } from '@/lib/authz';

export async function GET(
    request: NextRequest,
    { params }: { params: { aid: string } }
) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { aid } = params;

        // Unauthenticated before: appointment call state was world-readable to
        // anyone who knew or guessed an `aid`.
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const [data] = await sql`
            SELECT status, call_started_at, call_ended_at
            FROM appointments
            WHERE aid = ${aid} AND did = ${auth.data.did}
        `;

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...data,
                callStartedAt: data.call_started_at,
                callEndedAt: data.call_ended_at,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
