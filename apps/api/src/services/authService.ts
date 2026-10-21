import { User, Session } from '@school/db';
import {
  AuthUser,
  AuthSession,
  SignInDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  EmailVerificationDto,
  normalizeEmail,
  IEmailService,
} from '@school/shared';
import { IAuthRepository } from '../repositories/authRepository.js';
import { PasswordService } from './passwordService.js';
import { TokenService } from './tokenService.js';
import { InMemoryEmailService } from './emailService.js';

export interface SignInResult {
  user: AuthUser;
  rawSessionToken: string;
  expiresAt: Date;
}

export class AuthService {
  private authRepository: IAuthRepository;
  private emailService: IEmailService;
  private sessionTtlMs: number;
  private resetTokenTtlMs: number;

  constructor(
    authRepository: IAuthRepository,
    emailService: IEmailService = new InMemoryEmailService(),
    sessionTtlDays = 7,
    resetTokenTtlMinutes = 60
  ) {
    this.authRepository = authRepository;
    this.emailService = emailService;
    this.sessionTtlMs = sessionTtlDays * 24 * 60 * 60 * 1000;
    this.resetTokenTtlMs = resetTokenTtlMinutes * 60 * 1000;
  }

  public toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  public toAuthSession(session: Session): AuthSession {
    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  /**
   * Authenticates user credentials and establishes a persistent high-entropy session
   */
  public async signIn(
    dto: SignInDto,
    meta: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<SignInResult> {
    const email = normalizeEmail(dto.email);
    const user = await this.authRepository.findUserByEmail(email);

    // Timing attack mitigation: always execute a hash verification comparison
    if (!user) {
      await PasswordService.verifyPassword(
        dto.password,
        '$2a$12$e80MvQ1oD0mHwQ2C2G7k2.k8Wj6Tz/B1X/K.C9H6a3lJk4U6t0gW.'
      );
      const error: any = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    if (user.status === 'SUSPENDED') {
      const error: any = new Error('Account has been suspended. Please contact platform administration.');
      error.code = 'ACCOUNT_SUSPENDED';
      error.statusCode = 403;
      throw error;
    }

    const passwordValid = await PasswordService.verifyPassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      const error: any = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    if (user.status === 'PENDING_VERIFICATION') {
      const error: any = new Error('Please verify your email address before signing in.');
      error.code = 'EMAIL_NOT_VERIFIED';
      error.statusCode = 403;
      throw error;
    }

    // Generate high-entropy session token and persist only its SHA-256 hash
    const rawSessionToken = TokenService.generateRandomToken(32);
    const tokenHash = TokenService.hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.authRepository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      user: this.toAuthUser(user),
      rawSessionToken,
      expiresAt,
    };
  }

  /**
   * Revokes the active session
   */
  public async signOut(rawSessionToken: string | undefined): Promise<void> {
    if (!rawSessionToken) return;

    const tokenHash = TokenService.hashToken(rawSessionToken);
    const session = await this.authRepository.findSessionByTokenHash(tokenHash);
    if (session && !session.revokedAt) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  /**
   * Retrieves current authenticated user and session, verifying account active status
   */
  public async getCurrentSession(rawSessionToken: string | undefined): Promise<{ user: AuthUser; session: AuthSession }> {
    if (!rawSessionToken) {
      const error: any = new Error('Authentication required');
      error.code = 'AUTHENTICATION_REQUIRED';
      error.statusCode = 401;
      throw error;
    }

    const tokenHash = TokenService.hashToken(rawSessionToken);
    const sessionRecord = await this.authRepository.findSessionByTokenHash(tokenHash);

    if (!sessionRecord || sessionRecord.revokedAt || sessionRecord.expiresAt <= new Date()) {
      const error: any = new Error('Session is invalid or has expired');
      error.code = 'INVALID_SESSION';
      error.statusCode = 401;
      throw error;
    }

    const user = sessionRecord.user;
    if (user.status !== 'ACTIVE') {
      // Invalidate session immediately if user account was suspended
      await this.authRepository.revokeSession(sessionRecord.id);
      const error: any = new Error('Account is inactive or suspended');
      error.code = 'ACCOUNT_INACTIVE';
      error.statusCode = 403;
      throw error;
    }

    return {
      user: this.toAuthUser(user),
      session: this.toAuthSession(sessionRecord),
    };
  }

  /**
   * Initiates password reset without leaking account existence
   */
  public async requestPasswordReset(dto: PasswordResetRequestDto, tenantName?: string): Promise<void> {
    const email = normalizeEmail(dto.email);
    const user = await this.authRepository.findUserByEmail(email);

    if (user && user.status !== 'SUSPENDED') {
      const rawToken = TokenService.generateRandomToken(32);
      const tokenHash = TokenService.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + this.resetTokenTtlMs);

      await this.authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      await this.emailService.sendPasswordResetEmail(user.email, rawToken, tenantName);
    }
    // Note: If user not found, method silently finishes to prevent account enumeration
  }

  /**
   * Completes password reset, marks token single-use, and invalidates all existing user sessions
   */
  public async confirmPasswordReset(dto: PasswordResetConfirmDto): Promise<void> {
    const tokenHash = TokenService.hashToken(dto.token);
    const tokenRecord = await this.authRepository.findPasswordResetTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
      const error: any = new Error('Password reset token is invalid, expired, or has already been used');
      error.code = 'INVALID_RESET_TOKEN';
      error.statusCode = 400;
      throw error;
    }

    const user = tokenRecord.user;
    if (user.status === 'SUSPENDED') {
      const error: any = new Error('Account is suspended. Unable to reset password.');
      error.code = 'ACCOUNT_SUSPENDED';
      error.statusCode = 403;
      throw error;
    }

    // Hash new password and update
    const newPasswordHash = await PasswordService.hashPassword(dto.newPassword);
    await this.authRepository.updateUserPassword(user.id, newPasswordHash);

    // Mark single-use token consumed
    await this.authRepository.markPasswordResetTokenUsed(tokenRecord.id);

    // Invalidate every existing active session for security
    await this.authRepository.revokeAllUserSessions(user.id);
  }

  /**
   * Completes email verification safely
   */
  public async verifyEmail(dto: EmailVerificationDto): Promise<void> {
    const tokenHash = TokenService.hashToken(dto.token);
    const tokenRecord = await this.authRepository.findEmailVerificationTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
      const error: any = new Error('Email verification token is invalid, expired, or has already been used');
      error.code = 'INVALID_VERIFICATION_TOKEN';
      error.statusCode = 400;
      throw error;
    }

    const user = tokenRecord.user;
    await this.authRepository.updateUser(user.id, {
      emailVerifiedAt: new Date(),
      status: user.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : user.status,
    });

    await this.authRepository.markEmailVerificationTokenUsed(tokenRecord.id);
  }
}
