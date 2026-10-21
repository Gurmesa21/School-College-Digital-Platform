import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  AuditLogDto,
  AuditLogQuerySchema,
} from '@school/shared';
import { requireAuth, requirePlatformSuperAdmin } from '../middleware/authMiddleware.js';
import { IAuditRepository, PrismaAuditRepository } from '../repositories/auditRepository.js';

export function createPlatformRouter(
  auditRepo: IAuditRepository = new PrismaAuditRepository()
): Router {
  const router = Router();

  // All platform endpoints require authentication and Platform Super Administrator privileges
  router.use(requireAuth);
  router.use(requirePlatformSuperAdmin);

  /**
   * GET /api/v1/platform/tenants
   * Platform-level operation: strictly reserved for Platform Super Administrators
   */
  router.get('/tenants', (req: Request, res: Response): void => {
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
  });

  /**
   * GET /api/v1/platform/audit
   * Platform-wide audit history across tenants (strictly Platform Super Admin)
   */
  router.get('/audit', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const queryParsed = AuditLogQuerySchema.safeParse(req.query);

    if (!queryParsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid platform audit query parameters.',
          details: queryParsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const logs = await auditRepo.findAuditLogs({
        page: queryParsed.data.page,
        limit: queryParsed.data.limit,
        action: queryParsed.data.action,
        entityType: queryParsed.data.entityType,
        actorId: queryParsed.data.actorId,
        outcome: queryParsed.data.outcome,
      });

      const response: ApiResponse<PaginatedData<AuditLogDto>> = {
        success: true,
        data: logs,
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
          message: 'Failed to retrieve platform audit history.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}

export const platformRouter = createPlatformRouter();
