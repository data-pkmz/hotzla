import { createHash } from 'crypto';

/**
 * Computes a SHA-256 cryptographic hash of a raw token string.
 * This ensures tokens stored in the database cannot be abused
 * if the database contents are leaked.
 *
 * @param token - The raw plaintext token.
 * @returns The 64-character hex-encoded SHA-256 hash.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
