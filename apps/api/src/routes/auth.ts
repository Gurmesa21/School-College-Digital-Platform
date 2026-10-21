import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  AuthUser,
  AuthSession,
  SignInSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  EmailVerificationSchema,
} from '@school/shared';
import { AuthService } from '../services/authService.js';
import { SESSION_COOKIE_NAME, requireAuth } from '../middleware/authMiddleware.js';
import { EnvConfig, config as defaultEnvConfig } from '../config/env.js';

export function createAuthRouter(
  authService: AuthService,
  envConfig: EnvConfig = defaultEnvConfig
): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/sign-in
   * Authenticates user and sets HTTP-only session cookie
   */
  router.post('/sign-in', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const parsed = SignInSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login credentials payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await authService.signIn(parsed.data, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      // Set hardened HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, result.rawSessionToken, {
        httpOnly: true,
        secure: envConfig.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: result.expiresAt,
      });

      const response: ApiResponse<{ user: AuthUser; sessionExpiresAt: string }> = {
        success: true,
        data: {
          user: result.user,
          sessionExpiresAt: result.expiresAt.toISOString(),
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'An unexpected error occurred during sign-in.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/auth/sign-out
   * Revokes current session and clears session cookie
   */
  router.post('/sign-out', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const rawToken = req.rawSessionToken || (req.cookies && req.cookies[SESSION_COOKIE_NAME]);

    if (rawToken) {
      await authService.signOut(rawToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'Successfully signed out.',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(200).json(response);
  });

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user and session context
   */
  router.get('/me', requireAuth, (req: Request, res: Response): void => {
    const requestId = req.id || 'unknown';

    const response: ApiResponse<{ user: AuthUser; session: AuthSession }> = {
      success: true,
      data: {
        user: req.user as AuthUser,
        session: req.session as AuthSession,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/password-reset/request
   * Initiates password reset flow with generic non-disclosing response
   */
  router.post('/password-reset/request', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const parsed = PasswordResetRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address provided.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      await authService.requestPasswordReset(parsed.data, req.tenant?.name);

      // Consistent non-disclosing response regardless of account existence
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'If an account exists for that email, password reset instructions have been sent.',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unable to process password reset request at this time.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/auth/password-reset/confirm
   * Resets password, consumes token, and invalidates all existing sessions
   */
  router.post('/password-reset/confirm', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const parsed = PasswordResetConfirmSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password reset confirmation payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      await authService.confirmPasswordReset(parsed.data);

      // Clear any session cookie in client
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: envConfig.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Password successfully updated. Please sign in with your new password.',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INVALID_RESET_TOKEN',
          message: err.message || 'Invalid or expired password reset token.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/auth/verify-email
   * Consumes single-use verification token and activates user email
   */
  router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const parsed = EmailVerificationSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email verification token payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      await authService.verifyEmail(parsed.data);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Email address has been successfully verified.',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INVALID_VERIFICATION_TOKEN',
          message: err.message || 'Invalid or expired email verification token.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(statusCode).json(errorResponse);
    }
  });

  return router;
}
