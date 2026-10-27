import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  ResolvedTenant,
  SearchQuerySchema,
  SearchResponseData,
} from '@school/shared';
import { SearchService } from '../services/searchService.js';

export function createPublicSearchRouter(searchService: SearchService): Router {
  const router = Router();

  /**
   * GET /api/v1/tenant/public/search
   * Tenant-scoped public search across published pages, programmes, staff, news, events, documents, and forms.
   * Strictly enforces publication state and privacy boundaries (FR-SRCH-001, UC-PUB-02, BR-001, BR-002).
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    if (!tenant) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_NOT_RESOLVED',
          message: 'Unable to resolve institution tenant context for search request.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    // 1. Server-side validation of query parameters
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid search parameters',
          details: parsed.error.format(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      // 2. Perform search
      const result = await searchService.search(tenant.id, req.query, {
        actorId: (req as any).user?.id || null,
        actorEmail: (req as any).user?.email || null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        requestId,
      });

      const response: ApiResponse<SearchResponseData> = {
        success: true,
        data: result,
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
          code: 'SEARCH_FAILED',
          message: err.message || 'Error occurred during public search processing.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
