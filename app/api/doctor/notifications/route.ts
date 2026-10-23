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
                SELECT DISTINCT u.name as patient_name, ma.medicine_name, ma.scheduled_time
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
                        INSERT INTO notifications (uid, title, body, type, is_read)
                        VALUES (${auth.data.uid}, ${notifTitle}, ${notifBody}, 'medication_reminder', false)
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
                    (${auth.data.uid}, 'Welcome to Doctor Portal', 'Your practice workspace is active. You can manage consultations, view patient history, and create digital prescriptions.', 'welcome', false),
                    (${auth.data.uid}, 'Appointments System Active', 'New patient appointment requests and queue notifications will appear here.', 'system', false)
            `;
            notifications = await sql`
                SELECT * FROM notifications
                WHERE uid = ${auth.data.uid}
                ORDER BY created_at DESC
                LIMIT 50
            `;
        }

        return NextResponse.json({
            success: true,
            notifications: notifications || [],
        });
    } catch (error) {
        console.error('Error fetching doctor notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
