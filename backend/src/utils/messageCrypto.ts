import crypto from 'crypto';
import { env } from '../config/env.js';

const AES_ALGORITHM = 'aes-256-gcm';

function getSecretKey(): Buffer {
  return crypto.createHash('sha256').update(env.AUTH_PAYLOAD_SECRET).digest();
}

export function encryptMessageValue(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, authTag]);
  return `enc:${iv.toString('base64')}:${payload.toString('base64')}`;
}

export function decryptMessageValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith('enc:')) {
    return value;
  }

  const parts = value.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted message format');
  }

  const iv = Buffer.from(parts[1], 'base64');
  const payload = Buffer.from(parts[2], 'base64');
  if (payload.length < 17) {
    throw new Error('Invalid encrypted message payload');
  }

  const authTag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(0, payload.length - 16);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
