const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api/v1';
const AUTH_PAYLOAD_SECRET = import.meta.env.VITE_AUTH_PAYLOAD_SECRET ?? '';
const AUTH_TOKEN_STORAGE_KEY = 'quiz_auth_token';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

interface ApiErrorPayload {
  message?: string;
  errors?: Array<{ message?: string }>;
}

interface AuthPayload {
  user: AuthUser;
  token: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: AuthPayload;
}

interface MeResponse {
  success: boolean;
  message: string;
  data?: { user: AuthUser };
}

function normalizeApiError(status: number, payload: ApiErrorPayload | null): string {
  if (payload?.errors?.length) {
    return payload.errors.map((item) => item.message).filter(Boolean).join(', ');
  }
  if (payload?.message) {
    return payload.message;
  }
  return `Request failed with status ${status}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
  } catch {
    return {
      ok: false,
      message: `Unable to reach auth server at ${API_BASE_URL}. Ensure backend is running and CORS is configured.`
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      message: normalizeApiError(response.status, payload as ApiErrorPayload | null)
    };
  }

  return { ok: true, data: payload as T };
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function storeAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function deriveAesKey(): Promise<CryptoKey> {
  if (!AUTH_PAYLOAD_SECRET) {
    throw new Error(
      'Missing VITE_AUTH_PAYLOAD_SECRET. Add it in src/.env and restart the Vite dev server.'
    );
  }

  const secretBytes = new TextEncoder().encode(AUTH_PAYLOAD_SECRET);
  const digest = await crypto.subtle.digest('SHA-256', secretBytes);

  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function encryptValue(value: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );

  // browser returns ciphertext + tag together for AES-GCM.
  return `enc:${uint8ToBase64(iv)}:${uint8ToBase64(new Uint8Array(encrypted))}`;
}

async function encryptAuthFields(values: string[]): Promise<string[]> {
  const encryptedValues: string[] = [];
  for (const value of values) {
    encryptedValues.push(await encryptValue(value));
  }
  return encryptedValues;
}

export async function signin(email: string, password: string): Promise<
  | { ok: true; user: AuthUser; token: string; message: string }
  | { ok: false; message: string }
> {
  const [encryptedPassword] = await encryptAuthFields([password]);

  const result = await request<AuthResponse>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password: encryptedPassword })
  });

  if (!result.ok) {
    return result;
  }

  const payload = result.data.data;
  if (!payload?.token || !payload.user) {
    return { ok: false, message: 'Invalid sign-in response from server' };
  }

  return {
    ok: true,
    token: payload.token,
    user: payload.user,
    message: result.data.message
  };
}

export async function signup(
  email: string,
  password: string,
  confirmPassword: string
): Promise<{ ok: true; user: AuthUser; token: string; message: string } | { ok: false; message: string }> {
  const [encryptedPassword, encryptedConfirmPassword] = await encryptAuthFields([
    password,
    confirmPassword
  ]);

  const result = await request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: encryptedPassword,
      confirmPassword: encryptedConfirmPassword
    })
  });

  if (!result.ok) {
    return result;
  }

  const payload = result.data.data;
  if (!payload?.token || !payload.user) {
    return { ok: false, message: 'Invalid sign-up response from server' };
  }

  return {
    ok: true,
    token: payload.token,
    user: payload.user,
    message: result.data.message
  };
}

export async function forgotPassword(email: string): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const result = await request<{ success: boolean; message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, message: result.data.message };
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const [encryptedPassword, encryptedConfirmPassword] = await encryptAuthFields([
    password,
    confirmPassword
  ]);

  const result = await request<{ success: boolean; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      password: encryptedPassword,
      confirmPassword: encryptedConfirmPassword
    })
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, message: result.data.message };
}

export async function validateToken(
  token: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  const result = await request<MeResponse>('/auth/me', { method: 'GET' }, token);
  if (!result.ok) {
    return result;
  }

  if (!result.data.data?.user) {
    return { ok: false, message: 'Invalid token validation response from server' };
  }

  return { ok: true, user: result.data.data.user };
}

export async function signout(token?: string): Promise<void> {
  await request<{ success: boolean; message: string }>('/auth/signout', { method: 'POST' }, token);
}
