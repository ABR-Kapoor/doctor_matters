import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateAppointmentStatus } from '@aurasutra/doctor-shared';
import toast from 'react-hot-toast';

interface UpdateStatusVars {
  aid: string;
  status: string;
  uid: string;
  token: string | null;
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aid, status, token }: UpdateStatusVars) => {
      const data = await apiUpdateAppointmentStatus('', token, aid, status);
      if (!data.success) throw new Error(data.error || 'Failed to update appointment');
      return data;
    },
    onMutate: async ({ aid, status, uid }) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['doctor', 'appointments', uid] });
      const previous = queryClient.getQueryData(['doctor', 'appointments', uid]);

      // Optimistic update — move appointment to the right bucket
      queryClient.setQueryData(['doctor', 'appointments', uid], (old: any) => {
        if (!old) return old;
        const updateItem = (a: any) => (a.aid === aid ? { ...a, status } : a);

        const pending = (old.pending || []).map(updateItem).filter((a: any) => a.status === 'pending' || a.status === 'scheduled');
        const confirmed = (old.confirmed || []).map(updateItem).filter((a: any) => a.status === 'confirmed' || a.status === 'in_progress');
        const today = (old.today || []).map(updateItem).filter((a: any) => a.status !== 'completed' && a.status !== 'cancelled');

        const allApts = [...(old.pending || []), ...(old.confirmed || []), ...(old.today || []), ...(old.completed || [])];
        const target = allApts.find((a: any) => a.aid === aid);
        const updated = target ? { ...target, status } : null;

        const completed = (old.completed || []).filter((a: any) => a.aid !== aid);
        if (status === 'completed' && updated) {
          completed.unshift(updated);
        }

        const cancelled = (old.cancelled || []).filter((a: any) => a.aid !== aid);
        if (status === 'cancelled' && updated) {
          cancelled.unshift(updated);
        }

        return {
          pending,
          confirmed,
          today,
          completed,
          cancelled,
        };
      });

      return { previous };
    },
    onError: (err, { uid }, ctx) => {
      // Rollback
      if (ctx?.previous) queryClient.setQueryData(['doctor', 'appointments', uid], ctx.previous);
      toast.error('Failed to update appointment');
    },
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'appointments', uid] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'dashboard', uid] });
    },
  });
}
