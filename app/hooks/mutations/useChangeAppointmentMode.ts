import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import toast from 'react-hot-toast';

interface ChangeModeVars {
  aid: string;
  mode: 'online' | 'offline';
  uid: string;
  token: string | null;
}

export function useChangeAppointmentMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aid, mode, token }: ChangeModeVars) => {
      const res = await fetchWithAuth('/api/doctor/appointments', token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aid, mode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to change mode');
      return data;
    },
    onMutate: async ({ aid, mode, uid }) => {
      await queryClient.cancelQueries({ queryKey: ['doctor', 'appointments', uid] });
      const previous = queryClient.getQueryData(['doctor', 'appointments', uid]);

      // Optimistic: flip the mode on the appointment in cache
      queryClient.setQueryData(['doctor', 'appointments', uid], (old: any) => {
        if (!old) return old;
        const update = (list: any[]) => list.map((a: any) => a.aid === aid ? { ...a, mode } : a);
        return {
          pending: update(old.pending),
          confirmed: update(old.confirmed),
          today: update(old.today),
          completed: update(old.completed),
          cancelled: update(old.cancelled),
        };
      });

      return { previous };
    },
    onError: (err, { uid }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['doctor', 'appointments', uid], ctx.previous);
      toast.error('Failed to change mode');
    },
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'appointments', uid] });
    },
  });
}
