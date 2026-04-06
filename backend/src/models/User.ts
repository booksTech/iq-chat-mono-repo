import mongoose from 'mongoose';
import { COLLECTION_NAMES } from '../constants/collectionNames.js';

export interface UserDocument {
  email: string;
  passwordHash: string;
  resetPasswordTokenHash: string | null;
  resetPasswordExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = mongoose.model<UserDocument>('User', userSchema, COLLECTION_NAMES.USERS);
