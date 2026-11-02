import type { Href } from 'expo-router';

/**
 * Notification rows use the web action URLs (`/dashboard/...`). Doctor mobile
 * screens live at the same paths inside the dashboard group, except for the
 * dashboard root itself.
 */
export function toMobileNotificationHref(url?: string | null): Href | null {
  if (!url) return null;

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
