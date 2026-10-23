import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnAppointment } from '@/lib/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
    request: NextRequest,
    { params }: { params: { aid: string } }
) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { aid } = params;
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const appointment = owned.data;

        // Fetch messages for this appointment
        const rawMessages = await sql`
            SELECT 
                m.message_id,
                m.aid,
                m.sender_uid,
                m.sender_role,
                m.content,
                m.media_url,
                m.created_at,
                m.read_at,
                u.name as sender_name
            FROM appointment_messages m
            LEFT JOIN users u ON m.sender_uid = u.uid
            WHERE m.aid = ${aid}
            ORDER BY m.created_at ASC
        `;

        // Mark unread messages from patient as read by doctor
        await sql`
            UPDATE appointment_messages
            SET read_at = NOW()
            WHERE aid = ${aid}
              AND sender_role = 'patient'
              AND read_at IS NULL
        `;

        // Can chat if appointment is confirmed or in_progress (and not cancelled)
        const canChat = appointment.status === 'confirmed' || appointment.status === 'in_progress' || appointment.status === 'completed';

        return NextResponse.json({
            success: true,
            messages: rawMessages || [],
            appointment: {
                aid: appointment.aid,
                pid: appointment.pid,
                status: appointment.status,
                mode: appointment.mode,
            },
            appointmentStatus: appointment.status,
            canChat,
        });
    } catch (error: any) {
        console.error('[API] Fetch messages error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { aid: string } }
) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { aid } = params;
        const owned = await requireOwnAppointment(auth.data, aid);
        if (!owned.ok) return owned.response;

        const appointment = owned.data;

        if (appointment.status === 'cancelled') {
            return NextResponse.json(
                { success: false, error: 'Cannot send messages on a cancelled appointment' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const content = (body.content || '').trim();
        const mediaUrl = body.media_url || null;

        if (!content && !mediaUrl) {
            return NextResponse.json(
                { success: false, error: 'Message content or media is required' },
                { status: 400 }
            );
        }

        const [newMessage] = await sql`
            INSERT INTO appointment_messages (
                aid,
                sender_uid,
                sender_role,
                content,
                media_url,
                created_at
            ) VALUES (
                ${aid},
                ${auth.data.uid},
                'doctor',
                ${content},
                ${mediaUrl},
                NOW()
            )
            RETURNING *
        `;

        const messageWithSender = {
            ...newMessage,
            sender_name: auth.data.name || 'Doctor',
        };

        return NextResponse.json({
            success: true,
            message: messageWithSender,
        });
    } catch (error: any) {
        console.error('[API] Send message error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
