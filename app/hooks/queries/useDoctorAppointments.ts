import { useQuery } from '@tanstack/react-query';
import { apiGetDoctorAppointments } from '@aurasutra/doctor-shared';

export interface Appointment {
  aid: string;
  scheduled_date: string;
  scheduled_time: string;
  mode: string;
  status: string;
  complaint_description: string;
  symptoms?: string[];
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  payment_status: string;
  queue_position?: number;
  token_number?: number;
  estimated_wait_minutes?: number;
  cancellation_reason?: string;
  refund_requested?: boolean;
  refund_amount?: number;
  refund_reason?: string;
  refund_status?: string;
  patient: {
    pid: string;
    user: {
      name: string;
      email: string;
      phone: string;
      profile_image_url?: string;
    };
  };
}

export interface AppointmentBuckets {
  pending: Appointment[];
  confirmed: Appointment[];
  today: Appointment[];
  completed: Appointment[];
  cancelled: Appointment[];
}

export function useDoctorAppointments(uid: string | null, token: string | null, hasActiveCall = false) {
  return useQuery<AppointmentBuckets>({
    queryKey: ['doctor', 'appointments', uid],
    queryFn: async () => {
      const data = await apiGetDoctorAppointments('', token);
      if (!data.success) throw new Error(data.error || 'Appointments fetch failed');
      return {
        pending: data.appointments?.pending || [],
        confirmed: data.appointments?.confirmed || [],
        today: data.appointments?.today || [],
        completed: data.appointments?.completed || [],
        cancelled: data.appointments?.cancelled || [],
      };
    },
    staleTime: 10_000,
    refetchInterval: hasActiveCall ? 5_000 : 10_000,
    enabled: !!(uid && uid.length > 0 && token),
  });
}
