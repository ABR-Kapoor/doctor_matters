import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface SaveBankVars {
  uid: string;
  token: string | null;
  bankDetails: Record<string, string>;
  payoutMethod: 'bank' | 'upi';
}

export function useSaveBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, token, bankDetails, payoutMethod }: SaveBankVars) => {
      const res = await fetchWithAuth('/api/doctor/bank-details', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, bankDetails: { ...bankDetails, payoutMethod } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save bank details');
      return data;
    },
    onSuccess: (_, { uid }) => {
      // Invalidate finance cache so it re-fetches with updated bank status
      queryClient.invalidateQueries({ queryKey: ['doctor', 'finance', uid] });
    },
  });
}
