import { NextResponse } from 'next/server';
import { verifyClerkUser } from '@/lib/clerk-verify';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/shared/notifications/email';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const clerkUser = await verifyClerkUser();

        if (!clerkUser || !clerkUser.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const [authUser] = await sql`
            SELECT * FROM users WHERE auth_id = ${clerkUser.id} LIMIT 1
        `;

        if (authUser) {
            if (authUser.role === 'patient') {
                return NextResponse.json(
                    { error: 'Patient accounts cannot access the doctor portal', code: 'ROLE_MISMATCH' },
                    { status: 403 }
                );
            }

            const [updatedUser] = await sql`
                UPDATE users
                SET last_login = ${new Date().toISOString()},
                    email = ${clerkUser.email || authUser.email},
                    name = ${authUser.name || `${clerkUser.given_name || ''} ${clerkUser.family_name || ''}`.trim() || 'Doctor'}
                WHERE uid = ${authUser.uid}
                RETURNING *
            `;

            return NextResponse.json({ user: updatedUser || authUser });
        }

        if (clerkUser.email) {
            const [emailUser] = await sql`
                SELECT * FROM users WHERE email = ${clerkUser.email} LIMIT 1
            `;

            if (emailUser) {
                if (emailUser.role === 'patient') {
                    return NextResponse.json(
                        { error: 'Patient accounts cannot access the doctor portal', code: 'ROLE_MISMATCH' },
                        { status: 403 }
                    );
                }

                const [updatedUser] = await sql`
                    UPDATE users
                    SET last_login = ${new Date().toISOString()},
                        auth_id = ${clerkUser.id},
                        name = ${emailUser.name || `${clerkUser.given_name || ''} ${clerkUser.family_name || ''}`.trim() || 'Doctor'}
                    WHERE uid = ${emailUser.uid}
                    RETURNING *
                `;

                return NextResponse.json({ user: updatedUser || emailUser });
            }
        }

        const [newUser] = await sql`
            INSERT INTO users (auth_id, email, name, role, is_verified, last_login)
            VALUES (${clerkUser.id}, ${clerkUser.email || ''}, ${`${clerkUser.given_name || ''} ${clerkUser.family_name || ''}`.trim() || 'Doctor'}, 'doctor', false, ${new Date().toISOString()})
            RETURNING *
        `;

        // Notify admin of new doctor registration
        try {
            const adminEmailsStr = process.env.ADMIN_EMAILS || 'admin@aurasutra.in';
            const adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(Boolean);
            const regTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const doctorName = newUser.name || 'Unknown';
            const doctorEmail = newUser.email || clerkUser.email || 'N/A';
            const doctorPhone = newUser.phone || 'N/A';

            await sendEmail({
                to: adminEmails,
                subject: `New Doctor Registration: ${doctorName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 24px; text-align: center;">
                            <h1 style="color: #fff; margin: 0; font-size: 22px;">New Doctor Registration</h1>
                            <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">A new doctor has joined the platform</p>
                        </div>
                        <div style="padding: 24px; background: #fff;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 10px 0; color: #64748b; width: 35%;">Name</td><td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${doctorName}</td></tr>
                                <tr><td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Email</td><td style="padding: 10px 0; font-weight: 600; color: #0f172a; border-top: 1px solid #f1f5f9;">${doctorEmail}</td></tr>
                                <tr><td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Phone</td><td style="padding: 10px 0; font-weight: 600; color: #0f172a; border-top: 1px solid #f1f5f9;">${doctorPhone}</td></tr>
                                <tr><td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Registered At</td><td style="padding: 10px 0; font-weight: 600; color: #0f172a; border-top: 1px solid #f1f5f9;">${regTime}</td></tr>
                            </table>
                            <p style="margin: 24px 0 0; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/dashboard/doctors" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">View in Admin Panel</a>
                            </p>
                        </div>
                        <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
                            - by Team AuraSutra
                        </div>
                    </div>
                `.trim(),
            });
        } catch (emailErr) {
            console.error('Failed to send new doctor registration alert:', emailErr);
        }

        return NextResponse.json({ user: newUser, isNew: true });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
