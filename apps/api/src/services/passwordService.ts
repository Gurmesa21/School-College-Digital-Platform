import bcryptjs from 'bcryptjs';

/**
 * Service for secure password hashing and verification
 * Uses bcrypt with standard salt rounds (12)
 */
export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a plaintext password securely
   */
  public static async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    return bcryptjs.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash in constant time
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    try {
      return await bcryptjs.compare(password, hash);
    } catch {
      return false;
    }
  }
}
