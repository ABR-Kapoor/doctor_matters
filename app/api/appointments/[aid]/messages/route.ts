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

        // Fetch messages for this appointment with sender user info (name, image)
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
                u.name as sender_name,
                u.profile_image_url as sender_image
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

        // Mark any message notifications for this appointment as read for this doctor
        try {
            await sql`
                UPDATE notifications
                SET is_read = true, read_at = NOW()
                WHERE uid = ${auth.data.uid}
                  AND is_read = false
                  AND (
                    (metadata->>'aid') = ${aid}
                    OR title ILIKE '%New Message%'
                  )
            `;
        } catch (notifErr) {
            console.warn('[Messages GET] Failed to clear doctor notification:', notifErr);
        }

        // Can chat if appointment is confirmed, in_progress, completed, or scheduled
        const statusNorm = String(appointment.status || '').trim().toLowerCase();
        const canChat = ['confirmed', 'in_progress', 'completed', 'scheduled', 'booked', 'requested'].includes(statusNorm) && statusNorm !== 'cancelled';

        // Load patient details including profile image
        let patientName = 'Patient';
        let patientAvatar = '';
        try {
            const [pt] = await sql`
                SELECT u.name, u.profile_image_url
                FROM patients p
                JOIN users u ON p.uid = u.uid
                WHERE p.pid = ${appointment.pid}
                LIMIT 1
            `;
            if (pt?.name) patientName = pt.name;
            if (pt?.profile_image_url) patientAvatar = pt.profile_image_url;
        } catch {}

        // Load doctor profile image
        let doctorAvatar = '';
        try {
            const [docUser] = await sql`
                SELECT u.profile_image_url
                FROM users u
                WHERE u.uid = ${auth.data.uid}
                LIMIT 1
            `;
            if (docUser?.profile_image_url) doctorAvatar = docUser.profile_image_url;
        } catch {}

        return NextResponse.json({
            success: true,
            messages: rawMessages || [],
            appointment: {
                aid: appointment.aid,
                pid: appointment.pid,
                status: appointment.status,
                mode: appointment.mode,
                patient_name: patientName,
                patient_avatar: patientAvatar,
                doctor_avatar: doctorAvatar,
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

        // Fetch sender's profile image to attach directly
        let doctorAvatar = '';
        try {
            const [docUser] = await sql`SELECT profile_image_url FROM users WHERE uid = ${auth.data.uid} LIMIT 1`;
            doctorAvatar = docUser?.profile_image_url || '';
        } catch {}

        const messageWithSender = {
            ...newMessage,
            sender_name: auth.data.name || 'Doctor',
            sender_image: doctorAvatar,
        };

        // Notify the recipient (patient) with batch notification
        try {
            const [pt] = await sql`
                SELECT p.uid as patient_uid, u.name as patient_name
                FROM patients p
                JOIN users u ON p.uid = u.uid
                WHERE p.pid = ${appointment.pid}
                LIMIT 1
            `;

            if (pt?.patient_uid) {
                // Count all unread messages from doctor for this patient on this appointment
                const [unreadDoc] = await sql`
                    SELECT count(*)::int as count
                    FROM appointment_messages
                    WHERE aid = ${aid}
                      AND sender_role = 'doctor'
                      AND read_at IS NULL
                `;
                const unreadCount = unreadDoc?.count || 1;
                const docDisplayName = auth.data.name ? `Dr. ${auth.data.name}` : 'Your doctor';
                const notifTitle = unreadCount > 1 
                    ? `New Messages from ${docDisplayName} (${unreadCount})` 
                    : `New Message from ${docDisplayName}`;
                const notifBody = unreadCount > 1
                    ? `You have ${unreadCount} new messages: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`
                    : content.slice(0, 120);

                // Check for existing unread chat notification for this appointment to batch update
                const [existingNotif] = await sql`
                    SELECT notification_id FROM notifications
                    WHERE uid = ${pt.patient_uid}
                      AND is_read = false
                      AND type = 'chat_message'
                      AND (metadata->>'aid') = ${aid}
                    ORDER BY created_at DESC
                    LIMIT 1
                `;

                if (existingNotif) {
                    await sql`
                        UPDATE notifications
                        SET title = ${notifTitle},
                            body = ${notifBody},
                            created_at = NOW(),
                            metadata = ${JSON.stringify({ aid, count: unreadCount, sender_role: 'doctor' })}
                        WHERE notification_id = ${existingNotif.notification_id}
                    `;
                } else {
                    await sql`
                        INSERT INTO notifications (
                            uid,
                            title,
                            body,
                            type,
                            is_read,
                            action_url,
                            metadata,
                            created_at
                        ) VALUES (
                            ${pt.patient_uid},
                            ${notifTitle},
                            ${notifBody},
                            'chat_message',
                            false,
                            ${`/chat/${aid}`},
                            ${JSON.stringify({ aid, count: unreadCount, sender_role: 'doctor' })},
                            NOW()
                        )
                    `;
                }
            }
        } catch (notifErr) {
            console.error('[API Messages POST] Failed to trigger patient notification:', notifErr);
        }

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
