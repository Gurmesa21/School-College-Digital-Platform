import { Router, Request, Response } from 'express';
import { ApiResponse } from '@school/shared';
import { requireAuth, requirePlatformSuperAdmin } from '../middleware/authMiddleware.js';

export function createPlatformRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/platform/tenants
   * Platform-level operation: strictly reserved for Platform Super Administrators
   */
  router.get(
    '/tenants',
    requireAuth,
    requirePlatformSuperAdmin,
    (req: Request, res: Response): void => {
      const response: ApiResponse<{ message: string; platformStatus: string }> = {
        success: true,
        data: {
          message: 'Authorized platform operations access granted.',
          platformStatus: 'OPERATIONAL',
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

export const platformRouter = createPlatformRouter();
