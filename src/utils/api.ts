const AUTH_TOKEN_KEY = 'corvexa-auth-token';
const OWNER_TOKEN_KEY = 'corvexa-owner-token';

export class ApiError extends Error {
  status: number;
  code: string;
  data: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    data: Record<string, unknown> = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures
  }
}

export function getOwnerToken(): string | null {
  try {
    return window.localStorage.getItem(OWNER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setOwnerToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(OWNER_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(OWNER_TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    token?: string | null;
    ownerToken?: string | null;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const authToken = options.token !== undefined ? options.token : getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (options.ownerToken) {
    headers['X-Owner-Token'] = options.ownerToken;
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : 'REQUEST_FAILED',
      typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`,
      data,
    );
  }

  return data as T;
}
