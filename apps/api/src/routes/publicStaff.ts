import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  ResolvedTenant,
  StaffProfileQuerySchema,
  PublicStaffProfileDto,
} from '@school/shared';
import { StaffService } from '../services/staffService.js';

export function createPublicStaffRouter(staffService: StaffService): Router {
  const router = Router();

  /**
   * GET /api/v1/tenant/public/staff
   * Public directory listing of published, active staff.
   * Redacts unapproved public contact fields (displayEmail, displayPhone)
   * and omits internal notes and user account IDs.
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = StaffProfileQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Query validation failed',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const result = await staffService.listPublicStaff(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<PublicStaffProfileDto>> = {
        success: true,
        data: result,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      };
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * GET /api/v1/tenant/public/staff/:slug
   * Public detail of a specific staff member by tenant-scoped slug.
   * Fails closed (404) if draft, inactive, archived, or not found.
   */
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    const slug = req.params.slug;

    try {
      const profile = await staffService.getPublicStaffBySlug(tenant.id, slug);
      if (!profile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: `Staff member '${slug}' was not found or is not currently published.`,
            requestId: req.id || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: profile,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  return router;
}
