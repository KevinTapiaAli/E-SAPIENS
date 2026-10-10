import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { compare } from 'bcryptjs';

export function hashPassword(password: string): Promise<string> {
  // Algorithm 2 is Argon2id (the dependency exports an ambient const enum).
  return hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  encoded: string,
  password: string,
): Promise<boolean> {
  try {
    if (encoded.startsWith('$argon2id$'))
      return await verify(encoded, password);
    if (/^\$2[aby]\$/.test(encoded)) {
      // bcrypt truncates after 72 bytes; do not upgrade an ambiguous long password.
      if (Buffer.byteLength(password, 'utf8') > 72) return false;
      return await compare(password, encoded.replace(/^\$2y\$/, '$2b$'));
    }
    return false;
  } catch {
    return false;
  }
}

// Equal-cost verification for an unknown account, without a hardcoded password.
export const dummyPasswordHash = () =>
  hashPassword(randomBytes(32).toString('hex'));
