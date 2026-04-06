import mongoose from 'mongoose';
import { COLLECTION_NAMES } from '../constants/collectionNames.js';

export type MessageType = 'text' | 'gif' | 'attachment' | 'forward';

export interface MessageReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId;
}

export interface MessageSeen {
  userId: mongoose.Types.ObjectId;
  seenAt: Date;
}

export interface MessageAttachment {
  encryptedFileName: string;
  encryptedMimeType: string;
  encryptedData: string | null;
  sizeBytes: number;
  deletedAt: Date | null;
  downloadedBy: mongoose.Types.ObjectId[];
}

export interface MessageDocument {
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderEmail: string;
  messageType: MessageType;
  encryptedText: string | null;
  encryptedGifUrl: string | null;
  attachment: MessageAttachment | null;
  forwardedFromMessageId: mongoose.Types.ObjectId | null;
  reactions: MessageReaction[];
  seenBy: MessageSeen[];
  expireAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new mongoose.Schema<MessageReaction>(
  {
    emoji: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
  },
  { _id: false }
);

const seenSchema = new mongoose.Schema<MessageSeen>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    seenAt: { type: Date, required: true }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema<MessageAttachment>(
  {
    encryptedFileName: { type: String, required: true },
    encryptedMimeType: { type: String, required: true },
    encryptedData: { type: String, default: null },
    sizeBytes: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
    downloadedBy: { type: [mongoose.Schema.Types.ObjectId], default: [] }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema<MessageDocument>(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ChatRoom', index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    senderEmail: { type: String, required: true, lowercase: true, trim: true },
    messageType: {
      type: String,
      required: true,
      enum: ['text', 'gif', 'attachment', 'forward']
    },
    encryptedText: { type: String, default: null },
    encryptedGifUrl: { type: String, default: null },
    attachment: { type: attachmentSchema, default: null },
    forwardedFromMessageId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Message' },
    reactions: { type: [reactionSchema], default: [] },
    seenBy: { type: [seenSchema], default: [] },
    expireAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Message = mongoose.model<MessageDocument>('Message', messageSchema, COLLECTION_NAMES.MESSAGES);
