import crypto from 'crypto';
import { env } from '../config/env.js';

const AES_ALGORITHM = 'aes-256-gcm';

function getSecretKey(): Buffer {
  return crypto.createHash('sha256').update(env.AUTH_PAYLOAD_SECRET).digest();
}

// format: enc:<ivBase64>:<cipherTagBase64>
export function decryptPayloadValue(value: string): string {
  if (!value.startsWith('enc:')) {
    return value;
  }

  const parts = value.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(parts[1], 'base64');
  const cipherTag = Buffer.from(parts[2], 'base64');

  if (cipherTag.length < 17) {
    throw new Error('Invalid encrypted payload content');
  }

  const authTag = cipherTag.subarray(cipherTag.length - 16);
  const ciphertext = cipherTag.subarray(0, cipherTag.length - 16);

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
