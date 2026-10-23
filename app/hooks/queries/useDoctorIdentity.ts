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
    // AURASUTRA-REVIEWS:identity_rating_fields
    // Backed by the `trg_refresh_doctor_rating` trigger on `public.reviews`, so
    // these are now real patient feedback counts rather than seeded numbers.
    // `avg_rating` is null until the first review exists — callers must handle
    // null and must not substitute a 0 or a 5.
    avg_rating?: number | null;
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

      const profileRes = await fetchWithAuth(`/api/doctor/profile`, token);
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


// AURASUTRA-REVIEWS:expose_rating_fields
