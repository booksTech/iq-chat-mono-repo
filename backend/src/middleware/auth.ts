import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';
import { verifyAuthToken } from '../utils/token.js';

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      throw new AppError('Authentication token is missing', HTTP.UNAUTHORIZED);
    }

    const payload = verifyAuthToken(token);
    const userId = typeof payload.sub === 'string' ? payload.sub : null;

    if (!userId) {
      throw new AppError('Invalid authentication token', HTTP.UNAUTHORIZED);
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      throw new AppError('User no longer exists', HTTP.UNAUTHORIZED);
    }

    req.authUserId = userId;
    next();
  } catch (error) {
    next(error);
  }
}
