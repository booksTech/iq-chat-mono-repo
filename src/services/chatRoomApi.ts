const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api/v1';
const AUTH_PAYLOAD_SECRET = import.meta.env.VITE_AUTH_PAYLOAD_SECRET ?? '';

interface ApiErrorPayload {
  message?: string;
  errors?: Array<{ message?: string }>;
}

interface JoinRoomResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    roomName?: string;
    roomCode: string;
    memberEmails: [string, string];
    joinedMemberEmails: string[];
    createdAt: string;
  };
}

interface CreateRoomResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    roomName: string;
    roomCode: string;
    memberEmails: [string, string];
    joinedMemberEmails: string[];
    createdAt: string;
  };
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

  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

async function encryptValue(value: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );

  return `enc:${uint8ToBase64(iv)}:${uint8ToBase64(new Uint8Array(encrypted))}`;
}

export async function joinRoomByCode(
  token: string,
  roomCode: string
): Promise<
  | {
      ok: true;
      message: string;
      roomCode: string;
      roomName: string | null;
      memberEmails: [string, string];
    }
  | { ok: false; message: string }
> {
  if (!token) {
    return { ok: false, message: 'Authentication token is missing' };
  }

  const encryptedRoomCode = await encryptValue(roomCode.trim().toUpperCase());

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat-rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ roomCode: encryptedRoomCode })
    });
  } catch {
    return {
      ok: false,
      message: `Unable to reach chat-room server at ${API_BASE_URL}. Ensure backend is running.`
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

  const data = payload as JoinRoomResponse;
  if (!data.data?.memberEmails || data.data.memberEmails.length !== 2) {
    return { ok: false, message: 'Invalid join-room response from server' };
  }

  return {
    ok: true,
    message: data.message ?? 'Joined room successfully',
    roomCode: data.data.roomCode,
    roomName: data.data.roomName ?? null,
    memberEmails: data.data.memberEmails
  };
}

export async function createRoom(
  token: string,
  roomName: string,
  emailOne: string,
  emailTwo: string
): Promise<
  | { ok: true; message: string; roomName: string; roomCode: string; memberEmails: [string, string] }
  | { ok: false; message: string }
> {
  if (!token) {
    return { ok: false, message: 'Authentication token is missing' };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        roomName: roomName.trim(),
        emailOne: emailOne.trim().toLowerCase(),
        emailTwo: emailTwo.trim().toLowerCase()
      })
    });
  } catch {
    return {
      ok: false,
      message: `Unable to reach chat-room server at ${API_BASE_URL}. Ensure backend is running.`
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

  const data = payload as CreateRoomResponse;
  if (!data.data?.roomCode || !data.data.memberEmails || !data.data.roomName) {
    return { ok: false, message: 'Invalid create-room response from server' };
  }

  return {
    ok: true,
    message: data.message ?? 'Chat room created successfully',
    roomName: data.data.roomName,
    roomCode: data.data.roomCode,
    memberEmails: data.data.memberEmails
  };
}
