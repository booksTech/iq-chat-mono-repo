import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';
import { generateRawToken, hashToken, signAuthToken } from '../utils/token.js';
import type { UserDocument } from '../models/User.js';
import type {
  ForgotPasswordBody,
  ResetPasswordBody,
  SigninBody,
  SignupBody
} from '../routes/auth.schemas.js';

function buildAuthResponse(user: HydratedDocument<UserDocument>) {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt
  };
}

function setAuthCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body as SignupBody;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email is already registered', HTTP.CONFLICT);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });

  const token = signAuthToken(user._id.toString());
  setAuthCookie(res, token);

  return res.status(HTTP.CREATED).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: buildAuthResponse(user),
      token
    }
  });
});

export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body as SigninBody;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password', HTTP.UNAUTHORIZED);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', HTTP.UNAUTHORIZED);
  }

  const token = signAuthToken(user._id.toString());
  setAuthCookie(res, token);

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      user: buildAuthResponse(user),
      token
    }
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.validated.body as ForgotPasswordBody;

  const user = await User.findOne({ email }).select('+resetPasswordTokenHash +resetPasswordExpiresAt');
  if (user) {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${env.CLIENT_URL}?resetToken=${rawToken}`;
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  }

  return res.status(HTTP.OK).json({
    success: true,
    message: 'If an account exists, a reset link has been sent.'
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.validated.body as ResetPasswordBody;

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() }
  }).select('+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt');

  if (!user) {
    throw new AppError('Invalid or expired reset token', HTTP.BAD_REQUEST);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Password reset successful. Please sign in again.'
  });
});

export const signout = asyncHandler(async (_req, res) => {
  res.clearCookie('access_token');
  return res.status(HTTP.OK).json({
    success: true,
    message: 'Signed out successfully'
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.authUserId;
  if (!userId) {
    throw new AppError('Authentication token is missing', HTTP.UNAUTHORIZED);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP.UNAUTHORIZED);
  }

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: buildAuthResponse(user)
    }
  });
});
