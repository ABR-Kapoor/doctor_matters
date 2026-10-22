import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/shared/notifications/email';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? Redis.fromEnv() 
    : null;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid } = body;

        if (!uid) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

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
        const adminSecret = process.env.ADMIN_VERIFICATION_SECRET || 'secret123';
        const appDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        
        const approveLink = `${appDomain}/admin/verify/${uid}?action=approve&token=${adminSecret}`;
        const rejectLink = `${appDomain}/admin/verify/${uid}?action=reject&token=${adminSecret}`;

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
                <tr><td style="padding: 8px 0; color: #64748b;">Account Number</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${doctor.bank_account_number}</td></tr>
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

                        <!-- Action Buttons -->
                        <div style="text-align: center; display: flex; flex-direction: column; gap: 16px;">
                            <a href="${approveLink}" style="display: block; width: 100%; padding: 16px 0; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 16px; margin-bottom: 12px;">✅ Approve Profile</a>
                            <a href="${rejectLink}" style="display: block; width: 100%; padding: 16px 0; background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 16px;">❌ Reject / Request Changes</a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 13px;">
                        <p style="margin: 0;">This email was sent securely from the AuraSutra internal system.</p>
                        <p style="margin: 4px 0 0 0;">Do not forward this email as it contains sensitive banking information and secure access tokens.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const adminEmailsStr = process.env.ADMIN_EMAILS || 'admin@aurasutra.in';
        const adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(Boolean);

        const emailResult = await sendEmail({
            to: adminEmails,
            subject: `[Verification Request] ${user.name} submitted their profile`,
            html: emailHtml
        });

        if (!emailResult.success) {
            console.error('Failed to send verification email to admins:', emailResult.error);
            return NextResponse.json({ success: false, error: 'Profile saved but failed to notify admin. Please try again.' }, { status: 500 });
        }

        // Set rejected to false to clear any previous rejection state if they resubmitted
        await sql`UPDATE doctors SET verification_rejected = false, verification_notes = null WHERE uid = ${uid}`;
        
        if (redis) {
            await redis.del(`completion:${uid}`);
            await redis.del(`profile:${uid}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Verification Request API error:', error);
        return NextResponse.json({ error: 'Failed to send verification request' }, { status: 500 });
    }
}
