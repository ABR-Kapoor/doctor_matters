import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/shared/notifications/email';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? Redis.fromEnv() 
    : null;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BankDetails {
  bank_account_holder_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_name: string;
  bank_account_type: 'savings' | 'current' | 'other';
  bank_branch_name: string;
  payout_upi_id?: string;
  payout_method?: 'bank' | 'upi';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'User ID (uid) required' }, { status: 400 });
    }

    if (uid.startsWith('user_')) {
      const [dbUser] = await sql`SELECT uid FROM users WHERE auth_id = ${uid}`;
      if (dbUser) {
        uid = dbUser.uid;
      } else {
        return NextResponse.json({
          success: true,
          bankDetails: null,
          message: 'User not found',
        });
      }
    }

    let doctor: any;
    try {
      [doctor] = await sql`
        SELECT 
          did,
          bank_account_holder_name,
          bank_account_number,
          bank_ifsc_code,
          bank_name,
          bank_account_type,
          bank_branch_name,
          payout_upi_id,
          payout_method,
          bank_details_verified,
          bank_details_added_at
        FROM doctors 
        WHERE uid = ${uid}
      `;
    } catch (error: any) {
      if (error?.code === '42703') {
        throw error;
      }
    }

    if (!doctor) {
      return NextResponse.json({
        success: true,
        bankDetails: null,
        message: 'Doctor not found',
      });
    }

    return NextResponse.json({
      success: true,
      bankDetails: {
        accountHolderName: doctor.bank_account_holder_name,
        accountNumber: doctor.bank_account_number,
        ifscCode: doctor.bank_ifsc_code,
        bankName: doctor.bank_name,
        accountType: doctor.bank_account_type,
        branchName: doctor.bank_branch_name,
        payoutUpiId: doctor.payout_upi_id,
        payoutMethod: doctor.payout_method || 'bank',
        verified: doctor.bank_details_verified,
        addedAt: doctor.bank_details_added_at,
      },
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank details', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let { uid, bankDetails } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID (uid) required' }, { status: 400 });
    }

    if (uid.startsWith('user_')) {
      const [dbUser] = await sql`SELECT uid FROM users WHERE auth_id = ${uid}`;
      if (dbUser) {
        uid = dbUser.uid;
      } else {
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }
    }

    if (!bankDetails) {
      return NextResponse.json({ error: 'Bank details required' }, { status: 400 });
    }

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      accountType,
      branchName,
      payoutUpiId,
      payoutMethod,
    }: BankDetails & { [key: string]: any } = bankDetails;

    const normalizedPayoutMethod = payoutMethod === 'upi' ? 'upi' : 'bank';
    const trimmedAccountHolderName = accountHolderName?.trim();
    const trimmedAccountNumber = accountNumber?.trim();
    const trimmedIfscCode = ifscCode?.trim()?.toUpperCase();
    const trimmedBankName = bankName?.trim();
    const trimmedBranchName = branchName?.trim();
    const trimmedPayoutUpiId = payoutUpiId?.trim()?.toLowerCase();

    if (normalizedPayoutMethod === 'upi') {
      if (!trimmedAccountHolderName || !trimmedPayoutUpiId) {
        return NextResponse.json(
          { error: 'Account holder name and UPI ID are required for UPI payouts' },
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(trimmedPayoutUpiId)) {
        return NextResponse.json(
          { error: 'Invalid UPI ID format (e.g., doctor@upi)' },
          { status: 400 }
        );
      }
    } else {
      if (!trimmedAccountHolderName || !trimmedAccountNumber || !trimmedIfscCode || !trimmedBankName || !accountType) {
        return NextResponse.json(
          { error: 'Missing required bank details fields' },
          { status: 400 }
        );
      }

      if (!['savings', 'current', 'other'].includes(accountType)) {
        return NextResponse.json(
          { error: 'Invalid account type. Must be savings, current, or other' },
          { status: 400 }
        );
      }

      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmedIfscCode)) {
        return NextResponse.json(
          { error: 'Invalid IFSC code format (e.g., SBIN0001234)' },
          { status: 400 }
        );
      }
    }

    // Get doctor
    const [doctor] = await sql`
      SELECT d.did, u.name as doctor_name 
      FROM doctors d
      JOIN users u ON u.uid = d.uid
      WHERE d.uid = ${uid}
    `;

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Update bank details in DB
    await sql`
      UPDATE doctors
      SET
        bank_account_holder_name = ${trimmedAccountHolderName},
        bank_account_number = ${normalizedPayoutMethod === 'bank' ? trimmedAccountNumber : null},
        bank_ifsc_code = ${normalizedPayoutMethod === 'bank' ? trimmedIfscCode : null},
        bank_name = ${normalizedPayoutMethod === 'bank' ? trimmedBankName : null},
        bank_account_type = ${accountType},
        bank_branch_name = ${normalizedPayoutMethod === 'bank' ? (trimmedBranchName || null) : null},
        payout_upi_id = ${normalizedPayoutMethod === 'upi' ? trimmedPayoutUpiId : null},
        payout_method = ${normalizedPayoutMethod},
        bank_details_verified = FALSE,
        bank_details_added_at = NOW(),
        updated_at = NOW()
      WHERE uid = ${uid}
    `;

    // Fetch project admins to notify
    try {
      const admins = await sql`SELECT email FROM users WHERE role = 'project_admin'`;
      const adminEmails = admins.map(a => a.email).filter(Boolean);

      if (adminEmails.length > 0) {
        const detailsHtml = normalizedPayoutMethod === 'upi' 
          ? `<li><strong>UPI ID:</strong> ${trimmedPayoutUpiId}</li>`
          : `
            <li><strong>Bank Name:</strong> ${trimmedBankName}</li>
            <li><strong>Account Number:</strong> ${trimmedAccountNumber}</li>
            <li><strong>IFSC Code:</strong> ${trimmedIfscCode}</li>
            <li><strong>Account Type:</strong> ${accountType}</li>
          `;

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #10b981; padding: 24px; color: white;">
              <h2 style="margin: 0;">New Doctor Bank Details</h2>
              <p style="margin: 8px 0 0; opacity: 0.9;">A doctor has submitted payout details for verification.</p>
            </div>
            <div style="padding: 24px; background-color: #ffffff;">
              <h3 style="margin-top: 0;">${doctor.doctor_name || 'Unknown'}</h3>
              <p>The following banking details have been submitted:</p>
              <ul style="background-color: #f3f4f6; padding: 16px 16px 16px 32px; border-radius: 8px; line-height: 1.6;">
                <li><strong>Method:</strong> ${normalizedPayoutMethod.toUpperCase()}</li>
                <li><strong>Account Holder:</strong> ${trimmedAccountHolderName}</li>
                ${detailsHtml}
              </ul>
              <p style="margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/dashboard/doctors/${doctor.did}/edit" style="background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review & Verify in Admin Panel
                </a>
              </p>
            </div>
          </div>
        `;

        await sendEmail({
          to: adminEmails,
          subject: `Action Required: New Bank Details submitted by ${doctor.doctor_name || 'Unknown'}`,
          html,
        });
      }
    } catch (emailErr) {
      console.error('Failed to send admin email notification:', emailErr);
    }

    if (redis) {
      try {
        await redis.del(`completion:${uid}`);
      } catch (err) {
        console.error('Redis cache invalidation error:', err);
      }
    }

    const maskedAccountNumber = trimmedAccountNumber
      ? trimmedAccountNumber.slice(-4).padStart(trimmedAccountNumber.length, '*')
      : null;

    return NextResponse.json({
      success: true,
      message: 'Bank details saved successfully',
      bankDetails: {
        accountHolderName: trimmedAccountHolderName,
        accountNumber: maskedAccountNumber,
        ifscCode: trimmedIfscCode,
        bankName: trimmedBankName,
        accountType,
        branchName: trimmedBranchName || null,
        payoutUpiId: normalizedPayoutMethod === 'upi' ? trimmedPayoutUpiId : null,
        payoutMethod: normalizedPayoutMethod,
        verified: false,
        addedAt: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error('Save bank details error:', error);
    return NextResponse.json(
      { error: 'Failed to save bank details', details: String(error) },
      { status: 500 }
    );
  }
}

