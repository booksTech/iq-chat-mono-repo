import type { ChatMessage } from '../types/quiz';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api/v1';

interface ApiErrorPayload {
  message?: string;
  errors?: Array<{ message?: string }>;
}

interface MessagePayload {
  id: string;
  senderEmail: string;
  messageType: 'text' | 'gif' | 'attachment' | 'forward';
  text: string | null;
  gifUrl: string | null;
  forwardedFromMessageId: string | null;
  reactions: Array<{ emoji: string; userId: string }>;
  attachment: {
    fileName: string | null;
    mimeType: string | null;
    hasData: boolean;
    sizeBytes: number;
    deletedAt: string | null;
  } | null;
  createdAt: string;
}

interface MessageApiResponse {
  success: boolean;
  message: string;
  data?: MessagePayload;
}

interface MessageListResponse {
  success: boolean;
  message: string;
  data?: MessagePayload[];
}

interface DownloadAttachmentResponse {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
  };
}

interface DeleteMessageResponse {
  success: boolean;
  message: string;
  data?: { messageId: string };
}

interface DeleteMessagesBulkResponse {
  success: boolean;
  message: string;
  data?: { deletedCount: number; messageIds: string[] };
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
  token: string,
  init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  if (!token) {
    return { ok: false, message: 'Authentication token is missing' };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {})
      }
    });
  } catch {
    return {
      ok: false,
      message: `Unable to reach message server at ${API_BASE_URL}. Ensure backend is running.`
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

function mapApiMessage(payload: MessagePayload, currentUserEmail: string): ChatMessage {
  const text = payload.text ?? (payload.messageType === 'attachment' ? '[Attachment]' : '');
  return {
    id: payload.id,
    type: payload.senderEmail.toLowerCase() === currentUserEmail.toLowerCase() ? 'user' : 'bot',
    senderEmail: payload.senderEmail,
    messageType: payload.messageType,
    text,
    gifUrl: payload.gifUrl,
    reactions: payload.reactions,
    attachment: payload.attachment,
    forwardedFromMessageId: payload.forwardedFromMessageId,
    createdAt: payload.createdAt
  };
}

export async function listMessages(
  token: string,
  roomCode: string,
  currentUserEmail: string
): Promise<{ ok: true; messages: ChatMessage[] } | { ok: false; message: string }> {
  const result = await request<MessageListResponse>(
    `/messages?roomCode=${encodeURIComponent(roomCode)}&limit=100`,
    token,
    { method: 'GET' }
  );
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    messages: (result.data.data ?? []).map((item) => mapApiMessage(item, currentUserEmail))
  };
}

export async function sendTextMessage(
  token: string,
  roomCode: string,
  text: string,
  currentUserEmail: string
): Promise<{ ok: true; message: ChatMessage } | { ok: false; message: string }> {
  const result = await request<MessageApiResponse>('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({
      roomCode,
      messageType: 'text',
      text
    })
  });
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid message response from server' } : result;
  }
  return { ok: true, message: mapApiMessage(result.data.data, currentUserEmail) };
}

export async function sendGifMessage(
  token: string,
  roomCode: string,
  gifUrl: string,
  currentUserEmail: string
): Promise<{ ok: true; message: ChatMessage } | { ok: false; message: string }> {
  const result = await request<MessageApiResponse>('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({
      roomCode,
      messageType: 'gif',
      gifUrl
    })
  });
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid GIF response from server' } : result;
  }
  return { ok: true, message: mapApiMessage(result.data.data, currentUserEmail) };
}

export async function sendAttachmentMessage(
  token: string,
  roomCode: string,
  fileName: string,
  mimeType: string,
  dataBase64: string,
  currentUserEmail: string
): Promise<{ ok: true; message: ChatMessage } | { ok: false; message: string }> {
  const result = await request<MessageApiResponse>('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({
      roomCode,
      messageType: 'attachment',
      attachment: { fileName, mimeType, dataBase64 }
    })
  });
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid attachment response from server' } : result;
  }
  return { ok: true, message: mapApiMessage(result.data.data, currentUserEmail) };
}

export async function toggleReaction(
  token: string,
  roomCode: string,
  messageId: string,
  emoji: string,
  currentUserEmail: string
): Promise<{ ok: true; message: ChatMessage } | { ok: false; message: string }> {
  const result = await request<MessageApiResponse>(`/messages/${messageId}/reactions`, token, {
    method: 'POST',
    body: JSON.stringify({ roomCode, emoji })
  });
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid reaction response from server' } : result;
  }
  return { ok: true, message: mapApiMessage(result.data.data, currentUserEmail) };
}

export async function forwardMessage(
  token: string,
  roomCode: string,
  messageId: string,
  currentUserEmail: string
): Promise<{ ok: true; message: ChatMessage } | { ok: false; message: string }> {
  const result = await request<MessageApiResponse>(`/messages/${messageId}/forward`, token, {
    method: 'POST',
    body: JSON.stringify({ roomCode })
  });
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid forward response from server' } : result;
  }
  return { ok: true, message: mapApiMessage(result.data.data, currentUserEmail) };
}

export async function downloadAttachment(
  token: string,
  roomCode: string,
  messageId: string
): Promise<
  | { ok: true; fileName: string; mimeType: string; dataBase64: string }
  | { ok: false; message: string }
> {
  const result = await request<DownloadAttachmentResponse>(
    `/messages/${messageId}/attachments/download`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ roomCode })
    }
  );
  if (!result.ok || !result.data.data) {
    return result.ok ? { ok: false, message: 'Invalid download response from server' } : result;
  }
  return {
    ok: true,
    fileName: result.data.data.fileName,
    mimeType: result.data.data.mimeType,
    dataBase64: result.data.data.dataBase64
  };
}

export async function deleteMessageById(
  token: string,
  roomCode: string,
  messageId: string
): Promise<{ ok: true; messageId: string } | { ok: false; message: string }> {
  const result = await request<DeleteMessageResponse>(`/messages/${messageId}`, token, {
    method: 'DELETE',
    body: JSON.stringify({ roomCode })
  });
  if (!result.ok || !result.data.data?.messageId) {
    return result.ok ? { ok: false, message: 'Invalid delete response from server' } : result;
  }
  return { ok: true, messageId: result.data.data.messageId };
}

export async function deleteMessagesBulk(
  token: string,
  roomCode: string,
  messageIds: string[]
): Promise<{ ok: true; messageIds: string[] } | { ok: false; message: string }> {
  const result = await request<DeleteMessagesBulkResponse>('/messages/bulk', token, {
    method: 'DELETE',
    body: JSON.stringify({ roomCode, messageIds })
  });
  if (!result.ok || !result.data.data?.messageIds) {
    return result.ok ? { ok: false, message: 'Invalid bulk delete response from server' } : result;
  }
  return { ok: true, messageIds: result.data.data.messageIds };
}
