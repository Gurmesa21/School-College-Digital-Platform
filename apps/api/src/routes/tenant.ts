import { Router, Request, Response } from 'express';
import { ApiResponse, ResolvedTenant, PERMISSIONS } from '@school/shared';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';
import { IAuthRepository, PrismaAuthRepository } from '../repositories/authRepository.js';

export function createTenantRouter(
  authRepository: IAuthRepository = new PrismaAuthRepository()
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepository);

  /**
   * GET /api/v1/tenant/current
   * Returns the currently resolved tenant context (public / institutional discovery)
   */
  router.get('/current', (req: Request, res: Response): void => {
    const tenant = req.tenant as ResolvedTenant;

    const response: ApiResponse<ResolvedTenant> = {
      success: true,
      data: tenant,
      meta: {
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString(),
        resolutionMethod: tenant.resolutionMethod,
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/tenant/settings
   * Protected tenant operation: Requires authenticated active member with TENANT_PROFILE_READ
   */
  router.get(
    '/settings',
    requireAuth,
    membershipGuard,
    requirePermission(PERMISSIONS.TENANT_PROFILE_READ),
    (req: Request, res: Response): void => {
      const tenant = req.tenant as ResolvedTenant;

      const response: ApiResponse<{
        tenantId: string;
        tenantName: string;
        timezone: string;
        defaultLocale: string;
        contactEmail: string | null;
        userRole: string[];
      }> = {
        success: true,
        data: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          timezone: tenant.timezone,
          defaultLocale: tenant.defaultLocale,
          contactEmail: tenant.contactEmail,
          userRole: req.membership?.roles.map((r) => r.name) || (req.user?.isSuperAdmin ? ['SUPER_ADMIN'] : []),
        },
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * PATCH /api/v1/tenant/settings
   * Protected tenant operation: Requires authenticated active member with TENANT_PROFILE_UPDATE
   */
  router.patch(
    '/settings',
    requireAuth,
    membershipGuard,
    requirePermission(PERMISSIONS.TENANT_PROFILE_UPDATE),
    (req: Request, res: Response): void => {
      const tenant = req.tenant as ResolvedTenant;

      const response: ApiResponse<{ message: string; tenantId: string }> = {
        success: true,
        data: {
          message: 'Institutional configuration updated successfully.',
          tenantId: tenant.id,
        },
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    }
  );

  /**
   * GET /api/v1/tenant/admissions
   * Protected tenant operation: Requires authenticated active member with ADMISSIONS_READ
   */
  router.get(
    '/admissions',
    requireAuth,
    membershipGuard,
    requirePermission(PERMISSIONS.ADMISSIONS_READ),
    (req: Request, res: Response): void => {
      const tenant = req.tenant as ResolvedTenant;

      const response: ApiResponse<{ tenantId: string; admissionsQueue: unknown[] }> = {
        success: true,
        data: {
          tenantId: tenant.id,
          admissionsQueue: [],
        },
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    }
  );

  return router;
}

export const tenantRouter = createTenantRouter();
