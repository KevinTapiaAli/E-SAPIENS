import { createHash } from 'node:crypto';

/** Attribution only. Never used for authentication or authorization. */
export function visitorDigest(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
    ? createHash('sha256').update(value).digest('hex')
    : null;
}
