import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/shared/notifications/email';
import { requireDoctor, maskAccountNumber } from '@/lib/authz';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export const dynamic = 'force-dynamic';

/**
 * Notifies administrators that a doctor profile is awaiting review.
 *
 * This route previously took a `uid` from the request body with no
 * authentication, and emailed a pair of approve/reject links containing the
 * admin secret. The review link is now a plain deep link; the approving
 * administrator must hold a Clerk session with `users.role = 'admin'`.
 */
export async function POST(request: NextRequest) {
    // A doctor may only submit their own profile for review. Previously the
    // target `uid` came straight from the body with no authentication at all,
    // so anyone could trigger a review email for any doctor.
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const uid = auth.data.uid;

        // Fetch user data
        const [user] = await sql`SELECT name, email, phone, profile_image_url FROM users WHERE uid = ${uid}`;
        
        // Fetch doctor data with clinic join
        const [doctor] = await sql`
            SELECT d.*, c.clinic_name as joined_clinic_name, c.address_line1 as c_address1, c.city as c_city, c.state as c_state 
            FROM doctors d 
            LEFT JOIN clinics c ON d.clinic_id = c.clinic_id 
            WHERE d.uid = ${uid}
        `;

        if (!user || !doctor) {
            return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
        }

        // Prepare email variables
        const appDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

        // No secret in the link. The admin signs in and the API checks
        // `users.role = 'admin'` server-side.
        const reviewLink = `${appDomain}/admin/verify/${uid}`;

        const isUpi = doctor.payout_method === 'upi';
        const payoutDetailsHtml = isUpi
            ? `
                <tr><td style="padding: 8px 0; color: #64748b;">Payout Method</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">UPI</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">UPI ID</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.payout_upi_id}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Account Holder</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.bank_account_holder_name}</td></tr>
              `
            : `
                <tr><td style="padding: 8px 0; color: #64748b;">Payout Method</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Bank Transfer</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Bank Name</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.bank_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Account Number</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${maskAccountNumber(doctor.bank_account_number)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">IFSC Code</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.bank_ifsc_code}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Account Type</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.bank_account_type}</td></tr>
              `;

        const location = doctor.clinic_id 
            ? `${doctor.joined_clinic_name} - ${doctor.c_city}, ${doctor.c_state}`
            : `${doctor.address_line1 || ''}, ${doctor.city}, ${doctor.state}`;

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Doctor Verification Request</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Action Required: Verify Doctor</h1>
                        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 15px;">A new doctor profile has been submitted and is awaiting your review.</p>
                    </div>

                    <!-- Profile Section -->
                    <div style="padding: 32px 24px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            ${user.profile_image_url ? `<img src="${user.profile_image_url}" alt="Profile" style="width: 96px; height: 96px; border-radius: 48px; object-fit: cover; border: 4px solid #f1f5f9;">` : `<div style="width: 96px; height: 96px; border-radius: 48px; background-color: #e2e8f0; margin: 0 auto; line-height: 96px; font-size: 32px; color: #64748b;">👨‍⚕️</div>`}
                            <h2 style="margin: 16px 0 4px 0; color: #0f172a; font-size: 22px;">${user.name}</h2>
                            <p style="margin: 0; color: #64748b; font-size: 15px;">${doctor.qualification} • ${doctor.years_of_experience} yrs experience</p>
                        </div>

                        <!-- Data Tables -->
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                            <tr><th colspan="2" style="text-align: left; padding: 12px 0 8px 0; border-bottom: 2px solid #e2e8f0; color: #334155; font-size: 16px;">Professional Details</th></tr>
                            <tr><td style="padding: 8px 0; color: #64748b; width: 40%;">Registration No.</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.registration_number}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Specializations</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${(doctor.specialization || []).join(', ')}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Consultation Fee</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">₹${doctor.consultation_fee}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Location</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${location}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${user.phone}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${user.email}</td></tr>
                        </table>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                            <tr><th colspan="2" style="text-align: left; padding: 12px 0 8px 0; border-bottom: 2px solid #e2e8f0; color: #334155; font-size: 16px;">Payout Information</th></tr>
                            ${payoutDetailsHtml}
                        </table>

                        <!-- Action -->
                        <div style="text-align: center; display: flex; flex-direction: column; gap: 16px;">
                            <a href="${reviewLink}" style="display: block; width: 100%; padding: 16px 0; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 16px;">Review Profile</a>
                            <p style="margin: 0; color: #64748b; font-size: 13px;">You will be asked to sign in before you can approve or reject.</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 13px;">
                        <p style="margin: 0;">This email was sent securely from the AuraSutra internal system.</p>
                        <p style="margin: 4px 0 0 0; color: #94a3b8;">Bank account numbers are partially masked. Do not forward this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const adminEmailsStr = process.env.ADMIN_EMAILS || '';
        let adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(Boolean);

        // Fallback: If no ADMIN_EMAILS set in env, find admins or project_admins from users table
        if (adminEmails.length === 0) {
            const dbAdmins = await sql`SELECT email FROM users WHERE role IN ('admin', 'project_admin') AND email IS NOT NULL AND email != ''`;
            adminEmails = dbAdmins.map(a => a.email.trim()).filter(Boolean);
        }

        // If still no admin email, fallback to contact/support email or doctor's own email so verification flow never halts
        if (adminEmails.length === 0) {
            adminEmails = ['admin@aurasutra.org'];
        }

        // Attempt sending email, but do NOT abort verification state if email fails (e.g. invalid test key or sandbox)
        let emailSent = false;
        try {
            const emailResult = await sendEmail({
                to: adminEmails,
                subject: `[Verification Request] ${user.name} submitted their profile`,
                html: emailHtml
            });
            emailSent = !!emailResult?.success;
            if (!emailSent) {
                console.warn('[verification/request] Email to admin did not deliver, but verification request is recorded in DB:', emailResult?.error);
            }
        } catch (emailErr) {
            console.warn('[verification/request] sendEmail failed, proceeding with DB request update:', emailErr);
        }

        // Update verification request state in doctors table
        await sql`
            UPDATE doctors 
            SET verification_requested = true, 
                verification_requested_at = NOW(),
                verification_rejected = false, 
                verification_notes = null 
            WHERE uid = ${uid}
        `;
        
        if (redis) {
            await redis.del(`completion:${uid}`);
            await redis.del(`profile:${uid}`);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Verification request submitted successfully',
            emailSent,
            reviewLink 
        });

    } catch (error) {
        console.error('Verification Request API error:', error);
        return NextResponse.json({ error: 'Failed to send verification request' }, { status: 500 });
    }
}
