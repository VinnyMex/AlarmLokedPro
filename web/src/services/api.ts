// Points at the NestJS backend in /backend. Resolution order: the runtime
// config injected by the Docker image at container start (see
// docker-entrypoint.sh — lets one built image target any backend host),
// then VITE_API_URL baked in at build time for non-Docker builds, then a
// localhost default for plain `npm run dev`.
const API_BASE_URL = window.__ALARMLOCK_API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ACCESS_TOKEN_KEY = 'alarmlock.accessToken';
const REFRESH_TOKEN_KEY = 'alarmlock.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
