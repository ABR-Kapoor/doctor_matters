import { useMutation, useQueryClient } from '@tanstack/react-query';
import { globalShowToast } from '../../lib/NotificationContext';

const Toast = {
  show: (options: any) => {
    if (globalShowToast) {
      globalShowToast(options.text1, options.text2, options.type || 'info');
    }
  }
};
import { useAuth } from '@clerk/expo';
import { fetchWithAuth, API_BASE_URL } from '../../lib/fetchWithAuth';
import {
  apiUpdateAppointmentStatus,
  apiChangeAppointmentMode,
} from '@aurasutra/doctor-shared';

/**
 * `fetchWithAuth` accepts either a literal token or Clerk's `getToken`
 * function. Most call sites pass the function so the token is always fresh, so
 * the mutation signatures have to allow it — declaring `string | null` only made
 * every call site a type error.
 */
type AuthToken = string | null | (() => string | null | Promise<string | null>);

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ aid, status, uid, token }: { aid: string; status: string; uid: string; token: AuthToken }) => {
      return await apiUpdateAppointmentStatus(API_BASE_URL, token, aid, status);
    },
    onSuccess: (data: any) => {
      Toast.show({ type: 'success', text1: `Appointment ${data.appointment?.status || 'updated'}` });
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to update appointment' });
    }
  });
}

export function useChangeAppointmentMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aid, mode, uid, token }: { aid: string; mode: string; uid: string; token: AuthToken }) => {
      return await apiChangeAppointmentMode(API_BASE_URL, token, aid, mode);
    },
    onSuccess: (data: any) => {
      Toast.show({ type: 'success', text1: 'Mode changed' });
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to change mode' });
    }
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ uid, data, token }: { uid: string; data: any; token: AuthToken }) => {
      const { name, phone, email, profile_image_url, prefix, ...doctor } = data;
      const user = { name: name || '', phone: phone || '', profile_image_url: profile_image_url || '' };
      
      const res = await fetchWithAuth('/api/doctor/profile', token, {
        method: 'PATCH',
        body: JSON.stringify({ uid, user, doctor })
      });
      if (!res.ok) {
         let text = '';
         try {
           text = await res.text();
           const err = JSON.parse(text);
           throw new Error(err.error || 'Failed to update profile');
         } catch (e: any) {
           if (e.message !== 'Failed to update profile' && !e.message.includes('Unexpected token') && !e.message.includes('Unexpected end of JSON')) {
             throw e; // Rethrow the error from JSON.parse if it's the custom one
           }
           // Truncate text to fit in toast
           const preview = text ? text.substring(0, 100) : 'Empty response';
           throw new Error(`Invalid response (Status ${res.status}): ${preview}`);
         }
      }
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Profile saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      queryClient.invalidateQueries({ queryKey: ['doctorIdentity'] });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to save profile' });
    }
  });
}

export function useSaveBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payoutMethod, bankDetails, token }: { uid: string; payoutMethod: string; bankDetails: any; token: AuthToken }) => {
      // `uid` is kept in the signature for the call sites' convenience but is not
      // sent: the API always writes to the authenticated doctor.
      void uid;
      const res = await fetchWithAuth('/api/doctor/bank-details', token, {
        method: 'POST',
        body: JSON.stringify({ bankDetails: { ...bankDetails, payoutMethod } })
      });
      if (res.status === 401) throw new Error('Please sign in again.');
      if (res.status === 403) throw new Error('This account cannot save payout details.');
      if (!res.ok) throw new Error('Failed to save payout details');
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payout details saved' });
      queryClient.invalidateQueries({ queryKey: ['doctorFinance'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to save payout details' });
    }
  });
}

export function useRequestVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, token }: { uid: string; token: AuthToken }) => {
      // The API resolves the target doctor from the session, so a doctor can
      // only ever submit their own profile for review.
      void uid;
      const res = await fetchWithAuth('/api/doctor/verification/request', token, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (res.status === 401) throw new Error('Please sign in again.');
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'This account cannot submit a doctor profile.');
      }
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || body.message || 'Failed to submit verification'); }
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Verification submitted successfully' });
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to submit verification' });
    }
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, token }: { data: any; token: AuthToken }) => {
      const res = await fetchWithAuth('/api/doctor/prescriptions', token, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      // Surface the server's own reason instead of a generic message, otherwise a
      // validation failure and a real fault are indistinguishable on screen.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Failed to create prescription (${res.status})`);
      }
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Prescription created' });
      queryClient.invalidateQueries({ queryKey: ['doctorPrescriptions'] });
    },
    onError: (err: Error) => {
      Toast.show({ type: 'error', text1: 'Could not create prescription', text2: err.message });
    }
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, token }: { id: string; data: any; token: AuthToken }) => {
      const res = await fetchWithAuth(`/api/doctor/prescriptions/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update prescription');
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Prescription updated' });
      queryClient.invalidateQueries({ queryKey: ['doctorPrescription'] });
      queryClient.invalidateQueries({ queryKey: ['doctorPrescriptions'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to update prescription' });
    }
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, token }: { id: string; token: AuthToken }) => {
      const res = await fetchWithAuth(`/api/doctor/prescriptions/${id}`, token, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete prescription');
      return await res.json();
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Prescription deleted' });
      queryClient.invalidateQueries({ queryKey: ['doctorPrescriptions'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to delete prescription' });
    }
  });
}

export function useSendPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, token }: { id: string; token: AuthToken }) => {
      const res = await fetchWithAuth(`/api/doctor/prescriptions/${id}/send`, token, {
        method: 'POST'
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Failed to send prescription (${res.status})`);
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      Toast.show({ type: 'success', text1: 'Prescription sent', text2: data?.adherenceRecordsCreated ? `${data.adherenceRecordsCreated} reminders scheduled` : undefined });
      queryClient.invalidateQueries({ queryKey: ['doctorPrescriptions'] });
    },
    onError: (err: Error) => {
      Toast.show({ type: 'error', text1: 'Could not send prescription', text2: err.message });
    }
  });
}

/**
 * AI draft generation. The server picks Gemini first and falls back to Groq,
 * so this needs a long ceiling: model latency plus a possible provider switch
 * easily exceeds the default 20s fetch timeout.
 */
export function useGeneratePrescription() {
  return useMutation({
    mutationFn: async ({
      pid, aid, system, diagnosis, symptoms, token
    }: {
      pid: string;
      aid?: string | null;
      system?: string;
      diagnosis?: string;
      symptoms?: string[];
      token: AuthToken;
    }) => {
      const res = await fetchWithAuth('/api/ai/generate-prescription', token, {
        method: 'POST',
        timeoutMs: 60000,
        body: JSON.stringify({ pid, aid, system, diagnosis, symptoms })
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || body?.message || `AI generation failed (${res.status})`);
      }
      return body;
    }
    // No onSuccess/onError toasts: the screen shows its own, because it also
    // handles the auto-trigger case right after a video call.
  });
}

export function useAdminVerify() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ uid, action, reason }: { uid: string; action: string; reason?: string }) => {
      // Authorisation is the Clerk session with `users.role = 'admin'`. This used
      // to pass the `?token=` value from the emailed review link as the bearer
      // token, which both could not authenticate and re-introduced the shared
      // secret that the API no longer accepts.
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error('Not signed in');

      const res = await fetchWithAuth('/api/admin/verify', clerkToken, {
        method: 'POST',
        body: JSON.stringify({ uid, action, reason })
      });

      if (res.status === 401) throw new Error('Please sign in again.');
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Administrator access required.');
      }
      if (!res.ok) throw new Error('Failed to verify doctor');
      return await res.json();
    }
  });
}
