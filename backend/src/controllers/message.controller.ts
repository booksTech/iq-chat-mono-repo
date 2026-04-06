import mongoose from 'mongoose';
import { ChatRoom } from '../models/ChatRoom.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import type { MessageDocument } from '../models/Message.js';
import type { HydratedDocument } from 'mongoose';
import {
  decryptMessageValue,
  encryptMessageValue
} from '../utils/messageCrypto.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';
import { emitRoomEvent } from '../socket/index.js';
import type {
  DeleteMessageBody,
  DeleteMessagesBulkBody,
  DownloadAttachmentBody,
  ForwardMessageBody,
  ListMessagesQuery,
  MarkSeenBody,
  ReactMessageBody,
  SendMessageBody
} from '../routes/message.schemas.js';

const MESSAGE_TTL_AFTER_ALL_SEEN_MS = 1 * 60 * 1000;
const ATTACHMENT_TTL_AFTER_SEEN_MS = 5 * 60 * 1000;

async function requireAuthContext(authUserId: string | undefined): Promise<{ userId: mongoose.Types.ObjectId; userEmail: string }> {
  if (!authUserId) {
    throw new AppError('Authentication token is missing', HTTP.UNAUTHORIZED);
  }

  const user = await User.findById(authUserId).select('email');
  if (!user) {
    throw new AppError('User not found', HTTP.UNAUTHORIZED);
  }

  return {
    userId: user._id,
    userEmail: user.email.toLowerCase()
  };
}

async function getAuthorizedRoom(roomCode: string, userEmail: string) {
  const room = await ChatRoom.findOne({ roomCode });
  if (!room) {
    throw new AppError('Room not found for this code', HTTP.NOT_FOUND);
  }

  if (!room.memberEmails.includes(userEmail)) {
    throw new AppError('You are not allowed to access this room', HTTP.FORBIDDEN);
  }

  return room;
}

function memberSeenAt(message: HydratedDocument<MessageDocument>, userId: mongoose.Types.ObjectId): Date | null {
  const found = message.seenBy.find((seen) => seen.userId.toString() === userId.toString());
  return found?.seenAt ?? null;
}

function ensureSeen(message: HydratedDocument<MessageDocument>, userId: mongoose.Types.ObjectId): void {
  const existing = message.seenBy.find((seen) => seen.userId.toString() === userId.toString());
  if (existing) {
    existing.seenAt = new Date();
    return;
  }
  message.seenBy.push({ userId, seenAt: new Date() });
}

function maybeSetMessageExpiry(message: HydratedDocument<MessageDocument>, roomMemberCount: number): void {
  if (message.expireAt || message.seenBy.length < roomMemberCount) {
    return;
  }

  message.expireAt = new Date(Date.now() + MESSAGE_TTL_AFTER_ALL_SEEN_MS);
}

function maybeDeleteAttachment(
  message: HydratedDocument<MessageDocument>,
  roomMemberIds: mongoose.Types.ObjectId[]
): boolean {
  if (!message.attachment || message.attachment.deletedAt) {
    return false;
  }

  const everyoneSeen = roomMemberIds.every((memberId) => memberSeenAt(message, memberId));
  if (!everyoneSeen) {
    return false;
  }

  const latestSeenAt = message.seenBy.reduce<Date>(
    (latest, current) => (current.seenAt > latest ? current.seenAt : latest),
    new Date(0)
  );
  const canDelete = Date.now() - latestSeenAt.getTime() >= ATTACHMENT_TTL_AFTER_SEEN_MS;
  if (!canDelete) {
    return false;
  }

  message.attachment.encryptedData = null;
  message.attachment.deletedAt = new Date();
  return true;
}

function serializeMessage(message: HydratedDocument<MessageDocument>) {
  return {
    id: message._id.toString(),
    roomId: message.roomId.toString(),
    senderId: message.senderId.toString(),
    senderEmail: message.senderEmail,
    messageType: message.messageType,
    text: decryptMessageValue(message.encryptedText),
    gifUrl: decryptMessageValue(message.encryptedGifUrl),
    attachment: message.attachment
      ? {
          fileName: decryptMessageValue(message.attachment.encryptedFileName),
          mimeType: decryptMessageValue(message.attachment.encryptedMimeType),
          hasData: Boolean(message.attachment.encryptedData),
          sizeBytes: message.attachment.sizeBytes,
          deletedAt: message.attachment.deletedAt
        }
      : null,
    forwardedFromMessageId: message.forwardedFromMessageId?.toString() ?? null,
    reactions: message.reactions.map((item) => ({
      emoji: item.emoji,
      userId: item.userId.toString()
    })),
    seenBy: message.seenBy.map((item) => ({
      userId: item.userId.toString(),
      seenAt: item.seenAt
    })),
    createdAt: message.createdAt
  };
}

