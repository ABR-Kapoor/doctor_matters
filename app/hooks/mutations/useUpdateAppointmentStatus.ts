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

      // Optimistic update � move appointment to the right bucket
      queryClient.setQueryData(['doctor', 'appointments', uid], (old: any) => {
        if (!old) return old;
        const allApts = [...old.pending, ...old.confirmed, ...old.today, ...old.completed, ...old.cancelled];
        const apt = allApts.find((a: any) => a.aid === aid);
        if (!apt) return old;
        const updated = { ...apt, status };
        const buckets: any = { pending: [], confirmed: [], today: [], completed: [], cancelled: [] };
        allApts.forEach((a: any) => {
          if (a.aid === aid) {
            const bucket = ['pending', 'confirmed', 'today', 'completed', 'cancelled'].includes(status)
              ? status : 'completed';
            buckets[bucket].push(updated);
          } else {
            const b = (a.status === 'scheduled' || a.status === 'pending') ? 'pending' : (a.status as string);
            if (buckets[b]) buckets[b].push(a);
          }
        });
        return buckets;
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
