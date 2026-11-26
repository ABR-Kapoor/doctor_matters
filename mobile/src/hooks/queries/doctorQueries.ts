import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth, API_BASE_URL } from '../../lib/fetchWithAuth';
import {
  apiGetDoctorAppointments,
  apiGetDoctorPatients,
  apiGetDoctorPatientDetails,
  apiGetDoctorPrescriptions,
} from '@aurasutra/doctor-shared';

import type { AuthToken } from '@aurasutra/doctor-shared';
import { checkDoctorProfileComplete } from '../../lib/profile-utils';

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
    refetchInterval: 20000,
  });
}

export function useDoctorFinance(uid: string | null, token: AuthToken) {
  return useQuery({
    queryKey: ['doctorFinance', uid, token],
    queryFn: async () => {
      const [profileRes, bankRes, financeRes] = await Promise.all([
        fetchWithAuth('/api/doctor/profile', token),
        fetchWithAuth('/api/doctor/bank-details', token).catch(() => null),
        fetchWithAuth('/api/doctor/finance', token).catch(() => null),
      ]);

      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed to load profile (${profileRes.status})`);
      }

      const profileData = await profileRes.json();
      const doctor = profileData.doctor;
      const user = profileData.user;
      const completeness = checkDoctorProfileComplete(doctor, user, { requirePayout: false });

      let bankDetailsAdded = false;
      let bankForm = {
        accountHolderName: '', accountNumber: '', ifscCode: '',
        bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
      };
      let payoutMethod: 'bank' | 'upi' = 'bank';

      try {
        if (bankRes?.ok) {
          const bankData = await bankRes.json();
          if (bankData.bankDetails?.addedAt) {
            bankDetailsAdded = true;
            bankForm = {
              accountHolderName: bankData.bankDetails.accountHolderName || '',
              accountNumber: bankData.bankDetails.accountNumber || '',
              ifscCode: bankData.bankDetails.ifscCode || '',
              bankName: bankData.bankDetails.bankName || '',
              accountType: bankData.bankDetails.accountType || 'savings',
              branchName: bankData.bankDetails.branchName || '',
              payoutUpiId: bankData.bankDetails.payoutUpiId || '',
            };
            payoutMethod = bankData.bankDetails.payoutMethod === 'upi' ? 'upi' : 'bank';
          }
        }
      } catch { /* non-fatal */ }

      let earnings: any[] = [];
      let totalEarnings = 0;
      let pendingEarnings = 0;

      try {
        if (financeRes?.ok) {
          const financeData = await financeRes.json();
          if (financeData.success && financeData.earnings) {
            earnings = financeData.earnings.transactions || [];
            totalEarnings = financeData.earnings.total_doctor_earned || 0;
            pendingEarnings = financeData.earnings.total_pending_amount || 0;
          }
        }
      } catch { /* non-fatal */ }

      return {
        uid: uid as string,
        isProfileComplete: completeness.isComplete,
        isVerified: Boolean(doctor?.is_verified),
        bankDetailsAdded,
        bankForm,
        payoutMethod,
        earnings,
        totalEarnings,
        pendingEarnings,
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

export interface DoctorWalletFilters {
  direction?: string;
  category?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useDoctorWallet(
  token: AuthToken,
  filters: DoctorWalletFilters = {},
  enabled = true,
) {
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

  return useQuery({
    queryKey: ['doctorWallet', token, queryString],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/doctor/wallet${queryString ? `?${queryString}` : ''}`, token);
      
      // If the dedicated wallet endpoint is not yet deployed on the backend (404),
      // gracefully fall back to the established /api/doctor/finance endpoint so doctors
      // can still see their balances and consultation transactions without seeing an error.
      if (res.status === 404) {
        try {
          const [finRes, bankRes] = await Promise.all([
            fetchWithAuth('/api/doctor/finance', token).catch(() => null),
            fetchWithAuth('/api/doctor/bank-details', token).catch(() => null),
          ]);

          let earned = 0;
          let pending = 0;
          let rawTx: any[] = [];
          if (finRes && finRes.ok) {
            const finData = await finRes.json().catch(() => ({}));
            if (finData?.earnings) {
              earned = Number(finData.earnings.total_doctor_earned || 0);
              pending = Number(finData.earnings.total_pending_amount || 0);
              rawTx = finData.earnings.transactions || [];
            }
          }

          let payoutProfile = { method: null as string | null, verified: false, ready: false };
          if (bankRes && bankRes.ok) {
            const bankData = await bankRes.json().catch(() => ({}));
            const details = bankData?.bankDetails;
            if (details) {
              const ready = details.payoutMethod === 'upi' ? !!details.payoutUpiId : (!!details.accountNumber && !!details.ifscCode);
              payoutProfile = {
                method: details.payoutMethod || 'bank',
                verified: Boolean(details.verified),
                ready,
              };
            }
          }

          return {
            success: true,
            wallet: {
              availableBalance: Math.max(0, earned - pending),
              heldAmount: pending,
              lifetimeCredited: earned,
              lifetimeDebited: 0,
              lifetimeWithdrawn: 0,
              lifetimePayoutFees: 0,
              lastTransactionAt: rawTx[0]?.created_at || null,
            },
            transactions: rawTx.map((t: any, idx: number) => ({
              id: t.appointment_id || `tx-${idx}`,
              direction: 'credit' as const,
              category: 'consultation',
              status: t.transfer_status === 'paid' ? 'completed' : 'pending',
              amount: Number(t.amount || 0),
              currency: 'INR',
              description: t.patient_name ? `Consultation with ${t.patient_name}` : 'Patient consultation',
              appointmentId: t.appointment_id || null,
              patientName: t.patient_name || null,
              referenceType: 'appointment',
              referenceId: t.appointment_id || null,
              createdAt: t.created_at || new Date().toISOString(),
            })),
            pagination: { page: 1, limit: 25, total: rawTx.length, totalPages: 1 },
            payouts: [],
            payoutPagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
            config: { minPayoutAmount: 100, payoutFee: 9 },
            payoutProfile,
          };
        } catch {
          // If fallback fails, fall through to error handling below
        }
      }

      let text = '';
      try {
        text = await res.text();
      } catch {
        throw new Error(`Wallet service unreachable (${res.status})`);
      }
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Server returned non-JSON (e.g. HTML error page from Next.js or proxy)
        throw new Error(`Wallet service temporarily unavailable (${res.status})`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to load wallet (${res.status})`);
      }
      return data;
    },
    enabled: !!token && enabled,
    staleTime: 30_000,
  });
}