export const sendMessage = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { roomCode, messageType, text, gifUrl, attachment, forwardMessageId } =
    req.validated.body as SendMessageBody;

  const room = await getAuthorizedRoom(roomCode, userEmail);

  let encryptedText: string | null = null;
  let encryptedGifUrl: string | null = null;
  let forwardedFromMessageId: mongoose.Types.ObjectId | null = null;
  let attachmentValue: MessageDocument['attachment'] = null;

  if (messageType === 'text' && text) {
    encryptedText = encryptMessageValue(text);
  }

  if (messageType === 'gif' && gifUrl) {
    encryptedGifUrl = encryptMessageValue(gifUrl);
  }

  if (messageType === 'attachment' && attachment) {
    attachmentValue = {
      encryptedFileName: encryptMessageValue(attachment.fileName),
      encryptedMimeType: encryptMessageValue(attachment.mimeType),
      encryptedData: encryptMessageValue(attachment.dataBase64),
      sizeBytes: Math.floor((attachment.dataBase64.length * 3) / 4),
      deletedAt: null,
      downloadedBy: []
    };
  }

  if (messageType === 'forward' && forwardMessageId) {
    if (!mongoose.Types.ObjectId.isValid(forwardMessageId)) {
      throw new AppError('Invalid forward message id', HTTP.BAD_REQUEST);
    }
    const sourceMessage = await Message.findOne({
      _id: forwardMessageId,
      roomId: room._id
    });
    if (!sourceMessage) {
      throw new AppError('Source message not found in room', HTTP.NOT_FOUND);
    }

    forwardedFromMessageId = sourceMessage._id;
    encryptedText = sourceMessage.encryptedText;
    encryptedGifUrl = sourceMessage.encryptedGifUrl;
    attachmentValue = sourceMessage.attachment
      ? {
          encryptedFileName: sourceMessage.attachment.encryptedFileName,
          encryptedMimeType: sourceMessage.attachment.encryptedMimeType,
          encryptedData: sourceMessage.attachment.encryptedData,
          sizeBytes: sourceMessage.attachment.sizeBytes,
          deletedAt: sourceMessage.attachment.deletedAt,
          downloadedBy: [...sourceMessage.attachment.downloadedBy]
        }
      : null;
  }

  const created = await Message.create({
    roomId: room._id,
    senderId: userId,
    senderEmail: userEmail,
    messageType,
    encryptedText,
    encryptedGifUrl,
    attachment: attachmentValue,
    forwardedFromMessageId,
    reactions: [],
    seenBy: [{ userId, seenAt: new Date() }],
    expireAt: null
  });

  const serialized = serializeMessage(created);
  emitRoomEvent(room.roomCode, 'message:new', serialized);

  return res.status(HTTP.CREATED).json({
    success: true,
    message: 'Message sent successfully',
    data: serialized
  });
});

export const listMessages = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { roomCode, limit } = req.validated.query as ListMessagesQuery;
  const room = await getAuthorizedRoom(roomCode, userEmail);
  const roomMemberUsers = await User.find({ email: { $in: room.memberEmails } }).select('_id');
  const roomMemberIds = roomMemberUsers.map((user) => user._id);

  const messages = await Message.find({ roomId: room._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  const updates: Array<Promise<unknown>> = [];
  for (const message of messages) {
    ensureSeen(message, userId);
    maybeSetMessageExpiry(message, room.memberEmails.length);
    const changedAttachment = maybeDeleteAttachment(message, roomMemberIds);
    if (changedAttachment || message.isModified('seenBy') || message.isModified('expireAt')) {
      updates.push(message.save());
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Messages fetched successfully',
    data: messages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => serializeMessage(item))
  });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { messageId } = req.params as { messageId: string };
  const { roomCode, emoji } = req.validated.body as ReactMessageBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);

  const message = await Message.findOne({ _id: messageId, roomId: room._id });
  if (!message) {
    throw new AppError('Message not found in this room', HTTP.NOT_FOUND);
  }

  const existingReactionIndex = message.reactions.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );
  if (existingReactionIndex >= 0) {
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({ userId, emoji });
  }

  await message.save();
  const serialized = serializeMessage(message);
  emitRoomEvent(room.roomCode, 'message:update', serialized);

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Reaction updated',
    data: serialized
  });
});

