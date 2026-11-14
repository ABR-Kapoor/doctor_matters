import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type {
  DoctorWalletSummary,
  PayoutRequestRecord,
  WalletTransactionRecord,
} from '@/lib/wallet';

export interface WalletFilters {
  direction?: string;
  category?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface WalletData {
  wallet: DoctorWalletSummary;
  transactions: WalletTransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  payouts: PayoutRequestRecord[];
  payoutPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  config: { minPayoutAmount: number; payoutFee: number };
  payoutProfile: { method: string | null; verified: boolean; ready: boolean };
}

export function useDoctorWallet(token: string | null, filters: WalletFilters = {}) {
  const params = new URLSearchParams();
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('q', filters.search);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();

  return useQuery<WalletData>({
    queryKey: ['doctor', 'wallet', queryString],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/doctor/wallet${queryString ? `?${queryString}` : ''}`, token, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load wallet');
      return data as WalletData;
    },
    staleTime: 30_000,
    enabled: !!token,
  });
}
