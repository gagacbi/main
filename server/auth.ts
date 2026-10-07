import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(pw, salt, 32).toString('hex');
  return { salt, hash };
}
export function verifyPassword(pw: string, salt: string, hash: string) {
  const h = scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, 'hex');
  return h.length === b.length && timingSafeEqual(h, b);
}
export const NAME_RE = /^[\p{L}\p{N}_ -]{3,16}$/u;
