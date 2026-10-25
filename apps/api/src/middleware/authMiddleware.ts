import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  AuthUser,
  AuthSession,
  AuthMembership,
  PermissionCode,
  PERMISSIONS,
  ApiErrorResponse,
} from '@school/shared';
import { AuthService } from '../services/authService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import { EnvConfig, config as defaultEnvConfig } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'school_session';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: AuthSession;
      membership?: AuthMembership;
      permissions?: PermissionCode[];
      rawSessionToken?: string;
    }
  }
}

/**
 * Extracts raw session token from cookies or Authorization Bearer header
 */
export function extractSessionToken(req: Request): string | undefined {
  if (req.cookies && typeof req.cookies[SESSION_COOKIE_NAME] === 'string') {
    return req.cookies[SESSION_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return undefined;
}

/**
 * Resolves session and attaches user context if a token is present
 */
export function createSessionResolver(authService: AuthService): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return next();
    }

    try {
      const { user, session } = await authService.getCurrentSession(rawToken);
      req.user = user;
      req.session = session;
      req.rawSessionToken = rawToken;
      next();
    } catch {
      // If token is invalid or expired, continue without attaching user
      next();
    }
  };
}

/**
 * Strict authentication guard middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.id || 'unknown';

  if (!req.user || !req.session) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required: You must be signed in to perform this operation.',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  next();
}

/**
 * Origin and Referer validation for cookie-authenticated mutating requests (CSRF Defense)
 */
export function createOriginGuard(envConfig: EnvConfig = defaultEnvConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only check mutating requests (POST, PUT, PATCH, DELETE)
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isMutating) {
      return next();
    }

    // If authenticated via cookie (rather than bearer token header), verify origin
    const hasCookieAuth = Boolean(req.cookies && req.cookies[SESSION_COOKIE_NAME]);
    if (!hasCookieAuth) {
      return next();
    }

    const origin = req.headers.origin || req.headers.referer;
    if (!origin) {
      // If running in development loopback, allow requests without Origin (e.g. direct curl/tests)
      if (envConfig.NODE_ENV === 'test' || envConfig.NODE_ENV === 'development') {
        return next();
      }

      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'CSRF_ORIGIN_MISSING',
          message: 'Origin or Referer header required for state-changing operations.',
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    // Validate origin matches configured allowed origin or host
    const allowedOrigin = envConfig.CORS_ORIGIN;
    const reqHost = req.headers.host || '';

    const originMatches =
      origin.startsWith(allowedOrigin) ||
      (reqHost && origin.includes(reqHost)) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (!originMatches) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'CSRF_ORIGIN_FORBIDDEN',
          message: 'Cross-origin request rejected.',
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
}

/**
 * Enforces active membership in the current resolved tenant
 */
export function createTenantMembershipGuard(authRepository: IAuthRepository): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = req.id || 'unknown';

    if (!req.user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required prior to tenant authorization check.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!req.tenant) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_CONTEXT_MISSING',
          message: 'No tenant context was resolved for this request.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Platform Super Admin has explicit cross-tenant support privilege
    if (req.user.isSuperAdmin) {
      req.permissions = Object.values(PERMISSIONS) as PermissionCode[];
      return next();
    }

    // Query active membership for this specific tenant
    const membership = await authRepository.findMembership(req.user.id, req.tenant.id);

    if (!membership) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_MEMBERSHIP_REQUIRED',
          message: 'You do not have a registered membership in this institution.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    if (membership.status !== 'ACTIVE') {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'MEMBERSHIP_INACTIVE',
          message: `Your membership in this institution is currently ${membership.status.toLowerCase()}. Access denied.`,
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    // Attach verified membership & evaluate tenant-scoped permissions
    req.membership = membership;
    req.permissions = await authRepository.getUserPermissions(req.user.id, req.tenant.id);

    next();
  };
}

/**
 * Enforces possession of a specific tenant-scoped permission
 */
export function requirePermission(
  requiredPermission: PermissionCode | PermissionCode[]
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.id || 'unknown';

    if (req.user?.isSuperAdmin) {
      return next();
    }

    const permissions = req.permissions || [];
    const requiredList = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];
    const hasPermission = requiredList.some((perm) => permissions.includes(perm));

    if (!hasPermission) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Forbidden: You lack the required permission (${requiredList.join(' or ')}) for this operation.`,
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
}

/**
 * Strict platform-level authorization guard (Platform Super Administrator only)
 */
export function requirePlatformSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.id || 'unknown';

  if (!req.user || !req.user.isSuperAdmin) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'PLATFORM_SUPER_ADMIN_REQUIRED',
        message: 'Forbidden: This operation requires platform super administrator privileges.',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(403).json(errorResponse);
    return;
  }

  next();
}
