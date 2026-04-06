import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { ChatRoom } from '../models/ChatRoom.js';
import { User } from '../models/User.js';
import { verifyAuthToken } from '../utils/token.js';

type SocketUser = {
  userId: string;
  email: string;
};

const ROOM_PREFIX = 'room:';

let io: Server | null = null;
const socketUsers = new Map<string, SocketUser>();
const onlineEmails = new Set<string>();

function toRoomChannel(roomCode: string): string {
  return `${ROOM_PREFIX}${roomCode.toUpperCase()}`;
}

async function emitRoomPresence(roomCode: string): Promise<void> {
  if (!io) {
    return;
  }

  const room = await ChatRoom.findOne({ roomCode: roomCode.toUpperCase() });
  if (!room) {
    return;
  }

  const onlineMemberEmails = room.memberEmails.filter((email) => onlineEmails.has(email.toLowerCase()));
  io.to(toRoomChannel(room.roomCode)).emit('room:presence', {
    roomCode: room.roomCode,
    onlineMemberEmails,
    onlineCount: onlineMemberEmails.length,
    memberEmails: room.memberEmails
  });
}

async function updateGlobalPresenceForEmail(email: string): Promise<void> {
  const hasAnySocket = Array.from(socketUsers.values()).some((item) => item.email === email);
  if (hasAnySocket) {
    onlineEmails.add(email);
  } else {
    onlineEmails.delete(email);
  }

  if (!io) {
    return;
  }

  const rooms = await ChatRoom.find({ memberEmails: email }).select('roomCode');
  await Promise.all(rooms.map((room) => emitRoomPresence(room.roomCode)));
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers.authorization?.toString();
      const token = typeof authToken === 'string'
        ? authToken
        : headerToken?.startsWith('Bearer ')
          ? headerToken.slice('Bearer '.length)
          : null;

      if (!token) {
        return next(new Error('Authentication token is missing'));
      }

      const payload = verifyAuthToken(token);
      const userId = typeof payload.sub === 'string' ? payload.sub : null;
      if (!userId) {
        return next(new Error('Invalid authentication token'));
      }

      const user = await User.findById(userId).select('email');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = { userId, email: user.email.toLowerCase() };
      return next();
    } catch {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user as SocketUser;
    socketUsers.set(socket.id, user);
    await updateGlobalPresenceForEmail(user.email);

    socket.on('room:join', async (payload: { roomCode?: string }) => {
      const roomCode = payload?.roomCode?.trim().toUpperCase();
      if (!roomCode) {
        return;
      }

      const room = await ChatRoom.findOne({ roomCode });
      if (!room || !room.memberEmails.includes(user.email)) {
        socket.emit('room:error', { message: 'Not allowed to join this room' });
        return;
      }

      await socket.join(toRoomChannel(roomCode));
      await emitRoomPresence(roomCode);
    });

    socket.on('room:leave', async (payload: { roomCode?: string }) => {
      const roomCode = payload?.roomCode?.trim().toUpperCase();
      if (!roomCode) {
        return;
      }
      await socket.leave(toRoomChannel(roomCode));
      await emitRoomPresence(roomCode);
    });

    socket.on('room:typing', async (payload: { roomCode?: string; isTyping?: boolean }) => {
      const roomCode = payload?.roomCode?.trim().toUpperCase();
      if (!roomCode) {
        return;
      }

      const room = await ChatRoom.findOne({ roomCode });
      if (!room || !room.memberEmails.includes(user.email)) {
        return;
      }

      socket.to(toRoomChannel(roomCode)).emit('room:typing', {
        roomCode,
        email: user.email,
        isTyping: Boolean(payload?.isTyping)
      });
    });

    socket.on('disconnect', async () => {
      socketUsers.delete(socket.id);
      await updateGlobalPresenceForEmail(user.email);
    });
  });

  return io;
}

export function emitRoomEvent(roomCode: string, eventName: string, payload: unknown): void {
  if (!io) {
    return;
  }
  io.to(toRoomChannel(roomCode)).emit(eventName, payload);
}
