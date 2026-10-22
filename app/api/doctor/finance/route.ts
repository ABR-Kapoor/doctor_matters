import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface FinanceQueryParams {
  uid?: string;
  limit?: string;
  offset?: string;
}

interface EarningRecord {
  appointment_id: string;
  patient_name: string;
  amount: number;
  created_at: string;
  status: string;
  transfer_status: string;
}

interface DoctorEarnings {
  total_paid_consultations: number;
  total_doctor_earned: number;
  total_platform_fees: number;
  total_payout_fees: number;
  total_pending_amount: number;
  pending_consultations: number;
  completed_consultations: number;
  transactions: EarningRecord[];
  summary: {
    month: string;
    consultations: number;
    earned: number;
    platform_fee: number;
    payout_fee: number;
  }[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: FinanceQueryParams = {
      uid: searchParams.get('uid') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    };

    if (!params.uid) {
      return NextResponse.json({ error: 'User ID (uid) required' }, { status: 400 });
    }

    // Get doctor ID from uid
    const [doctor] = await sql`
      SELECT did FROM doctors WHERE uid = ${params.uid}
    `;

    if (!doctor) {
      return NextResponse.json({
        success: true,
        earnings: {
          total_paid_consultations: 0,
          total_doctor_earned: 0,
          total_platform_fees: 0,
          total_payout_fees: 0,
          total_pending_amount: 0,
          pending_consultations: 0,
          completed_consultations: 0,
          transactions: [],
          summary: [],
        },
      });
    }

    const did = doctor.did;
    const limitNum = Math.min(parseInt(params.limit || '50'), 500);
    const offsetNum = parseInt(params.offset || '0');

    // Fetch all completed consultations
    const allConsultations = await sql<{
      appointment_id: string;
      patient_name: string;
      amount: number;
      created_at: string;
      transfer_status: string | null;
      platform_fee_applied: number;
      payout_fee_amount: number;
    }[]>`
      SELECT 
        a.aid as appointment_id,
        u.name as patient_name,
        COALESCE(ft.final_net_amount, d.consultation_fee, 0)::NUMERIC(10,2) as amount,
        a.created_at,
        COALESCE(ft.transfer_status, 'pending') as transfer_status,
        COALESCE(ft.platform_fee_applied, 0)::NUMERIC(10,2) as platform_fee_applied,
        COALESCE(ft.payout_fee_amount, 0)::NUMERIC(10,2) as payout_fee_amount
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      JOIN users u ON p.uid = u.uid
      JOIN doctors d ON a.did = d.did
      LEFT JOIN finance_transactions ft ON ft.aid = a.aid AND ft.status = 'paid'
      WHERE a.did = ${did} AND a.status = 'completed'
      ORDER BY a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    let totalDoctorEarned = 0;
    let totalPending = 0;
    let totalPlatformFees = 0;
    let totalPayoutFees = 0;

    // Fetch totals without pagination
    const totals = await sql<{
      transfer_status: string | null;
      amount: number;
      platform_fee_applied: number;
      payout_fee_amount: number;
    }[]>`
      SELECT 
        COALESCE(ft.transfer_status, 'pending') as transfer_status,
        COALESCE(ft.final_net_amount, d.consultation_fee, 0)::NUMERIC(10,2) as amount,
        COALESCE(ft.platform_fee_applied, 0)::NUMERIC(10,2) as platform_fee_applied,
        COALESCE(ft.payout_fee_amount, 0)::NUMERIC(10,2) as payout_fee_amount
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      LEFT JOIN finance_transactions ft ON ft.aid = a.aid AND ft.status = 'paid'
      WHERE a.did = ${did} AND a.status = 'completed'
    `;

    totals.forEach(row => {
      const amount = Number(row.amount);
      if (row.transfer_status === 'success') {
        totalDoctorEarned += amount;
      } else {
        totalPending += amount;
      }
      totalPlatformFees += Number(row.platform_fee_applied);
      totalPayoutFees += Number(row.payout_fee_amount);
    });

    const pendingCount = totals.filter(t => t.transfer_status !== 'success').length;
    const paidCount = totals.length;

    const transactions = allConsultations.map(row => {
      const amount = Number(row.amount);
      const isSuccess = row.transfer_status === 'success';

      return {
        appointment_id: row.appointment_id,
        patient_name: row.patient_name,
        amount: amount,
        status: isSuccess ? 'completed' : 'pending',
        transfer_status: row.transfer_status || 'pending',
        created_at: row.created_at,
      };
    });

    // Fetch monthly summary for dashboard visualization
    const monthlySummary = await sql<{
      month: string;
      consultations: number;
      earned: number;
      platform_fee: number;
      payout_fee: number;
    }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', a.created_at), 'YYYY-MM') as month,
        COUNT(*) as consultations,
        COALESCE(SUM(COALESCE(ft.final_net_amount, d.consultation_fee, 0)), 0)::NUMERIC(10,2) as earned,
        COALESCE(SUM(ft.platform_fee_applied), 0)::NUMERIC(10,2) as platform_fee,
        COALESCE(SUM(COALESCE(ft.payout_fee_amount, 0)), 0)::NUMERIC(10,2) as payout_fee
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      LEFT JOIN finance_transactions ft ON ft.aid = a.aid AND ft.status = 'paid'
      WHERE a.did = ${did} AND a.status = 'completed'
      GROUP BY DATE_TRUNC('month', a.created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    const summary_data = monthlySummary.map(item => ({
      month: item.month,
      consultations: Number(item.consultations),
      earned: Number(item.earned),
      platform_fee: Number(item.platform_fee),
      payout_fee: Number(item.payout_fee),
    }));

    const earnings: DoctorEarnings = {
      total_paid_consultations: paidCount,
      total_doctor_earned: Number(totalDoctorEarned.toFixed(2)),
      total_platform_fees: Number(totalPlatformFees.toFixed(2)),
      total_pending_amount: Number(totalPending.toFixed(2)),
      pending_consultations: pendingCount,
      completed_consultations: paidCount,
      transactions: transactions,
      summary: summary_data,
      total_payout_fees: Number(totalPayoutFees.toFixed(2)),
    };

    return NextResponse.json({ success: true, earnings });
  } catch (error) {
    console.error('Finance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finance data', details: String(error) },
      { status: 500 }
    );
  }
}
