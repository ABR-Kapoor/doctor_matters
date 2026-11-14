import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface PayoutVars {
  token: string | null;
  amount: number;
  notes?: string;
}

export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, amount, notes }: PayoutVars) => {
      const res = await fetchWithAuth('/api/doctor/wallet/payout-request', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to request payout');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'finance'] });
    },
  });
}
