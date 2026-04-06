import { io, type Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api/v1';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(resolveSocketUrl(), {
    transports: ['websocket', 'polling'],
    auth: { token },
    withCredentials: true
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) {
    return;
  }
  socket.disconnect();
  socket = null;
}
