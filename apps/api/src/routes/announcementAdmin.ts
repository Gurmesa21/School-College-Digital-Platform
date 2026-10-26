import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PaginatedData,
  PERMISSIONS,
  ResolvedTenant,
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  AnnouncementQuerySchema,
  AnnouncementDto,
} from '@school/shared';
import { AnnouncementService, AnnouncementAuditContext } from '../services/announcementService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createAnnouncementAdminRouter(
  announcementService: AnnouncementService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  const getContext = (req: Request): AnnouncementAuditContext => ({
    actorId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id || null,
  });

  // GET /api/v1/tenant/cms/announcements - List announcements
  router.get('/', requirePermission(PERMISSIONS.ANNOUNCEMENTS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = AnnouncementQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid announcement query parameters',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const result = await announcementService.listAnnouncements(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<AnnouncementDto>> = {
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

  // GET /api/v1/tenant/cms/announcements/:id - Get announcement detail
  router.get('/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await announcementService.getAnnouncementById(tenant.id, req.params.id);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
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

  // POST /api/v1/tenant/cms/announcements - Create announcement
  router.post('/', requirePermission(PERMISSIONS.ANNOUNCEMENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = CreateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid announcement data',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await announcementService.createAnnouncement(tenant.id, actor, parsed.data, getContext(req));
      res.status(201).json({
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

  // PUT /api/v1/tenant/cms/announcements/:id - Update announcement
  router.put('/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = UpdateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid update data',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await announcementService.updateAnnouncement(tenant.id, req.params.id, actor, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('NOT_FOUND') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.includes('NOT_FOUND') ? 'NOT_FOUND' : 'ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // POST /api/v1/tenant/cms/announcements/:id/publish - Publish announcement
  router.post('/:id/publish', requirePermission(PERMISSIONS.ANNOUNCEMENTS_PUBLISH), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await announcementService.publishAnnouncement(tenant.id, req.params.id, actor, getContext(req));
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('NOT_FOUND') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // POST /api/v1/tenant/cms/announcements/:id/archive - Archive announcement
  router.post('/:id/archive', requirePermission(PERMISSIONS.ANNOUNCEMENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await announcementService.archiveAnnouncement(tenant.id, req.params.id, actor, getContext(req));
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('NOT_FOUND') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // DELETE /api/v1/tenant/cms/announcements/:id - Delete announcement
  router.delete('/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      await announcementService.deleteAnnouncement(tenant.id, req.params.id, actor, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('NOT_FOUND') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  return router;
}
