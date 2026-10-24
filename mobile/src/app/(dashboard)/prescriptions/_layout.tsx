import { Stack, useRouter } from 'expo-router';
import { getHeaderOptions } from '@/components/HeaderOptions';

export default function PrescriptionsLayout() {
  const router = useRouter();
  return (
    <Stack screenOptions={getHeaderOptions(router)}>
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Prescriptions' }} />
      <Stack.Screen name="new" options={{ headerShown: true, presentation: 'modal', title: 'New Prescription' }} />
      <Stack.Screen name="[prescriptionId]/edit" options={{ headerShown: true, title: 'Edit Prescription' }} />
      <Stack.Screen name="[prescriptionId]/progress" options={{ headerShown: true, title: 'Adherence' }} />
    </Stack>
  );
}
