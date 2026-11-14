import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isServiceAuthorized } from '@/lib/serviceAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUSES = new Set([
    'pending',
    'processing',
    'processed',
    'rejected',
    'failed',
    'cancelled',
]);

export async function GET(request: NextRequest) {
    if (!isServiceAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const params = request.nextUrl.searchParams;
        const status = params.get('status')?.toLowerCase() || null;

        if (status && !STATUSES.has(status)) {
            return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
        }

        const page = Math.max(1, Number(params.get('page') || 1) || 1);
        const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
        const offset = (page - 1) * limit;

        let where = sql`TRUE`;
        if (status) where = sql`${where} AND pr.status = ${status}`;

        const [rows, countRows] = await Promise.all([
            sql`
                SELECT
                    pr.*,
                    d.uid AS doctor_uid,
                    u.name AS doctor_name,
                    u.email AS doctor_email,
                    u.phone AS doctor_phone,
                    wb.available_balance
                FROM payout_requests pr
                JOIN doctors d ON d.did = pr.did
                LEFT JOIN users u ON u.uid = d.uid
                LEFT JOIN v_doctor_wallet_balances wb ON wb.did = pr.did
                WHERE ${where}
                ORDER BY
                    CASE WHEN pr.status = 'pending' THEN 0 WHEN pr.status = 'processing' THEN 1 ELSE 2 END,
                    pr.requested_at ASC
                LIMIT ${limit} OFFSET ${offset}
            `,
            sql`SELECT COUNT(*)::int AS count FROM payout_requests pr WHERE ${where}`,
        ]);

        const total = Number(countRows[0]?.count ?? 0);

        return NextResponse.json({
            success: true,
            payouts: rows.map((row) => ({
                id: row.payout_request_id,
                doctorId: row.did,
                doctorUid: row.doctor_uid,
                doctorName: row.doctor_name,
                doctorEmail: row.doctor_email,
                doctorPhone: row.doctor_phone,
                amount: Number(row.amount),
                payoutFeeAmount: Number(row.payout_fee_amount),
                netAmount: Number(row.net_amount),
                currency: row.currency,
                status: row.status,
                payoutMethod: row.payout_method,
                bankDetails: {
                    accountHolderName: row.bank_account_holder_name,
                    accountNumber: row.bank_account_number,
                    ifscCode: row.bank_ifsc_code,
                    bankName: row.bank_name,
                    accountType: row.bank_account_type,
                    branchName: row.bank_branch_name,
                    upiId: row.payout_upi_id,
                },
                availableBalance: Number(row.available_balance ?? 0),
                requestedAt: row.requested_at,
                processedAt: row.processed_at,
                processedBy: row.processed_by,
                failureReason: row.failure_reason,
                adminNotes: row.admin_notes,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                hasMore: offset + rows.length < total,
            },
        });
    } catch (error) {
        console.error('Admin payout list API error:', error);
        return NextResponse.json({ error: 'Failed to fetch payout requests' }, { status: 500 });
    }
}
