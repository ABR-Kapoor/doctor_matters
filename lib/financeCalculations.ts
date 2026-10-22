/**
 * Finance Utility Functions
 * Shared calculations and formatting for doctor earnings, analytics
 */

export interface FinanceSummary {
  total_paid_consultations: number;
  total_doctor_earned: number;
  total_platform_fees: number;
  total_pending_amount: number;
}

export interface Transaction {
  transaction_id: string;
  pid: string;
  transaction_type: string;
  amount: number;
  doctor_net_amount: number;
  platform_fee_applied: number;
  payout_fee_amount?: number;
  final_net_amount?: number;
  status: string;
  transfer_status: string | null;
  paid_at: string;
  created_at: string;
}

/**
 * Format currency for INR display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate net earnings (consultation fee - platform fee)
 */
export function calculateNetEarnings(
  consultationFee: number,
  platformFee: number
): number {
  return Math.max(0, consultationFee - platformFee);
}

/**
 * Calculate final doctor payout for manual settlement
 */
export function calculateFinalPayout(
  doctorGrossAmount: number,
  payoutFeeAmount: number = 9
): number {
  return Math.max(0, doctorGrossAmount);
}

/**
 * Calculate earnings percentage
 */
export function calculateEarningsPercentage(
  earned: number,
  total: number
): number {
  if (total === 0) return 0;
  return earned / total;
}

/**
 * Group transactions by month
 */
export function groupTransactionsByMonth(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach(txn => {
    const date = new Date(txn.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(txn);
  });

  return grouped;
}

/**
 * Calculate month-over-month growth
 */
export function calculateMoMGrowth(
  currentMonth: number,
  previousMonth: number
): { growth: number; percentage: number } {
  const growth = currentMonth - previousMonth;
  const percentage = previousMonth === 0 ? 0 : (growth / previousMonth) * 100;
  return { growth, percentage };
}

/**
 * Get transfer status badge info
 */
export function getTransferStatusInfo(status: string | null): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'success':
      return {
        label: 'Transferred',
        color: 'bg-green-100 text-green-800',
        icon: '✓',
      };
    case 'on_hold_bank_verification':
      return {
        label: 'On Hold: Bank Verification',
        color: 'bg-amber-100 text-amber-800',
        icon: '⏳',
      };
    case 'on_hold_upi_details':
      return {
        label: 'On Hold: UPI Details',
        color: 'bg-orange-100 text-orange-800',
        icon: '⚠',
      };
    case 'on_hold_payout_config':
      return {
        label: 'On Hold: Payout Config',
        color: 'bg-orange-100 text-orange-800',
        icon: '⚠',
      };
    case 'not_applicable':
      return {
        label: 'Not Applicable',
        color: 'bg-slate-100 text-slate-700',
        icon: '•',
      };
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏳',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'bg-red-100 text-red-800',
        icon: '✕',
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800',
        icon: '?',
      };
  }
}

/**
 * Calculate average consultation fee
 */
export function calculateAverageConsultationFee(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  return total / transactions.length;
}

/**
 * Get date range label (last 7 days, last 30 days, etc.)
 */
export function getDateRangeLabel(days: number): string {
  if (days === 7) return 'Last 7 days';
  if (days === 30) return 'Last 30 days';
  if (days === 90) return 'Last 3 months';
  if (days === 365) return 'Last year';
  return `Last ${days} days`;
}

/**
 * Format date for display
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  
  return `${d}/${m}/${y}`;
}

/**
 * Format time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge info for transaction
 */
export function getTransactionStatusInfo(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'paid':
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: '✓',
      };
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏳',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'bg-red-100 text-red-800',
        icon: '✕',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        color: 'bg-blue-100 text-blue-800',
        icon: '↩',
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800',
        icon: '•',
      };
  }
}

/**
 * Calculate total fees percentage
 */
export function calculateFeePercentage(
  totalFees: number,
  totalEarned: number
): number {
  if (totalEarned === 0) return 0;
  return (totalFees / totalEarned) * 100;
}

/**
 * Generate CSV from transactions
 */
export function generateCSVContent(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Transaction ID',
    'Type',
    'Amount',
    'Platform Fee',
    'Manual Settlement',
    'Net Earned',
    'Status',
    'Transfer Status',
  ];

  const rows = transactions.map(t => [
    formatDate(t.created_at),
    t.transaction_id,
    t.transaction_type,
    t.amount,
    t.platform_fee_applied,
    t.payout_fee_amount || 0,
    t.final_net_amount ?? t.doctor_net_amount,
    t.status,
    t.transfer_status || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
