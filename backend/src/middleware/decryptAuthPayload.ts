import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { HTTP } from '../utils/httpStatus.js';
import { decryptPayloadValue } from '../utils/payloadCrypto.js';

const DECRYPTABLE_FIELDS = ['password', 'confirmPassword', 'roomCode'] as const;

function isEncryptedPayload(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('enc:');
}

export const decryptAuthPayload: RequestHandler = (req, _res, next) => {
  try {
    for (const fieldName of DECRYPTABLE_FIELDS) {
      const fieldValue = (req.body as Record<string, unknown> | undefined)?.[fieldName];
      if (!isEncryptedPayload(fieldValue)) {
        continue;
      }

      (req.body as Record<string, unknown>)[fieldName] = decryptPayloadValue(fieldValue);
    }

    next();
  } catch {
    next(new AppError('Invalid encrypted auth payload', HTTP.BAD_REQUEST));
  }
};
