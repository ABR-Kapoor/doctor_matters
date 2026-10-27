import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth, API_BASE_URL } from '../../lib/fetchWithAuth';
import {
  apiGetDoctorAppointments,
  apiGetDoctorPatients,
  apiGetDoctorPatientDetails,
  apiGetDoctorPrescriptions,
} from '@aurasutra/doctor-shared';

type AuthToken = string | null | (() => string | null | Promise<string | null>);

export function useDoctorIdentity(token: AuthToken) {
  return useQuery({
    queryKey: ['doctorIdentity', token],
    queryFn: async () => {
      const res = await fetchWithAuth('/api/doctor/profile', token);
      const data = await res.json();
      // A patient account is refused by the server. Flag it explicitly so the app can
      // sign them out instead of sitting on a permanent loading state.
      if (res.status === 403 || data.code === 'ROLE_MISMATCH') {
        throw Object.assign(new Error(data.error || 'This account cannot access the doctor portal.'), {
          code: 'ROLE_MISMATCH',
        });
      }
      if (!data.success) throw new Error('Failed to fetch identity');
      return { 
        did: data.doctor?.did, 
        uid: data.user?.uid, 
        name: data.user?.name, 
        specialization: data.doctor?.specialization?.[0] || ''
      };
    },
    enabled: !!token,
  });
}

export function useDoctorProfile(uid: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorProfile', uid, token],
    queryFn: async () => {
      // The API resolves the profile from the Clerk session, so no uid is sent.
      const res = await fetchWithAuth('/api/doctor/profile', token);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load profile');
      }
      return {
        user: data.user || { name: '', email: '', phone: '', profile_image_url: '' },
        doctor: data.doctor || {
          is_verified: false,
          specialization: [],
          custom_specializations: '',
          qualification: '',
          registration_number: '',
          years_of_experience: 0,
          consultation_fee: 0,
          bio: '',
          clinic_id: null,
          clinic_name: '',
          languages: [],
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: ''
        }
      };
    },
    enabled: !!token, // uid can be null if we use token
  });
}


export function useDoctorNotifications(token: AuthToken) {
  return useQuery({
    queryKey: ['doctorNotifications', token],
    queryFn: async () => {
      try {
        const res = await fetchWithAuth('/api/doctor/notifications', token);
        const data = await res.json();
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        const unreadCount = list.filter((n: any) => !n.is_read).length;
        return { notifications: list, unreadCount };
      } catch {
        return { notifications: [], unreadCount: 0 };
      }
    },
    enabled: !!token,
    refetchInterval: 30000,
  });
}
export function useDoctorClinics(token: AuthToken) {
  return useQuery({
    queryKey: ['doctorClinics', token],
    queryFn: async () => {
      try {
        const res = await fetchWithAuth('/api/doctor/clinics', token);
        const data = await res.json();
        return data.clinics || [];
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });
}

export type DoctorAppointmentBuckets = {
  pending: any[];
  confirmed: any[];
  today: any[];
  completed: any[];
  cancelled: any[];
};

const EMPTY_BUCKETS: DoctorAppointmentBuckets = {
  pending: [],
  confirmed: [],
  today: [],
  completed: [],
  cancelled: [],
};

function localTodayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function aptStatus(apt: any): string {
  return String(apt?.status || '').trim().toLowerCase();
}

function aptDateStr(apt: any): string {
  return String(
    apt?.scheduled_date ?? apt?.scheduledDate ?? apt?.date ?? ''
  ).slice(0, 10);
}

const BUCKET_KEYS = ['pending', 'confirmed', 'today', 'completed', 'cancelled'] as const;

/**
 * Bucket a flat appointment list into the tabs the UI renders.
 *
 * Only used as a FALLBACK, when the server does not send pre-bucketed lists
 * (e.g. an older/other endpoint that returns a single `appointments` array).
 * When the server does bucket, its buckets are authoritative and must not be
 * recomputed here.
 */
function bucketAppointments(list: any[]): DoctorAppointmentBuckets {
  const todayStr = localTodayStr();
  const pending: any[] = [];
  const confirmed: any[] = [];
  const today: any[] = [];
  const completed: any[] = [];
  const cancelled: any[] = [];

  for (const apt of list) {
    const s = aptStatus(apt);
    if (s === 'completed' || s === 'complete' || s === 'done') {
      completed.push(apt);
      continue;
    }
    if (s === 'cancelled' || s === 'canceled' || s === 'reject' || s === 'rejected') {
      cancelled.push(apt);
      continue;
    }
    // `today` is a date filter, so it deliberately overlaps the status buckets.
    if (aptDateStr(apt) === todayStr) today.push(apt);

    if (s === 'confirmed' || s === 'in_progress' || s === 'in-progress' || s === 'ongoing') {
      confirmed.push(apt);
      continue;
    }
    // Everything else — including unknown/blank future statuses — stays visible
    // in Pending rather than silently disappearing.
    pending.push(apt);
  }

  return { pending, confirmed, today, completed, cancelled };
}

function normalizeAppointments(raw: any): DoctorAppointmentBuckets {
  if (!raw) return EMPTY_BUCKETS;

  if (Array.isArray(raw)) {
    return bucketAppointments(raw);
  }
  if (typeof raw !== 'object') return EMPTY_BUCKETS;

  for (const key of ['appointments', 'data', 'list', 'items', 'all', 'upcoming']) {
    const list = (raw as any)[key];
    if (Array.isArray(list) && list.length > 0) return bucketAppointments(list);
  }

  const hasBuckets = BUCKET_KEYS.some((k) => Array.isArray((raw as any)[k]));
  if (hasBuckets) {
    const pending = Array.isArray(raw.pending) ? raw.pending : [];
    const confirmed = Array.isArray(raw.confirmed) ? raw.confirmed : [];
    const today = Array.isArray(raw.today) ? raw.today : [];
    const completed = Array.isArray(raw.completed) ? raw.completed : [];
    const cancelled = Array.isArray(raw.cancelled) ? raw.cancelled : [];

    const inProgress = Array.isArray((raw as any).in_progress) ? (raw as any).in_progress : [];
    const ongoing = Array.isArray((raw as any).ongoing) ? (raw as any).ongoing : [];
    const extra = [...inProgress, ...ongoing];

    const todayStr = localTodayStr();
    for (const apt of extra) {
      confirmed.push(apt);
      if (aptDateStr(apt) === todayStr) {
        if (!today.some((t: any) => (t.aid ?? t.id ?? t._id) === (apt.aid ?? apt.id ?? apt._id))) {
          today.push(apt);
        }
      }
    }

    return { pending, confirmed, today, completed, cancelled };
  }

  return EMPTY_BUCKETS;
}

export function useDoctorAppointments(uid: string | null, token: AuthToken, hasActiveCall: boolean) {
  return useQuery({
    queryKey: ['doctorAppointments', uid],
    queryFn: async () => {
      // `uid` still gates the query locally, but it is not sent: the API derives
      // the doctor from the Clerk session.
      if (!uid) return EMPTY_BUCKETS;
      const res = await fetchWithAuth('/api/doctor/appointments', token);
      if (!res.ok) {
        // Previously every non-2xx was swallowed into EMPTY_BUCKETS, so a 401/500
        // was indistinguishable from "you have no appointments" — the Pending tab
        // just looked empty. Surface it instead.
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed to load appointments (${res.status})`);
      }
      const data = await res.json();
      if (data?.success === false) {
        throw new Error(data.message || data.error || 'Failed to load appointments');
      }
      return normalizeAppointments(data?.appointments ?? data?.data ?? data);
    },
    enabled: !!token && !!uid,
  });
}

export function useDoctorFinance(uid: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorFinance', uid, token],
queryFn: async () => {
      // Any failure used to fall through to an empty object, which rendered as
      // "profile incomplete" instead of an error. Surface it so the UI can say so.
      const res = await fetchWithAuth('/api/doctor/finance', token);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed to load payouts (${res.status})`);
      }
      const data = await res.json();
      return data.finance || {
        isProfileComplete: false, isVerified: false, bankDetailsAdded: false,
        payoutMethod: 'bank', bankForm: {}, totalEarnings: 0, pendingEarnings: 0, earnings: []
      };
    },
    enabled: !!token,
  });
}

export function useDoctorPatients(uid: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorPatients', uid, token],
    queryFn: async () => {
      const data = await apiGetDoctorPatients(API_BASE_URL, token);
      return data.patients || [];
    },
    enabled: !!token,
  });
}

