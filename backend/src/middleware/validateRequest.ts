import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';

export function validateRequest(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        return next(new AppError('Validation failed', HTTP.BAD_REQUEST, details));
      }
      return next(error);
    }
  };
}
