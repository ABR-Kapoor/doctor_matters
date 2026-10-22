import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface DoctorIdentity {
  uid: string;
  did: string;
  name: string;
  imageUrl: string;
  email: string;
  doctor?: {
    specialization?: string[];
    qualification?: string;
    years_of_experience?: number;
    clinic_name?: string;
    is_verified?: boolean;
    avg_rating?: number;
    total_reviews?: number;
    total_consultations?: number;
    bio?: string;
  } | null;
}

/**
 * Self-contained identity resolver.
 * Fetches /api/sync-user then /api/doctor/profile to get uid + did.
 * staleTime: Infinity — never re-fetches mid-session.
 * All other doctor queries chain off this.
 */
export function useDoctorIdentity(token: string | null) {
  return useQuery<DoctorIdentity>({
    queryKey: ['doctor', 'identity'],
    queryFn: async () => {
      const syncRes = await fetchWithAuth('/api/sync-user', token, { cache: 'no-store' });
      if (!syncRes.ok) throw new Error('Sync failed');
      const { user } = await syncRes.json();
      if (!user?.uid) throw new Error('No user');

      const profileRes = await fetchWithAuth(`/api/doctor/profile?uid=${user.uid}`, token);
      const profileData = await profileRes.json();
      const did = profileData.success ? (profileData.doctor?.did || '') : '';

      return {
        uid: user.uid as string,
        did: did as string,
        name: user.name || '',
        imageUrl: user.profile_image_url || user.profileImageUrl || '',
        email: user.email || '',
        doctor: profileData.success ? profileData.doctor : null,
      };
    },
    staleTime: Infinity,
    enabled: !!(token && token.length > 0),
    retry: 2,
  });
}

