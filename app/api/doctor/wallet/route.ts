import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor } from '@/lib/authz';
import {
    getDoctorWalletSummary,
    listPayoutRequests,
    listWalletTransactions,
    MIN_PAYOUT_AMOUNT,
    PAYOUT_FEE,
    WALLET_CATEGORIES,
    WALLET_DIRECTIONS,
    WALLET_STATUSES,
} from '@/lib/wallet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseDate(value: string | null, endOfDay = false): Date | null {
    if (!value) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
        : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const did = auth.data.did;
        const params = request.nextUrl.searchParams;

        const direction = params.get('direction')?.toLowerCase() || null;
        const category = params.get('category')?.toLowerCase() || null;
        const status = params.get('status')?.toLowerCase() || null;
        const search = params.get('q')?.trim().slice(0, 100) || null;
        const from = parseDate(params.get('from'));
        const to = parseDate(params.get('to'), true);

        if (direction && !WALLET_DIRECTIONS.has(direction)) {
            return NextResponse.json({ error: 'Invalid direction filter' }, { status: 400 });
        }
        if (category && !WALLET_CATEGORIES.has(category)) {
            return NextResponse.json({ error: 'Invalid category filter' }, { status: 400 });
        }
        if (status && !WALLET_STATUSES.has(status)) {
            return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
        }

        const page = Math.max(1, Number(params.get('page') || 1) || 1);
        const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25) || 25));
        const payoutPage = Math.max(1, Number(params.get('payoutPage') || 1) || 1);

        const [summary, ledger, payouts, doctorRows] = await Promise.all([
            getDoctorWalletSummary(did),
            listWalletTransactions(did, {
                direction,
                category,
                status,
                search,
                from,
                to,
                page,
                limit,
            }),
            listPayoutRequests(did, { page: payoutPage, limit: 10 }),
            sql`
                SELECT
                    payout_method,
                    bank_details_verified,
                    payout_upi_id,
                    bank_account_number,
                    bank_ifsc_code,
                    (
                        (payout_method = 'upi' AND payout_upi_id IS NOT NULL)
                        OR (payout_method = 'bank' AND bank_account_number IS NOT NULL AND bank_ifsc_code IS NOT NULL)
                    ) AS payout_ready
                FROM doctors
                WHERE did = ${did}
                LIMIT 1
            `,
        ]);

        const doctor = doctorRows[0];

        return NextResponse.json({
            success: true,
            wallet: summary,
            transactions: ledger.transactions,
            pagination: ledger.pagination,
            payouts: payouts.payouts,
            payoutPagination: payouts.pagination,
            config: {
                minPayoutAmount: MIN_PAYOUT_AMOUNT,
                payoutFee: PAYOUT_FEE,
            },
            payoutProfile: {
                method: doctor?.payout_method ?? null,
                verified: Boolean(doctor?.bank_details_verified),
                ready: Boolean(doctor?.payout_ready),
            },
        });
    } catch (error) {
        console.error('Doctor wallet API error:', error);
        return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
    }
}
