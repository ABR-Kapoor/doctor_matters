import { Platform } from 'react-native';
import Constants from 'expo-constants';

// This machine's LAN address changes with every network it joins (Wi-Fi,
// hotspot, Ethernet, ...), so a hardcoded host in .env goes stale the moment the
// phone switches networks and every request then times out. In development we
// instead reuse the host the JS bundle was actually served from: if the device
// could load the bundle from Metro, the very same machine is reachable on that
// exact address for the backend too. EXPO_PUBLIC_API_URL still provides the port
// (and remains the source of truth for production, where there is no dev server).
function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const normalized = configured ? configured.replace(/\/$/, '') : '';

  // If a public domain, tunnel, or remote backend is explicitly configured (e.g. doctor.aurasutra.org),
  // preserve it directly instead of substituting the local Metro IP.
  if (normalized && (normalized.startsWith('https://') || normalized.includes('aurasutra.org') || normalized.includes('trycloudflare.com') || normalized.includes('vercel.app'))) {
    return normalized;
  }

  if (__DEV__ && Platform.OS !== 'web') {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).expoGoConfig?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    const devHost = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (devHost) {
      // Keep the scheme + port from EXPO_PUBLIC_API_URL, swap in the reachable
      // dev-server host (e.g. 192.168.137.1). Avoids the stale-IP trap.
      return normalized
        ? normalized.replace(/^(https?:\/\/)[^/:]+/, `$1${devHost}`)
        : `http://${devHost}:3001`;
    }
  }

  if (normalized) return normalized;

  if (__DEV__ && Platform.OS !== 'web') {
    console.warn(
      '[fetchWithAuth] EXPO_PUBLIC_API_URL is not set and no dev-server host could be detected. ' +
      'Set it in .env (e.g. http://192.168.x.x:3001) and rebuild, otherwise every request will fail.'
    );
  }

  return '';
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Without this a request to an unreachable host never settles, so every query
 * stays `isLoading: true` forever and the UI spins with no explanation. The
 * backend's own database timeouts can exceed this on a cold pool, so the client
 * needs its own ceiling.
 */
const DEFAULT_TIMEOUT_MS = 20000;

export interface FetchWithAuthOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithAuth(
  arg1: string,
  arg2?: any,
  arg3?: any,
  arg4?: any
) {
  let endpoint = arg1;
  let tokenFnOrString = arg2;
  let options: FetchWithAuthOptions = arg3 || {};

  // Overload support: if called as (baseUrl, endpoint, token, options)
  if (typeof arg2 === 'string' && (arg2.startsWith('/') || arg1.startsWith('http://') || arg1.startsWith('https://'))) {
    endpoint = arg2;
    tokenFnOrString = arg3;
    options = arg4 || {};
  }

  const baseUrl = resolveApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  let token: string | null = null;
  try {
    token = typeof tokenFnOrString === 'function' ? await tokenFnOrString() : tokenFnOrString;
  } catch (tErr) {
    console.warn(`[fetchWithAuth] Failed to resolve token for ${endpoint}:`, tErr);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      const timedOut = new Error(
        `Request timed out after ${timeoutMs}ms: ${url}. ` +
        `The backend at ${API_BASE_URL || '(same origin)'} is not responding — it may be down or unreachable from this device.`
      );
      timedOut.name = 'TimeoutError';
      console.error(`[fetchWithAuth] ${timedOut.message}`);
      throw timedOut;
    }
    console.error(`Error fetching ${url}:`, error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