export function useDoctorPatientDetails(pid: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorPatientDetails', pid, token],
    queryFn: async () => {
      if (!pid) return null;
      const data = await apiGetDoctorPatientDetails(API_BASE_URL, token, pid);
      return { patient: data.patient, appointments: data.appointments || [] };
    },
    enabled: !!pid && !!token,
  });
}

export function useDoctorPrescriptions(did: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorPrescriptions', did, token],
    queryFn: async () => {
      const data = await apiGetDoctorPrescriptions(API_BASE_URL, token);
      return data.prescriptions || [];
    },
    enabled: !!token,
  });
}

export function useDoctorPrescription(prescriptionId: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorPrescription', prescriptionId, token],
    queryFn: async () => {
      if (!prescriptionId) return null;
      const res = await fetchWithAuth(`/api/doctor/prescriptions/${prescriptionId}`, token);
      if (res.status === 404) return null;
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      return data.prescription || null;
    },
    enabled: !!prescriptionId && !!token,
    retry: 1,
  });
}

export function prescriptionStatsQueryOptions(
  prescriptionId: string,
  token: AuthToken,
  opts: { withDoses?: boolean } = {}
) {
  const withDoses = opts.withDoses === true;
  return {
    queryKey: ['doctorPrescriptionStats', prescriptionId, withDoses, token] as const,
    queryFn: async () => {
      if (!prescriptionId) return null;
      const suffix = withDoses ? '?with_doses=1' : '';
      const res = await fetchWithAuth(`/api/doctor/adherence/${prescriptionId}${suffix}`, token);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed to load adherence (${res.status})`);
      }
      const data = await res.json();
      return data.stats || null;
    },
    enabled: !!prescriptionId && !!token,
  };
}

export function useDoctorPrescriptionStats(
  prescriptionId: string | null,
  token: AuthToken,
  opts: { withDoses?: boolean } = {}
) {
  return useQuery({
    ...prescriptionStatsQueryOptions(prescriptionId || '', token, opts),
    enabled: !!prescriptionId && !!token,
  });
}
