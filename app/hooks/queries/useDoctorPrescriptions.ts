import { useQuery } from '@tanstack/react-query';
import { apiGetDoctorPrescriptions } from '@aurasutra/doctor-shared';

export interface Prescription {
  prescription_id: string;
  diagnosis: string;
  medicines: any[];
  instructions?: string;
  diet_advice?: string;
  created_at: string;
  sent_to_patient: boolean;
  sent_at: string | null;
  patients: {
    pid: string;
    city: string;
    state: string;
    users: {
      name: string;
      email: string;
      profile_image_url: string;
    };
  };
}

export function useDoctorPrescriptions(did: string | null, token: string | null) {
  return useQuery<Prescription[]>({
    queryKey: ['doctor', 'prescriptions', did],
    queryFn: async () => {
      const data = await apiGetDoctorPrescriptions('', token);
      if (!data.success) throw new Error(data.error || 'Prescriptions fetch failed');
      return data.prescriptions || [];
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 5000,
    enabled: !!(did && did.length > 0 && token),
  });
}
