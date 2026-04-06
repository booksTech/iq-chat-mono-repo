import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('Route not found', HTTP.NOT_FOUND));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(HTTP.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {})
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(HTTP.BAD_REQUEST).json({
      success: false,
      message: 'Invalid resource identifier'
    });
  }

  if (err?.code === 11000) {
    if (err?.keyPattern?.roomName) {
      return res.status(HTTP.CONFLICT).json({
        success: false,
        message: 'Room name already taken'
      });
    }

    return res.status(HTTP.CONFLICT).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  console.error(err);
  return res.status(HTTP.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Something went wrong'
  });
};
