import crypto from 'node:crypto';

/**
 * Service for cryptographic token generation and secure hashing
 */
export class TokenService {
  /**
   * Generates a high-entropy cryptographically secure random token (hex string)
   * Default: 32 bytes = 256 bits of entropy
   */
  public static generateRandomToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Computes a deterministic SHA-256 hash of an opaque token for safe database persistence
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Constant-time comparison of two strings to prevent timing side-channel attacks
   */
  public static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
