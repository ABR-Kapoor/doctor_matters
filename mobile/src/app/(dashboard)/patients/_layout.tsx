import { Stack, useRouter } from 'expo-router';
import { getHeaderOptions } from '@/components/HeaderOptions';

export default function PatientsLayout() {
  const router = useRouter();
  return (
    <Stack screenOptions={getHeaderOptions(router)}>
      <Stack.Screen name="index" options={{ headerShown: true, title: 'All Patients' }} />
      <Stack.Screen name="[patientId]" options={{ headerShown: true, title: 'Patient Details' }} />
    </Stack>
  );
}
