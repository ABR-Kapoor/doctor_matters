import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export function useDoctorDashboard(uid: string | null, token: string | null) {
  return useQuery({
    queryKey: ['doctor', 'dashboard', uid],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/doctor/dashboard?uid=${uid}`, token);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Dashboard fetch failed');
      return data;
    },
    staleTime: 5000,
    refetchInterval: 5000,
    enabled: !!(uid && uid.length > 0 && token),
  });
}
