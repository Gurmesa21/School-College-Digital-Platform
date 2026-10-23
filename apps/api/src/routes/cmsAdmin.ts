import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  PageDto,
  PageDetailDto,
  PERMISSIONS,
  ResolvedTenant,
  CreatePageSchema,
  UpdatePageSchema,
  PublishPageSchema,
  PageQuerySchema,
} from '@school/shared';
import { CmsService } from '../services/cmsService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createCmsAdminRouter(
  cmsService: CmsService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  // All administrative CMS endpoints require authentication and active tenant membership
  router.use(requireAuth);
  router.use(membershipGuard);

  /**
   * GET /api/v1/tenant/cms/pages
   * Lists institutional pages with bounded pagination and status/search filters
   */
  router.get(
    '/',
    requirePermission(PERMISSIONS.CMS_PAGES_READ),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;

      const queryParsed = PageQuerySchema.safeParse(req.query);
      if (!queryParsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid pagination query parameters.',
            details: queryParsed.error.flatten(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const result = await cmsService.listPages(tenant.id, queryParsed.data);
        const response: ApiResponse<PaginatedData<PageDto>> = {
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
            code: 'INTERNAL_ERROR',
            message: err.message || 'Unable to retrieve institutional pages.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * POST /api/v1/tenant/cms/pages
   * Creates a new page draft for the tenant
   */
  router.post(
    '/',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;

      const parsed = CreatePageSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid page creation payload.',
            details: parsed.error.flatten(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const page = await cmsService.createDraft(
          tenant.id,
          { id: user.id, email: user.email },
          parsed.data,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<PageDetailDto> = {
          success: true,
          data: page,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(201).json(response);
      } catch (err: any) {
        if (err.message && err.message.includes('SLUG_ALREADY_EXISTS')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SLUG_ALREADY_EXISTS',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(409).json(errorResponse);
          return;
        }

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'PAGE_CREATION_FAILED',
            message: err.message || 'Failed to create page draft.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * GET /api/v1/tenant/cms/pages/:id
   * Retrieves page details (including unpublished sections) for editing or preview
   */
  router.get(
    '/:id',
    requirePermission(PERMISSIONS.CMS_PAGES_READ),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const pageId = req.params.id;

      try {
        const page = await cmsService.getPageById(tenant.id, pageId);
        if (!page) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: `Page "${pageId}" was not found in this institution.`,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        const response: ApiResponse<PageDetailDto> = {
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
            message: err.message || 'Unable to retrieve page detail.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * PUT /api/v1/tenant/cms/pages/:id
   * Updates an existing page draft with optimistic concurrency protection
   */
  router.put(
    '/:id',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;
      const pageId = req.params.id;

      const parsed = UpdatePageSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid page update payload.',
            details: parsed.error.flatten(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const updated = await cmsService.updateDraft(
          tenant.id,
          pageId,
          { id: user.id, email: user.email },
          parsed.data,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<PageDetailDto> = {
          success: true,
          data: updated,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        if (err.message && err.message.includes('PAGE_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'CONCURRENCY_CONFLICT',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(409).json(errorResponse);
          return;
        }

        if (err.message && err.message.includes('SLUG_ALREADY_EXISTS')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SLUG_ALREADY_EXISTS',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(409).json(errorResponse);
          return;
        }

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'PAGE_UPDATE_FAILED',
            message: err.message || 'Failed to update page draft.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * POST /api/v1/tenant/cms/pages/:id/publish
   * Publishes a page to the public website (permission-controlled)
   */
  router.post(
    '/:id/publish',
    requirePermission(PERMISSIONS.CMS_PAGES_PUBLISH),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;
      const pageId = req.params.id;

      const parsed = PublishPageSchema.safeParse(req.body);
      const scheduledPublishAt = parsed.success ? parsed.data.scheduledPublishAt : null;

      try {
        const published = await cmsService.publishPage(
          tenant.id,
          pageId,
          { id: user.id, email: user.email },
          scheduledPublishAt,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<PageDetailDto> = {
          success: true,
          data: published,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        if (err.message && err.message.includes('PAGE_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'PUBLISH_FAILED',
            message: err.message || 'Failed to publish page.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * POST /api/v1/tenant/cms/pages/:id/archive
   * Archives a published page and removes it from public routing
   */
  router.post(
    '/:id/archive',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;
      const pageId = req.params.id;

      try {
        const archived = await cmsService.archivePage(
          tenant.id,
          pageId,
          { id: user.id, email: user.email },
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<PageDetailDto> = {
          success: true,
          data: archived,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        if (err.message && err.message.includes('PAGE_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: err.message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'ARCHIVE_FAILED',
            message: err.message || 'Failed to archive page.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  return router;
}
