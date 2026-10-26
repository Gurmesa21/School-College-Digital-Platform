import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  PERMISSIONS,
  ResolvedTenant,
  CreateStaffProfileSchema,
  UpdateStaffProfileSchema,
  StaffProfileQuerySchema,
  StaffProfileDto,
} from '@school/shared';
import { StaffService, StaffAuditContext } from '../services/staffService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createStaffAdminRouter(
  staffService: StaffService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  const getContext = (req: Request): StaffAuditContext => ({
    actorId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id || null,
  });

  // --------------------------------------------------------------------------
  // GET /api/v1/tenant/cms/staff - List staff profiles
  // --------------------------------------------------------------------------
  router.get('/', requirePermission(PERMISSIONS.STAFF_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = StaffProfileQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid staff query parameters',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const result = await staffService.listStaff(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<StaffProfileDto>> = {
        success: true,
        data: result,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      };
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/v1/tenant/cms/staff/:id - Get staff profile detail
  // --------------------------------------------------------------------------
  router.get('/:id', requirePermission(PERMISSIONS.STAFF_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await staffService.getStaffById(tenant.id, req.params.id);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'STAFF_NOT_FOUND', message: 'Staff profile not found', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /api/v1/tenant/cms/staff - Create staff profile
  // --------------------------------------------------------------------------
  router.post('/', requirePermission(PERMISSIONS.STAFF_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = CreateStaffProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid staff payload',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Direct publish requires STAFF_PUBLISH permission
    if (parsed.data.status === 'PUBLISHED') {
      const hasPublish = req.user?.isSuperAdmin || (req.permissions || []).includes(PERMISSIONS.STAFF_PUBLISH);
      if (!hasPublish) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_PUBLISH', message: 'You lack permission to directly publish staff profiles', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    try {
      const created = await staffService.createStaff(tenant.id, user, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: created,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalidRel = err.message.startsWith('INVALID_DEPARTMENT') || err.message.startsWith('INVALID_MEDIA');
      const status = isConflict ? 409 : isInvalidRel ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isConflict ? 'SLUG_CONFLICT' : isInvalidRel ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // PUT /api/v1/tenant/cms/staff/:id - Update staff profile
  // --------------------------------------------------------------------------
  router.put('/:id', requirePermission(PERMISSIONS.STAFF_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = UpdateStaffProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid staff update payload',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Changing to PUBLISHED status requires STAFF_PUBLISH permission
    if (parsed.data.status === 'PUBLISHED') {
      const hasPublish = req.user?.isSuperAdmin || (req.permissions || []).includes(PERMISSIONS.STAFF_PUBLISH);
      if (!hasPublish) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_PUBLISH', message: 'You lack permission to publish staff profiles', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    try {
      const updated = await staffService.updateStaff(tenant.id, req.params.id, user, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('STAFF_NOT_FOUND');
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalidRel = err.message.startsWith('INVALID_DEPARTMENT') || err.message.startsWith('INVALID_MEDIA');
      const status = isNotFound ? 404 : isConflict ? 409 : isInvalidRel ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : isConflict ? 'SLUG_CONFLICT' : isInvalidRel ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // PATCH /api/v1/tenant/cms/staff/:id/status - Update staff profile publication status
  // --------------------------------------------------------------------------
  router.patch('/:id/status', requirePermission(PERMISSIONS.STAFF_PUBLISH), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }

    try {
      const updated = await staffService.setStaffStatus(tenant.id, req.params.id, user, status, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('STAFF_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // DELETE /api/v1/tenant/cms/staff/:id - Delete staff profile
  // --------------------------------------------------------------------------
  router.delete('/:id', requirePermission(PERMISSIONS.STAFF_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await staffService.deleteStaff(tenant.id, req.params.id, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('STAFF_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  return router;
}
