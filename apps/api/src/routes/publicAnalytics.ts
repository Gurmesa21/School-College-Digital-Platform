import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  ResolvedTenant,
} from '@school/shared';
import { AnalyticsService } from '../services/analyticsService.js';

export function createPublicAnalyticsRouter(analyticsService: AnalyticsService): Router {
  const router = Router();

  /**
   * POST /api/v1/tenant/public/analytics/event
   * Anonymous, privacy-aware public analytics event intake (FR-ANL-001, NFR-PRIV-001).
   * Minimizes data, rejects PII, strips query params, and derives coarse non-identifying dimensions.
   */
  router.post('/event', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    if (!tenant) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_NOT_RESOLVED',
          message: 'Unable to resolve institution tenant context for analytics event.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await analyticsService.recordPublicEvent(tenant.id, req.body, {
        userAgent: req.headers['user-agent'] || null,
        referer: (req.headers['referer'] as string) || null,
      });

      const response: ApiResponse<{ recorded: boolean; eventId?: string }> = {
        success: true,
        data: {
          recorded: true,
          eventId: result.eventId,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(201).json(response);
    } catch (err: any) {
      const isValidationError = err.message?.startsWith('INVALID_ANALYTICS_PAYLOAD');
      const statusCode = isValidationError ? 400 : 500;

      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: isValidationError ? 'INVALID_EVENT_PAYLOAD' : 'ANALYTICS_RECORD_FAILED',
          message: err.message || 'Error occurred while recording analytics event.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(statusCode).json(errorResponse);
    }
  });

  return router;
}

