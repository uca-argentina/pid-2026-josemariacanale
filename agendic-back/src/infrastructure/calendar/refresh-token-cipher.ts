import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

/** Cifra el refresh token con AES-256-GCM; el resultado es `iv.tag.texto`, cada parte en base64. */
export function encryptRefreshToken(token: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const text = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), text]
    .map((part) => part.toString('base64'))
    .join('.');
}

/**
 * Descifra lo que dejó {@link encryptRefreshToken}.
 *
 * @throws {Error} la clave no es la que cifró, o el texto fue alterado
 */
export function decryptRefreshToken(encrypted: string, key: Buffer): string {
  const [iv, tag, text] = encrypted
    .split('.')
    .map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(text), decipher.final()]).toString(
    'utf8',
  );
}
