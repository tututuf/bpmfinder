import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function digestCode(secret: string, email: string, code: string) {
  return createHmac('sha256', secret).update(`registration:${email}:${code}`).digest('hex');
}

export function privateRateKey(secret: string, value: string) {
  return createHmac('sha256', secret).update(`limit:${value}`).digest('hex');
}

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

// A missing account still incurs the same password derivation work.
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
export async function verifyPassword(password: string, encoded = DUMMY_HASH) {
  const [, salt, hash] = encoded.split('$');
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded)) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
