'use client';

type AuthErrorPayload = {
  success?: boolean;
  code?: string;
};

export type RefreshResult = 'refreshed' | 'expired' | 'failed';

export type AuthFetchOptions = {
  onSessionExpired?: () => void;
};

const refreshableCodes = new Set(['UNAUTHORIZED']);
const expiredSessionCodes = new Set([
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_EXPIRED',
  'ACCOUNT_BLOCKED',
  'ACCOUNT_INACTIVE',
  'EMAIL_NOT_VERIFIED',
]);
export const AUTH_SESSION_EXPIRED_EVENT = 'viue:auth-session-expired';
let activeRefresh: Promise<RefreshResult> | null = null;

function resolveInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== 'string' || !input.startsWith('/')) return input;
  if (typeof window !== 'undefined') return new URL(input, window.location.origin);
  return new URL(input, 'http://localhost');
}

async function shouldRefresh(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    const payload = (await response.clone().json()) as AuthErrorPayload;
    return typeof payload.code === 'string' && refreshableCodes.has(payload.code);
  } catch {
    return false;
  }
}

async function refreshSession(): Promise<RefreshResult> {
  const response = await fetch(
    new Request(resolveInput('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }),
  );
  if (response.ok) return 'refreshed';
  try {
    const payload = (await response.json()) as AuthErrorPayload;
    return typeof payload.code === 'string' && expiredSessionCodes.has(payload.code)
      ? 'expired'
      : 'failed';
  } catch {
    return 'failed';
  }
}

export function refreshAuthSession(): Promise<RefreshResult> {
  if (!activeRefresh) {
    activeRefresh = refreshSession()
      .catch(() => 'failed' as const)
      .finally(() => {
        activeRefresh = null;
      });
  }
  return activeRefresh;
}

function handleExpiredSession(onSessionExpired?: () => void): void {
  if (onSessionExpired) {
    onSessionExpired();
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: AuthFetchOptions = {},
): Promise<Response> {
  const request = new Request(resolveInput(input), {
    ...init,
    credentials:
      init?.credentials ?? (input instanceof Request ? input.credentials : 'same-origin'),
  });
  const response = await fetch(request.clone());
  if (!(await shouldRefresh(response))) return response;

  const refreshResult = await refreshAuthSession();
  if (refreshResult !== 'refreshed') {
    if (refreshResult === 'expired') handleExpiredSession(options.onSessionExpired);
    return response;
  }

  return fetch(request.clone());
}
