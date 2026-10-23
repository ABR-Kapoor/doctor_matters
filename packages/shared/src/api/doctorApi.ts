import { createFetchWithAuth } from './fetchWithAuth';
import type { AuthToken } from '../types';

export async function apiGetDoctorAppointments(baseUrl: string = '', token: AuthToken) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/appointments');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to load appointments (${res.status})`);
  }
  return res.json();
}

export async function apiGetDoctorProfile(baseUrl: string = '', token: AuthToken) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/profile');
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 || data.code === 'ROLE_MISMATCH') {
    throw Object.assign(new Error(data.error || 'This account cannot access the doctor portal.'), {
      code: 'ROLE_MISMATCH',
    });
  }
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to load doctor profile');
  }
  return data;
}

export async function apiGetDoctorFinance(baseUrl: string = '', token: AuthToken) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/finance');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to load finance (${res.status})`);
  }
  return res.json();
}

export async function apiGetDoctorPatients(baseUrl: string = '', token: AuthToken, uid?: string | null) {
  const query = uid ? `?uid=${encodeURIComponent(uid)}` : '';
  const res = await createFetchWithAuth(baseUrl, token, `/api/doctor/patients${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to load patients (${res.status})`);
  }
  return res.json();
}

export async function apiGetDoctorPatientDetails(baseUrl: string = '', token: AuthToken, pid: string) {
  const res = await createFetchWithAuth(baseUrl, token, `/api/doctor/patients/${encodeURIComponent(pid)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to load patient (${res.status})`);
  }
  return res.json();
}

export async function apiGetDoctorPrescriptions(baseUrl: string = '', token: AuthToken) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/prescriptions');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Failed to load prescriptions (${res.status})`);
  }
  return res.json();
}

export async function apiSaveBankDetails(
  baseUrl: string = '',
  token: AuthToken,
  bankDetails: Record<string, unknown>,
  payoutMethod: string
) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/bank-details', {
    method: 'POST',
    body: JSON.stringify({ bankDetails: { ...bankDetails, payoutMethod } }),
  });
  if (!res.ok) throw new Error('Failed to save payout details');
  return res.json();
}

export async function apiUpdateAppointmentStatus(
  baseUrl: string = '',
  token: AuthToken,
  aid: string,
  status: string
) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/appointments', {
    method: 'PATCH',
    body: JSON.stringify({ aid, status }),
  });
  if (!res.ok) throw new Error('Failed to update appointment');
  return res.json();
}

export async function apiChangeAppointmentMode(
  baseUrl: string = '',
  token: AuthToken,
  aid: string,
  mode: string
) {
  const res = await createFetchWithAuth(baseUrl, token, '/api/doctor/appointments', {
    method: 'PATCH',
    body: JSON.stringify({ aid, mode }),
  });
  if (!res.ok) throw new Error('Failed to update appointment mode');
  return res.json();
}
