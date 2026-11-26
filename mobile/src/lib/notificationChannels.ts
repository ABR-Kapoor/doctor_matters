import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

export const PUSH_CHANNEL_ID = 'doctor-updates-v2';

const LEGACY_PUSH_CHANNEL_IDS = ['doctor-updates'];

export async function ensurePushChannel(notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: 'Doctor Updates',
    description: 'Appointments, messages, prescriptions and patient updates',
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#208AEF',
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  await notifications.setNotificationChannelAsync('appointments', {
    name: 'Appointments',
    description: 'New bookings, status changes, and patient updates',
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#208AEF',
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  await notifications.setNotificationChannelAsync('calls', {
    name: 'Consultation Calls',
    description: 'Incoming video consultations and call notifications',
    importance: notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#208AEF',
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
  });

  for (const legacyChannelId of LEGACY_PUSH_CHANNEL_IDS) {
    await notifications.deleteNotificationChannelAsync(legacyChannelId).catch(() => {});
  }
}