export const markMessageSeen = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { messageId } = req.params as { messageId: string };
  const { roomCode } = req.validated.body as MarkSeenBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);
  const roomMemberUsers = await User.find({ email: { $in: room.memberEmails } }).select('_id');
  const roomMemberIds = roomMemberUsers.map((user) => user._id);

  const message = await Message.findOne({ _id: messageId, roomId: room._id });
  if (!message) {
    throw new AppError('Message not found in this room', HTTP.NOT_FOUND);
  }

  ensureSeen(message, userId);
  maybeSetMessageExpiry(message, room.memberEmails.length);
  maybeDeleteAttachment(message, roomMemberIds);
  await message.save();
  const serialized = serializeMessage(message);
  emitRoomEvent(room.roomCode, 'message:update', serialized);

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Message marked as seen',
    data: serialized
  });
});

export const forwardMessage = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { messageId } = req.params as { messageId: string };
  const { roomCode } = req.validated.body as ForwardMessageBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);

  const sourceMessage = await Message.findOne({ _id: messageId, roomId: room._id });
  if (!sourceMessage) {
    throw new AppError('Message not found in this room', HTTP.NOT_FOUND);
  }

  const forwarded = await Message.create({
    roomId: room._id,
    senderId: userId,
    senderEmail: userEmail,
    messageType: 'forward',
    encryptedText: sourceMessage.encryptedText,
    encryptedGifUrl: sourceMessage.encryptedGifUrl,
    attachment: sourceMessage.attachment,
    forwardedFromMessageId: sourceMessage._id,
    reactions: [],
    seenBy: [{ userId, seenAt: new Date() }],
    expireAt: null
  });
  const serialized = serializeMessage(forwarded);
  emitRoomEvent(room.roomCode, 'message:new', serialized);

  return res.status(HTTP.CREATED).json({
    success: true,
    message: 'Message forwarded successfully',
    data: serialized
  });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { messageId } = req.params as { messageId: string };
  const { roomCode } = req.validated.body as DownloadAttachmentBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);

  const message = await Message.findOne({ _id: messageId, roomId: room._id });
  if (!message || !message.attachment) {
    throw new AppError('Attachment not found', HTTP.NOT_FOUND);
  }

  if (!message.attachment.encryptedData) {
    throw new AppError('Attachment is no longer available', HTTP.GONE);
  }

  const dataBase64 = decryptMessageValue(message.attachment.encryptedData);
  const fileName = decryptMessageValue(message.attachment.encryptedFileName);
  const mimeType = decryptMessageValue(message.attachment.encryptedMimeType);

  if (!dataBase64 || !fileName || !mimeType) {
    throw new AppError('Attachment is corrupted', HTTP.INTERNAL_SERVER_ERROR);
  }

  const hasDownloaded = message.attachment.downloadedBy.some(
    (item) => item.toString() === userId.toString()
  );
  if (!hasDownloaded) {
    message.attachment.downloadedBy.push(userId);
  }

  message.attachment.encryptedData = null;
  message.attachment.deletedAt = new Date();
  await message.save();
  emitRoomEvent(room.roomCode, 'message:update', serializeMessage(message));

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Attachment downloaded',
    data: {
      fileName,
      mimeType,
      dataBase64
    }
  });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { messageId } = req.params as { messageId: string };
  const { roomCode } = req.validated.body as DeleteMessageBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);

  const message = await Message.findOne({ _id: messageId, roomId: room._id });
  if (!message) {
    throw new AppError('Message not found in this room', HTTP.NOT_FOUND);
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError('You can only delete your own messages', HTTP.FORBIDDEN);
  }

  await Message.deleteOne({ _id: message._id });
  emitRoomEvent(room.roomCode, 'message:deleted', { messageId: message._id.toString() });

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Message deleted successfully',
    data: {
      messageId: message._id.toString()
    }
  });
});

export const deleteMessagesBulk = asyncHandler(async (req, res) => {
  const { userId, userEmail } = await requireAuthContext(req.authUserId);
  const { roomCode, messageIds } = req.validated.body as DeleteMessagesBulkBody;
  const room = await getAuthorizedRoom(roomCode, userEmail);

  const uniqueIds = Array.from(new Set(messageIds));
  const messages = await Message.find({
    _id: { $in: uniqueIds },
    roomId: room._id
  }).select('_id senderId');

  const ownMessageIds = messages
    .filter((message) => message.senderId.toString() === userId.toString())
    .map((message) => message._id.toString());

  if (ownMessageIds.length === 0) {
    throw new AppError('No deletable messages selected', HTTP.BAD_REQUEST);
  }

  await Message.deleteMany({
    _id: { $in: ownMessageIds },
    roomId: room._id
  });

  emitRoomEvent(room.roomCode, 'message:bulkDeleted', { messageIds: ownMessageIds });

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Messages deleted successfully',
    data: {
      deletedCount: ownMessageIds.length,
      messageIds: ownMessageIds
    }
  });
});
