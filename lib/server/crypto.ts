import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const NONCE_SIZE = 12;
const TAG_SIZE = 16;

function deriveKey(secret: string): Buffer {
  if (!secret.trim()) {
    throw new Error('notes encrypt key is empty');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptInt64(secret: string, value: number): string {
  const key = deriveKey(secret);
  const nonce = randomBytes(NONCE_SIZE);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const plaintext = Buffer.from(String(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([nonce, ciphertext, tag]);
  // Go's base64.RawStdEncoding = standard alphabet, no padding.
  return payload.toString('base64').replace(/=+$/, '');
}

export function decryptInt64(secret: string, token: string): number {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('encrypted amount is empty');
  }

  const key = deriveKey(secret);
  const payload = Buffer.from(trimmed, 'base64');
  if (payload.length < NONCE_SIZE + TAG_SIZE) {
    throw new Error('encrypted amount payload is invalid');
  }

  const nonce = payload.subarray(0, NONCE_SIZE);
  const tag = payload.subarray(payload.length - TAG_SIZE);
  const ciphertext = payload.subarray(NONCE_SIZE, payload.length - TAG_SIZE);

  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  const value = Number.parseInt(plaintext.toString('utf8'), 10);
  if (Number.isNaN(value)) {
    throw new Error('decrypted amount is not a number');
  }
  return value;
}
