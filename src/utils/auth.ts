export const AUTH_TOKEN_KEY = 'passloyal_token';
export const AUTH_ROLE_KEY = 'passloyal_role';
export const AUTH_TENANT_SLUG_KEY = 'passloyal_tenant_slug';
export const AUTH_TENANT_ID_KEY = 'passloyal_tenant_id';
export const AUTH_USER_EMAIL_KEY = 'passloyal_user_email';

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function clearAuthStorage(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_TENANT_SLUG_KEY);
  localStorage.removeItem(AUTH_TENANT_ID_KEY);
  localStorage.removeItem(AUTH_USER_EMAIL_KEY);
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const existingHeaders =
    init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init.headers)
      ? Object.fromEntries(init.headers)
      : (init.headers as Record<string, string> | undefined);

  return fetch(input, {
    ...init,
    headers: authHeaders(existingHeaders),
  });
}
