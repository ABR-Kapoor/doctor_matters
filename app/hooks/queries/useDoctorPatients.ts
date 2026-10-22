import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface Patient {
  pid: string;
  uid: string;
  adherenceRate: number;
  prescriptionCount: number;
  user: {
    name: string;
    email: string;
    phone: string;
    profile_image_url?: string;
  };
}

export function useDoctorPatients(uid: string | null, token: string | null) {
  return useQuery<Patient[]>({
    queryKey: ['doctor', 'patients', uid],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/doctor/patients?uid=${uid}`, token);
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Patients fetch failed');
      return data.patients || [];
    },
    staleTime: 2 * 60_000, // 2 minutes — patient list rarely changes
    enabled: !!(uid && uid.length > 0 && token),
  });
}
