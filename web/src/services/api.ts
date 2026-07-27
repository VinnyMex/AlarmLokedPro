// Points at the NestJS backend in /backend. Resolution order: the runtime
// config injected by the Docker image at container start (see
// docker-entrypoint.sh — lets one built image target any backend host),
// then VITE_API_URL baked in at build time for non-Docker builds, then a
// localhost default for plain `npm run dev`.
const API_BASE_URL = window.__ALARMLOCK_API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ACCESS_TOKEN_KEY = 'alarmlock.accessToken';
const REFRESH_TOKEN_KEY = 'alarmlock.refreshToken';

// Dispatched when a refresh attempt itself fails (refresh token expired,
// revoked, or missing) — the only case that should actually force the user
// back to the login screen. App.tsx listens for this to navigate, since
// this module has no router access of its own.
const AUTH_EXPIRED_EVENT = 'alarmlock:auth-expired';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

// The access token is short-lived (15m) by design; without this, every
// session would silently stop working ~15 minutes after login with no
// visible error, which is what "stops staying logged in" actually was.
// Concurrent 401s share one in-flight refresh instead of each racing to
// refresh separately.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;

        const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
        storeTokens(tokens.accessToken, tokens.refreshToken);
        return tokens.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doFetch(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await doFetch(path, options, options.auth !== false ? getAccessToken() : null);

  if (response.status === 401 && options.auth !== false) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await doFetch(path, options, newAccessToken);
    } else {
      clearTokens();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function onAuthExpired(handler: () => void): () => void {
  window.addEventListener(AUTH_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
}
