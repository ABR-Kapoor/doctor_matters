import type { Href } from 'expo-router';

/**
 * Maps notification payloads (URLs or data types) to their matching mobile screens.
 */
export function toMobileNotificationHref(
  url?: string | null,
  data?: Record<string, any> | null,
): Href | null {
  // If video call notification with appointment ID
  if (data?.type === 'video_call' && data?.aid) {
    return `/video-call/${data.aid}` as Href;
  }

  if (data?.type === 'prescription') {
    return '/(dashboard)/prescriptions' as Href;
  }

  if (data?.type === 'payment' || data?.type === 'wallet' || data?.type === 'payout') {
    return '/(dashboard)/finance' as Href;
  }

  if (!url) {
    if (data?.type === 'appointment') return '/(dashboard)' as Href;
    return '/(dashboard)/notifications' as Href;
  }

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed === '/dashboard' || trimmed === '/dashboard/') {
    return '/(dashboard)' as Href;
  }

  const withoutDashboard = trimmed.startsWith('/dashboard')
    ? trimmed.slice('/dashboard'.length)
    : trimmed;

  const path = withoutDashboard.startsWith('/')
    ? withoutDashboard
    : `/${withoutDashboard}`;

  if (path === '/appointments' || path.startsWith('/appointments/')) {
    return '/(dashboard)' as Href;
  }

  return path as Href;
}
