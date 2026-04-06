import { User } from '../models/User.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';
import type { CreateChatRoomBody, JoinChatRoomBody } from '../routes/chatRoom.schemas.js';

function normalizeEmails(emailOne: string, emailTwo: string): [string, string] {
  const first = emailOne.trim().toLowerCase();
  const second = emailTwo.trim().toLowerCase();
  return [first, second].sort() as [string, string];
}

function buildMemberKey(memberEmails: [string, string]): string {
  return `${memberEmails[0]}::${memberEmails[1]}`;
}

function createRoomCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueRoomCode(): Promise<string> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const roomCode = createRoomCode();
    const exists = await ChatRoom.exists({ roomCode });
    if (!exists) {
      return roomCode;
    }
  }

  throw new AppError('Unable to generate unique room code. Please retry.', HTTP.INTERNAL_SERVER_ERROR);
}

function buildRoomResponse(room: {
  _id: { toString: () => string };
  roomName: string;
  roomCode: string;
  memberEmails: [string, string];
  joinedMemberEmails: string[];
  createdAt: Date;
}) {
  return {
    id: room._id.toString(),
    roomName: room.roomName,
    roomCode: room.roomCode,
    memberEmails: room.memberEmails,
    joinedMemberEmails: room.joinedMemberEmails,
    createdAt: room.createdAt
  };
}

export const createChatRoom = asyncHandler(async (req, res) => {
  const authUserId = req.authUserId;
  if (!authUserId) {
    throw new AppError('Authentication token is missing', HTTP.UNAUTHORIZED);
  }

  const creator = await User.findById(authUserId);
  if (!creator) {
    throw new AppError('User not found', HTTP.UNAUTHORIZED);
  }

  const { roomName, emailOne, emailTwo } = req.validated.body as CreateChatRoomBody;
  const normalizedRoomName = roomName.trim().toLowerCase();
  const memberEmails = normalizeEmails(emailOne, emailTwo);

  const users = await User.find({ email: { $in: memberEmails } }).select('email');
  if (users.length !== 2) {
    const existingEmails = new Set(users.map((item) => item.email.toLowerCase()));
    const missingEmails = memberEmails.filter((email) => !existingEmails.has(email));

    throw new AppError(
      `These emails are not signed up: ${missingEmails.join(', ')}`,
      HTTP.BAD_REQUEST
    );
  }

  const memberKey = buildMemberKey(memberEmails);
  const existingByRoomName = await ChatRoom.findOne({ roomName: normalizedRoomName });
  if (existingByRoomName) {
    throw new AppError('Room name already taken', HTTP.CONFLICT);
  }

  const existingRoom = await ChatRoom.findOne({ memberKey });
  if (existingRoom) {
    return res.status(HTTP.OK).json({
      success: true,
      message: 'Chat room already exists',
      data: buildRoomResponse(existingRoom)
    });
  }

  const creatorEmail = creator.email.toLowerCase();
  if (!memberEmails.includes(creatorEmail)) {
    throw new AppError('Authenticated user must be one of the room members', HTTP.FORBIDDEN);
  }

  const roomCode = await generateUniqueRoomCode();
  const room = await ChatRoom.create({
    roomName: normalizedRoomName,
    roomCode,
    memberKey,
    memberEmails,
    joinedMemberEmails: [creatorEmail],
    createdBy: creator._id
  });

  return res.status(HTTP.CREATED).json({
    success: true,
    message: 'Chat room created successfully',
    data: buildRoomResponse(room)
  });
});

export const joinChatRoom = asyncHandler(async (req, res) => {
  const authUserId = req.authUserId;
  if (!authUserId) {
    throw new AppError('Authentication token is missing', HTTP.UNAUTHORIZED);
  }

  const user = await User.findById(authUserId).select('email');
  if (!user) {
    throw new AppError('User not found', HTTP.UNAUTHORIZED);
  }

  const { roomCode } = req.validated.body as JoinChatRoomBody;
  const room = await ChatRoom.findOne({ roomCode });
  if (!room) {
    throw new AppError('Room not found for this code', HTTP.NOT_FOUND);
  }

  const userEmail = user.email.toLowerCase();
  if (!room.memberEmails.includes(userEmail)) {
    throw new AppError('You are not allowed to join this room', HTTP.FORBIDDEN);
  }

  if (!room.joinedMemberEmails.includes(userEmail)) {
    room.joinedMemberEmails.push(userEmail);
    await room.save();
  }

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Joined room successfully',
    data: buildRoomResponse(room)
  });
});
