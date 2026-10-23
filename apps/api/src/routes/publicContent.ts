import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PublicPageDto,
  ResolvedTenant,
} from '@school/shared';
import { CmsService } from '../services/cmsService.js';

export function createPublicContentRouter(cmsService: CmsService): Router {
  const router = Router();

  /**
   * GET /api/v1/tenant/public/pages/:slug
   * Retrieves an eligible published CMS page for public anonymous visitors
   * Enforces publication status and active publication window (BR-002, BR-006)
   */
  router.get('/pages/:slug', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;
    const slug = req.params.slug;

    try {
      const page = await cmsService.getPublicPageBySlug(tenant.id, slug);

      if (!page) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: `The requested page "${slug}" was not found or is not currently published.`,
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<PublicPageDto> = {
        success: true,
        data: page,
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
          message: err.message || 'Error retrieving published content.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
