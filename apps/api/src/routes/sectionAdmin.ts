import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  ReusableSectionDto,
  ReusableSectionPlacementDto,
  PERMISSIONS,
  ResolvedTenant,
  CreateReusableSectionSchema,
  UpdateReusableSectionSchema,
  ReusableSectionQuerySchema,
} from '@school/shared';
import { SectionService } from '../services/sectionService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createSectionAdminRouter(
  sectionService: SectionService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  // All section management endpoints require authentication & active tenant membership
  router.use(requireAuth);
  router.use(membershipGuard);

  /**
   * GET /api/v1/tenant/cms/sections
   * Lists reusable sections with filtering and pagination
   */
  router.get(
    '/',
    requirePermission(PERMISSIONS.CMS_PAGES_READ),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;

      const queryParsed = ReusableSectionQuerySchema.safeParse(req.query);
      if (!queryParsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Query parameters validation failed',
            details: queryParsed.error.format(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const result = await sectionService.listReusableSections(tenant.id, queryParsed.data);
        const response: ApiResponse<PaginatedData<ReusableSectionDto>> = {
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
            message: err.message || 'Failed to list reusable sections',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * POST /api/v1/tenant/cms/sections
   * Creates a new reusable section in the tenant's library
   */
  router.post(
    '/',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;

      const parsed = CreateReusableSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid reusable section payload',
            details: parsed.error.format(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const created = await sectionService.createReusableSection(
          tenant.id,
          { id: user.id, email: user.email },
          parsed.data,
          {
            actorId: user.id,
            actorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<ReusableSectionDto> = {
          success: true,
          data: created,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(201).json(response);
      } catch (err: any) {
        const message = err.message || '';
        if (message.startsWith('SLUG_ALREADY_EXISTS')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SLUG_ALREADY_EXISTS',
              message,
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
            code: 'CREATE_SECTION_FAILED',
            message: err.message || 'Failed to create reusable section',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
      }
    }
  );

  /**
   * GET /api/v1/tenant/cms/sections/:id
   * Retrieves a reusable section by its identifier
   */
  router.get(
    '/:id',
    requirePermission(PERMISSIONS.CMS_PAGES_READ),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const { id } = req.params;

      try {
        const section = await sectionService.getReusableSectionById(tenant.id, id);
        if (!section) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SECTION_NOT_FOUND',
              message: `Reusable section '${id}' not found`,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        const response: ApiResponse<ReusableSectionDto> = {
          success: true,
          data: section,
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
            message: err.message || 'Failed to retrieve reusable section',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * PUT /api/v1/tenant/cms/sections/:id
   * Updates a reusable section configuration
   */
  router.put(
    '/:id',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;
      const { id } = req.params;

      const parsed = UpdateReusableSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid reusable section update payload',
            details: parsed.error.format(),
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      try {
        const updated = await sectionService.updateReusableSection(
          tenant.id,
          id,
          { id: user.id, email: user.email },
          parsed.data,
          {
            actorId: user.id,
            actorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestId,
          }
        );

        const response: ApiResponse<ReusableSectionDto> = {
          success: true,
          data: updated,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        const message = err.message || '';
        if (message.startsWith('SECTION_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SECTION_NOT_FOUND',
              message,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
          res.status(404).json(errorResponse);
          return;
        }

        if (message.startsWith('SLUG_ALREADY_EXISTS')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SLUG_ALREADY_EXISTS',
              message,
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
            code: 'UPDATE_SECTION_FAILED',
            message: err.message || 'Failed to update reusable section',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(400).json(errorResponse);
      }
    }
  );

  /**
   * DELETE /api/v1/tenant/cms/sections/:id
   * Deletes a reusable section from the tenant library
   */
  router.delete(
    '/:id',
    requirePermission(PERMISSIONS.CMS_PAGES_WRITE),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const user = req.user!;
      const { id } = req.params;

      try {
        await sectionService.deleteReusableSection(tenant.id, id, { id: user.id, email: user.email }, {
          actorId: user.id,
          actorEmail: user.email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId,
        });

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: `Reusable section '${id}' successfully deleted` },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        const message = err.message || '';
        if (message.startsWith('SECTION_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SECTION_NOT_FOUND',
              message,
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
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to delete reusable section',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(500).json(errorResponse);
      }
    }
  );

  /**
   * GET /api/v1/tenant/cms/sections/:id/placements
   * Lists pages where this reusable section is placed
   */
  router.get(
    '/:id/placements',
    requirePermission(PERMISSIONS.CMS_PAGES_READ),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.id || 'unknown';
      const tenant = req.tenant as ResolvedTenant;
      const { id } = req.params;

      try {
        const placements = await sectionService.getSectionPlacements(tenant.id, id);
        const response: ApiResponse<ReusableSectionPlacementDto[]> = {
          success: true,
          data: placements,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
      } catch (err: any) {
        const message = err.message || '';
        if (message.startsWith('SECTION_NOT_FOUND')) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'SECTION_NOT_FOUND',
              message,
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
            code: 'INTERNAL_ERROR',
            message: err.message || 'Failed to list section placements',
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
