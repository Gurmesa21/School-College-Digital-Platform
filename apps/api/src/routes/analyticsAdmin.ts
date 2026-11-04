import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PERMISSIONS,
  ResolvedTenant,
  AnalyticsOverviewDto,
  AnalyticsRetentionResultDto,
} from '@school/shared';
import { AnalyticsService } from '../services/analyticsService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createAnalyticsAdminRouter(
  analyticsService: AnalyticsService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  /**
   * GET /api/v1/tenant/admin/analytics/overview
   * Returns institutional analytics overview, daily trends, top content, and content inventory.
   * Guarded by analytics:view permission and strictly scoped to resolved tenant (BR-001, BR-003).
   */
  router.get(
    '/overview',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;

      try {
        const overview = await analyticsService.getTenantOverview(
          tenant.id,
          req.query,
          tenant.timezone || 'UTC'
        );

        const response: ApiResponse<AnalyticsOverviewDto> = {
          success: true,
          data: overview,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        const isClientError =
          err.message?.includes('INVALID_ANALYTICS_QUERY') ||
          err.message?.includes('INVALID_DATE_RANGE') ||
          err.message?.includes('DATE_RANGE_EXCEEDED');

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: isClientError ? 'INVALID_QUERY' : 'ANALYTICS_FETCH_FAILED',
            message: err.message || 'Failed to retrieve analytics overview.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(isClientError ? 400 : 500).json(errorResponse);
      }
    }
  );

  /**
   * GET /api/v1/tenant/admin/analytics/export
   * Exports tenant analytics summary in JSON or CSV format without sensitive personal data (SRS Section 13).
   */
  router.get(
    '/export',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';

      try {
        const exported = await analyticsService.exportAnalytics(tenant.id, req.query, format);

        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${tenant.slug}-analytics-${new Date().toISOString().slice(0, 10)}.csv"`
          );
          res.status(200).send(exported);
          return;
        }

        const response: ApiResponse<unknown> = {
          success: true,
          data: exported,
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
            code: 'EXPORT_FAILED',
            message: err.message || 'Failed to export analytics data.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * POST /api/v1/tenant/admin/analytics/retention/cleanup
   * Enforces data retention policies by purging events older than the designated cutoff window (BR-009).
   * Audits the operation while leaving immutable security audit logs intact.
   */
  router.post(
    '/retention/cleanup',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;

      try {
        const result = await analyticsService.cleanupRetention(
          tenant.id,
          req.body,
          req.user?.id || null,
          req.user?.email || null
        );

        const response: ApiResponse<AnalyticsRetentionResultDto> = {
          success: true,
          data: result,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        const isClientError = err.message?.includes('INVALID_RETENTION_PAYLOAD');
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: isClientError ? 'INVALID_RETENTION_PARAMS' : 'RETENTION_CLEANUP_FAILED',
            message: err.message || 'Failed to execute retention cleanup.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(isClientError ? 400 : 500).json(errorResponse);
      }
    }
  );

  return router;
}

