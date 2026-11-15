import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isServiceAuthorized } from '@/lib/serviceAuth';
import { getDoctorWalletSummary } from '@/lib/wallet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ['processing', 'processed', 'rejected', 'failed', 'cancelled'],
    processing: ['processed', 'rejected', 'failed'],
};

const TERMINAL_STATUSES = new Set(['processed', 'rejected', 'failed', 'cancelled']);

export async function GET(
    request: NextRequest,
    { params }: { params: { payout_request_id: string } },
) {
    if (!isServiceAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [payout] = await sql`SELECT * FROM payout_requests WHERE payout_request_id = ${params.payout_request_id}`;
    if (!payout) {
        return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, payout });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { payout_request_id: string } },
) {
    if (!isServiceAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const nextStatus = typeof body?.status === 'string' ? body.status.toLowerCase() : '';
        const processedBy = typeof body?.processed_by === 'string' ? body.processed_by.slice(0, 255) : null;
        const failureReason = typeof body?.failure_reason === 'string' ? body.failure_reason.slice(0, 1000) : null;
        const adminNotes = typeof body?.admin_notes === 'string' ? body.admin_notes.slice(0, 2000) : null;

        const [existing] = await sql`
            SELECT payout_request_id, did, status
            FROM payout_requests
            WHERE payout_request_id = ${params.payout_request_id}
            LIMIT 1
        `;

        if (!existing) {
            return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
        }

        const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
        if (!allowed.includes(nextStatus)) {
            return NextResponse.json(
                {
                    error: `Cannot change payout status from ${existing.status} to ${nextStatus || '(empty)'}.`,
                },
                { status: 409 },
            );
        }

        const isTerminal = TERMINAL_STATUSES.has(nextStatus);

        const [updated] = await sql`
            UPDATE payout_requests
            SET
                status = ${nextStatus},
                processed_at = ${isTerminal ? new Date().toISOString() : null},
                processed_by = ${processedBy},
                failure_reason = ${failureReason},
                admin_notes = ${adminNotes},
                updated_at = NOW()
            WHERE payout_request_id = ${params.payout_request_id}
            RETURNING *
        `;

        const wallet = await getDoctorWalletSummary(existing.did);

        return NextResponse.json({
            success: true,
            payout: updated,
            wallet,
        });
    } catch (error) {
        console.error('Admin payout update API error:', error);
        return NextResponse.json({ error: 'Failed to update payout request' }, { status: 500 });
    }
}
