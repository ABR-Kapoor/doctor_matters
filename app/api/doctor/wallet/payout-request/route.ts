import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor } from '@/lib/authz';
import { sendEmail } from '@/lib/shared/notifications/email';
import { generatePayoutRequestAdminEmail } from '@/lib/shared/notifications/templates';
import {
    getDoctorWalletSummary,
    MIN_PAYOUT_AMOUNT,
    parseEmailList,
    PAYOUT_FEE,
} from '@/lib/wallet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json().catch(() => ({}));
        const requestedAmount = Number(body?.amount);

        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
            return NextResponse.json({ error: 'Enter a valid payout amount.' }, { status: 400 });
        }

        const amount = roundMoney(requestedAmount);

        if (amount < MIN_PAYOUT_AMOUNT) {
            return NextResponse.json(
                { error: `Minimum payout amount is INR ${MIN_PAYOUT_AMOUNT.toFixed(2)}.` },
                { status: 400 },
            );
        }

        if (amount <= PAYOUT_FEE) {
            return NextResponse.json(
                { error: 'Payout amount must be greater than the processing fee.' },
                { status: 400 },
            );
        }

        const [doctor] = await sql`
            SELECT
                d.did,
                d.uid,
                u.name AS doctor_name,
                u.email AS doctor_email,
                d.payout_method,
                d.payout_upi_id,
                d.bank_account_holder_name,
                d.bank_account_number,
                d.bank_ifsc_code,
                d.bank_name,
                d.bank_account_type,
                d.bank_branch_name,
                (
                    (d.payout_method = 'upi' AND d.payout_upi_id IS NOT NULL)
                    OR (d.payout_method = 'bank' AND d.bank_account_number IS NOT NULL AND d.bank_ifsc_code IS NOT NULL)
                ) AS payout_ready
            FROM doctors d
            JOIN users u ON u.uid = d.uid
            WHERE d.did = ${auth.data.did}
            LIMIT 1
        `;

        if (!doctor) {
            return NextResponse.json({ error: 'Doctor not found.' }, { status: 404 });
        }

        if (!doctor.payout_ready) {
            return NextResponse.json(
                { error: 'Add your bank or UPI payout details before requesting a payout.' },
                { status: 400 },
            );
        }

        const [openRequest] = await sql`
            SELECT payout_request_id
            FROM payout_requests
            WHERE did = ${doctor.did} AND status IN ('pending', 'processing')
            LIMIT 1
        `;

        if (openRequest) {
            return NextResponse.json(
                { error: 'You already have a payout request in progress.' },
                { status: 409 },
            );
        }

        const wallet = await getDoctorWalletSummary(doctor.did);
        if (amount > wallet.availableBalance) {
            return NextResponse.json(
                {
                    error: `Insufficient wallet balance. Available: INR ${wallet.availableBalance.toFixed(2)}.`,
                },
                { status: 400 },
            );
        }

        const payoutFee = roundMoney(PAYOUT_FEE);
        const netAmount = roundMoney(amount - payoutFee);

        const [payout] = await sql`
            INSERT INTO payout_requests (
                did, amount, payout_fee_amount, net_amount, currency, status,
                payout_method, bank_account_holder_name, bank_account_number,
                bank_ifsc_code, bank_name, bank_account_type, bank_branch_name,
                payout_upi_id, admin_notes
            )
            VALUES (
                ${doctor.did}, ${amount}, ${payoutFee}, ${netAmount}, 'INR', 'pending',
                ${doctor.payout_method},
                ${doctor.bank_account_holder_name},
                ${doctor.bank_account_number},
                ${doctor.bank_ifsc_code},
                ${doctor.bank_name},
                ${doctor.bank_account_type},
                ${doctor.bank_branch_name},
                ${doctor.payout_upi_id},
                ${typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null}
            )
            RETURNING *
        `;

        try {
            const adminRows = await sql`
                SELECT email FROM users
                WHERE role = 'project_admin' AND email IS NOT NULL
            `;
            const recipients = Array.from(
                new Set([
                    ...parseEmailList(process.env.ADMIN_EMAILS),
                    ...adminRows.map((row) => String((row as { email?: string | null }).email || '')).filter(Boolean),
                ]),
            );

            if (recipients.length > 0) {
                const adminUrl = `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/dashboard/wallet/payouts/${payout.payout_request_id}`;
                const html = generatePayoutRequestAdminEmail({
                    recipientName: 'Admin',
                    doctorName: doctor.doctor_name || 'Doctor',
                    doctorEmail: doctor.doctor_email,
                    amount,
                    payoutFee,
                    netAmount,
                    payoutRequestId: payout.payout_request_id,
                    payoutMethod: doctor.payout_method || 'bank',
                    accountHolderName: doctor.bank_account_holder_name,
                    accountNumber: doctor.bank_account_number,
                    ifscCode: doctor.bank_ifsc_code,
                    bankName: doctor.bank_name,
                    upiId: doctor.payout_upi_id,
                    requestedAt: new Date(payout.requested_at).toLocaleString('en-IN'),
                    adminUrl,
                });

                await sendEmail({
                    to: recipients,
                    subject: `Payout request: INR ${amount.toFixed(2)} from ${doctor.doctor_name || 'Doctor'}`,
                    html,
                });
            }
        } catch (emailError) {
            console.error('Payout request admin email failed:', emailError);
        }

        return NextResponse.json({
            success: true,
            message: 'Payout request submitted. Your wallet balance has been held until processing.',
            payout: {
                id: payout.payout_request_id,
                amount: Number(payout.amount),
                payoutFeeAmount: Number(payout.payout_fee_amount),
                netAmount: Number(payout.net_amount),
                status: payout.status,
                requestedAt: payout.requested_at,
            },
            wallet: await getDoctorWalletSummary(doctor.did),
        });
    } catch (error: any) {
        if (error?.code === '23505') {
            return NextResponse.json(
                { error: 'You already have a payout request in progress.' },
                { status: 409 },
            );
        }
        console.error('Payout request API error:', error);
        return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
    }
}
