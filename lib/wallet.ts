import sql from '@/lib/db';

export const PAYOUT_FEE = Number(process.env.PAYOUT_FEE_AMOUNT || 9);
export const MIN_PAYOUT_AMOUNT = Number(process.env.MIN_PAYOUT_AMOUNT || 100);

export interface DoctorWalletSummary {
    availableBalance: number;
    heldAmount: number;
    lifetimeCredited: number;
    lifetimeDebited: number;
    lifetimeWithdrawn: number;
    lifetimePayoutFees: number;
    lastTransactionAt: string | null;
}

export interface WalletTransactionRecord {
    id: string;
    direction: 'credit' | 'debit';
    category: string;
    status: string;
    amount: number;
    currency: string;
    description: string | null;
    appointmentId: string | null;
    patientName: string | null;
    referenceType: string | null;
    referenceId: string | null;
    createdAt: string;
}

export interface PayoutRequestRecord {
    id: string;
    amount: number;
    payoutFeeAmount: number;
    netAmount: number;
    currency: string;
    status: string;
    payoutMethod: string | null;
    accountHolderName: string | null;
    accountNumberLast4: string | null;
    upiId: string | null;
    requestedAt: string;
    processedAt: string | null;
    processedBy: string | null;
    failureReason: string | null;
    adminNotes: string | null;
}

export interface WalletFilters {
    direction?: string | null;
    category?: string | null;
    status?: string | null;
    search?: string | null;
    from?: Date | null;
    to?: Date | null;
    page: number;
    limit: number;
}

export const WALLET_DIRECTIONS = new Set(['credit', 'debit']);
export const WALLET_CATEGORIES = new Set([
    'consultation',
    'refund',
    'payout',
    'payout_fee',
    'adjustment',
]);
export const WALLET_STATUSES = new Set(['pending', 'completed', 'failed', 'reversed']);

export function parseEmailList(value: string | null | undefined): string[] {
    return (value || '')
        .split(/[,;\s]+/)
        .map((email) => email.trim())
        .filter((email) => email.includes('@'));
}

export async function getDoctorWalletSummary(did: string): Promise<DoctorWalletSummary> {
    const [row] = await sql`
        SELECT
            available_balance,
            held_amount,
            lifetime_credited,
            lifetime_debited,
            lifetime_withdrawn,
            lifetime_payout_fees,
            last_transaction_at
        FROM v_doctor_wallet_balances
        WHERE did = ${did}
        LIMIT 1
    `;

    return {
        availableBalance: Number(row?.available_balance ?? 0),
        heldAmount: Number(row?.held_amount ?? 0),
        lifetimeCredited: Number(row?.lifetime_credited ?? 0),
        lifetimeDebited: Number(row?.lifetime_debited ?? 0),
        lifetimeWithdrawn: Number(row?.lifetime_withdrawn ?? 0),
        lifetimePayoutFees: Number(row?.lifetime_payout_fees ?? 0),
        lastTransactionAt: row?.last_transaction_at ?? null,
    };
}

export async function listWalletTransactions(did: string, filters: WalletFilters) {
    let where = sql`wt.did = ${did} AND wallet_owner_role(wt.category, wt.direction) = 'doctor'`;
    if (filters.direction) where = sql`${where} AND wt.direction = ${filters.direction}`;
    if (filters.category) where = sql`${where} AND wt.category = ${filters.category}`;
    if (filters.status) where = sql`${where} AND wt.status = ${filters.status}`;
    if (filters.search) {
        const escaped = filters.search.replace(/[\\%_]/g, '\\$&');
        const pattern = `%${escaped}%`;
        where = sql`${where} AND (
            wt.description ILIKE ${pattern}
            OR wt.reference_id ILIKE ${pattern}
            OR EXISTS (
                SELECT 1
                FROM patients p2
                JOIN users u2 ON u2.uid = p2.uid
                WHERE p2.pid = wt.pid
                  AND u2.name ILIKE ${pattern}
            )
        )`;
    }
    if (filters.from) where = sql`${where} AND wt.created_at >= ${filters.from.toISOString()}`;
    if (filters.to) where = sql`${where} AND wt.created_at <= ${filters.to.toISOString()}`;

    const offset = (filters.page - 1) * filters.limit;

    const [rows, countRows] = await Promise.all([
        sql`
            SELECT
                wt.wallet_transaction_id,
                wt.direction,
                wt.category,
                wt.status,
                wt.amount,
                wt.currency,
                wt.description,
                wt.aid,
                wt.reference_type,
                wt.reference_id,
                wt.created_at,
                u.name AS patient_name
            FROM wallet_transactions wt
            LEFT JOIN patients p ON p.pid = wt.pid
            LEFT JOIN users u ON u.uid = p.uid
            WHERE ${where}
            ORDER BY wt.created_at DESC, wt.wallet_transaction_id DESC
            LIMIT ${filters.limit} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM wallet_transactions wt WHERE ${where}`,
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    const transactions: WalletTransactionRecord[] = rows.map((row) => ({
        id: row.wallet_transaction_id,
        direction: row.direction,
        category: row.category,
        status: row.status,
        amount: Number(row.amount),
        currency: row.currency,
        description: row.description,
        appointmentId: row.aid,
        patientName: row.patient_name ?? null,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        createdAt: row.created_at,
    }));

    return {
        transactions,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / filters.limit)),
            hasMore: offset + transactions.length < total,
        },
    };
}

export async function listPayoutRequests(
    did: string,
    { page = 1, limit = 10 }: { page?: number; limit?: number } = {},
) {
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
        sql`
            SELECT
                payout_request_id,
                amount,
                payout_fee_amount,
                net_amount,
                currency,
                status,
                payout_method,
                bank_account_holder_name,
                bank_account_number,
                payout_upi_id,
                requested_at,
                processed_at,
                processed_by,
                failure_reason,
                admin_notes
            FROM payout_requests
            WHERE did = ${did}
            ORDER BY requested_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM payout_requests WHERE did = ${did}`,
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    const payouts: PayoutRequestRecord[] = rows.map((row) => ({
        id: row.payout_request_id,
        amount: Number(row.amount),
        payoutFeeAmount: Number(row.payout_fee_amount),
        netAmount: Number(row.net_amount),
        currency: row.currency,
        status: row.status,
        payoutMethod: row.payout_method,
        accountHolderName: row.bank_account_holder_name,
        accountNumberLast4: row.bank_account_number
            ? String(row.bank_account_number).slice(-4)
            : null,
        upiId: row.payout_upi_id,
        requestedAt: row.requested_at,
        processedAt: row.processed_at,
        processedBy: row.processed_by,
        failureReason: row.failure_reason,
        adminNotes: row.admin_notes,
    }));

    return {
        payouts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            hasMore: offset + payouts.length < total,
        },
    };
}
