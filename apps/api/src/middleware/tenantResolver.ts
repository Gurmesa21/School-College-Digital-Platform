import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ITenantRepository, ResolvedTenant, normalizeHostname, ApiErrorResponse } from '@school/shared';
import { PrismaTenantRepository } from '../repositories/tenantRepository.js';
import { config as defaultEnvConfig, EnvConfig } from '../config/env.js';

declare global {
  namespace Express {
    interface Request {
      tenant?: ResolvedTenant;
    }
  }
}

/**
 * Checks if an IP or host string corresponds to local loopback
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const clean = address.trim().toLowerCase();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '::ffff:127.0.0.1'
  );
}

/**
 * Extracts and normalizes the effective hostname from request
 */
export function getEffectiveHostname(req: Request, trustProxy: boolean): string {
  let rawHost = '';

  if (trustProxy && req.headers['x-forwarded-host']) {
    const forwarded = req.headers['x-forwarded-host'];
    rawHost = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  } else if (req.headers.host) {
    rawHost = req.headers.host;
  } else {
    rawHost = req.hostname || '';
  }

  return normalizeHostname(rawHost);
}

/**
 * Creates tenant resolution middleware with injected repository and configuration
 */
export function createTenantResolver(
  repository: ITenantRepository = new PrismaTenantRepository(),
  envConfig: EnvConfig = defaultEnvConfig
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = req.id || 'unknown';

    try {
      const normalizedHost = getEffectiveHostname(req, envConfig.TRUST_PROXY);
      const clientIp = req.ip || req.socket.remoteAddress || '';

      // --- Security Check: Client-supplied headers are strictly ignored ---
      // We explicitly do not inspect or trust `x-tenant-id`, `x-school-slug`, etc.

      // --- Check Local Development Query Override Exception ---
      const queryTenantSlug = typeof req.query.tenant === 'string' ? req.query.tenant.trim() : null;

      if (queryTenantSlug) {
        const isLocalHost = isLoopbackAddress(normalizedHost) || normalizedHost.endsWith('.localhost');
        const isLocalClient = isLoopbackAddress(clientIp);
        const isNonProductionEnv =
          envConfig.NODE_ENV !== 'production' &&
          envConfig.APP_ENV !== 'production' &&
          envConfig.APP_ENV !== 'staging';

        const canUseDevOverride =
          envConfig.ALLOW_DEV_TENANT_OVERRIDE && isLocalHost && isLocalClient && isNonProductionEnv;

        if (canUseDevOverride) {
          const resolvedBySlug = await repository.findBySlug(queryTenantSlug);

          if (!resolvedBySlug) {
            const errorResponse: ApiErrorResponse = {
              success: false,
              error: {
                code: 'INSTITUTION_NOT_FOUND',
                message: `Institution Not Found: No tenant matches development slug '${queryTenantSlug}'.`,
                requestId,
                timestamp: new Date().toISOString(),
              },
            };
            res.status(404).json(errorResponse);
            return;
          }

          // Validate status even when using dev override
          if (resolvedBySlug.status === 'SUSPENDED') {
            const errorResponse: ApiErrorResponse = {
              success: false,
              error: {
                code: 'INSTITUTION_SUSPENDED',
                message: 'This institution site is currently suspended. Please contact institutional administration.',
                requestId,
                timestamp: new Date().toISOString(),
              },
            };
            res.status(403).json(errorResponse);
            return;
          }

          if (resolvedBySlug.status === 'PENDING') {
            const errorResponse: ApiErrorResponse = {
              success: false,
              error: {
                code: 'INSTITUTION_INACTIVE',
                message: 'This institution site is not yet activated.',
                requestId,
                timestamp: new Date().toISOString(),
              },
            };
            res.status(403).json(errorResponse);
            return;
          }

          req.tenant = resolvedBySlug;
          next();
          return;
        } else {
          // If query override requested but unauthorized (e.g. In production, staging, or non-loopback),
          // Log security trace and strictly ignore it, falling back to ordinary hostname mapping.
          if (envConfig.NODE_ENV === 'production' || envConfig.APP_ENV === 'production' || envConfig.APP_ENV === 'staging') {
            console.warn(`[Security Trace] Query tenant override attempted in ${envConfig.APP_ENV || envConfig.NODE_ENV} environment from IP ${clientIp}. Ignored.`);
          }
        }
      }

      // --- Standard Hostname-Based Domain Mapping Resolution ---
      if (!normalizedHost) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_HOSTNAME',
            message: 'Unable to determine request hostname.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      const tenant = await repository.findByHostname(normalizedHost);

      if (!tenant) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INSTITUTION_NOT_FOUND',
            message: 'Institution Not Found: The requested domain is not configured on this platform.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(404).json(errorResponse);
        return;
      }

      // --- Institutional Operational Status Checks ---
      if (tenant.status === 'SUSPENDED') {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INSTITUTION_SUSPENDED',
            message: 'This institution site is currently suspended. Please contact institutional administration.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(403).json(errorResponse);
        return;
      }

      if (tenant.status === 'PENDING') {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INSTITUTION_INACTIVE',
            message: 'This institution site is not yet activated.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(403).json(errorResponse);
        return;
      }

      // Attach typed verified tenant context to request
      req.tenant = tenant;
      next();
    } catch (err) {
      console.error(`[TenantResolver Error] Resolution failed for requestId ${requestId}:`, err);

      // Safe Failure: Never silently bypass or select another tenant
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_RESOLUTION_UNAVAILABLE',
          message: 'Tenant resolution service temporarily unavailable. Please try again later.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(503).json(errorResponse);
    }
  };
}
