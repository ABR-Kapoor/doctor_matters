import type { AuthToken } from '../types';

export interface ResolveUrlOptions {
  expoPublicApiUrl?: string;
  metroHost?: string;
  isNative?: boolean;
  isDev?: boolean;
  isWeb?: boolean;
  defaultPort?: number;
}

export function resolveApiBaseUrl(options: ResolveUrlOptions = {}): string {
  const {
    expoPublicApiUrl = '',
    metroHost,
    isNative = false,
    isDev = false,
    isWeb = false,
    defaultPort = 3001,
  } = options;

  if (isWeb) return '';

  const normalized = expoPublicApiUrl.replace(/\/$/, '');

  if (normalized && (normalized.startsWith('https://') || normalized.includes('aurasutra.org') || normalized.includes('trycloudflare.com') || normalized.includes('vercel.app'))) {
    return normalized;
  }

  if (isDev && isNative && metroHost) {
    return normalized
      ? normalized.replace(/^(https?:\/\/)[^/:]+/, '' + metroHost)
      : 'http://' + metroHost + ':' + defaultPort;
  }

  return normalized;
}

export class RequestTimeoutError extends Error {
  readonly endpoint: string;
  readonly timeoutMs: number;
  constructor(endpoint: string, timeoutMs: number) {
    super('Request timed out after ' + timeoutMs + 'ms: ' + endpoint);
    this.name = 'RequestTimeoutError';
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }
}

export interface FetchWithAuthOptions extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchWithAuth(
  arg1: string,
  arg2: any,
  arg3: any,
  arg4: FetchWithAuthOptions = {}
): Promise<Response> {
  let baseUrl = arg1;
  let endpoint: string;
  let token: AuthToken;
  let options = arg4;

  // In doctorApi.ts: createFetchWithAuth(baseUrl, token, '/api/...') -> arg2 is token, arg3 is endpoint string starting with '/'
  if (typeof arg3 === 'string' && arg3.startsWith('/')) {
    endpoint = arg3;
    token = arg2;
  } else if (typeof arg2 === 'string') {
    // Normal order: (baseUrl, endpoint, token, options)
    endpoint = arg2;
    token = arg3;
  } else {
    endpoint = typeof arg3 === 'string' ? arg3 : '';
    token = arg2;
  }

  // Ensure leading slash and remove any trailing slash on baseUrl
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;

  let resolved = typeof token === 'function' ? await token() : token;
  if (!resolved && typeof token === 'function') {
    const deadline = Date.now() + 3000;
    while (!resolved && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 300));
      resolved = await token();
    }
  }
  if (!resolved) {
    console.warn('[fetchWithAuth] No auth token for ' + endpoint + ' - request will be unauthenticated');
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(resolved ? { Authorization: 'Bearer ' + resolved } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await fetch(url, { ...rest, headers, signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      console.error('[fetchWithAuth] Timed out after ' + timeoutMs + 'ms: ' + url);
      throw new RequestTimeoutError(endpoint, timeoutMs);
    }
    console.error('[fetchWithAuth] Error fetching ' + url + ':', err);
    throw err;
  } finally {
    clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', () => controller.abort());
  }
}

export const createFetchWithAuth = fetchWithAuth;
