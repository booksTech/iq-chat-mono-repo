import mongoose from 'mongoose';
import { COLLECTION_NAMES } from '../constants/collectionNames.js';

export interface ChatRoomDocument {
  roomName: string;
  roomCode: string;
  memberKey: string;
  memberEmails: [string, string];
  joinedMemberEmails: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatRoomSchema = new mongoose.Schema<ChatRoomDocument>(
  {
    roomName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    roomCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true
    },
    memberKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    memberEmails: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length === 2,
        message: 'memberEmails must contain exactly two members'
      }
    },
    joinedMemberEmails: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const ChatRoom = mongoose.model<ChatRoomDocument>(
  'ChatRoom',
  chatRoomSchema,
  COLLECTION_NAMES.CHAT_ROOMS
);
