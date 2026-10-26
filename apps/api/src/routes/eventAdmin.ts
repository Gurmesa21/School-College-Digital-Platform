import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PaginatedData,
  PERMISSIONS,
  ResolvedTenant,
  CreateEventSchema,
  UpdateEventSchema,
  EventQuerySchema,
  EventItemDto,
} from '@school/shared';
import { EventService, EventAuditContext } from '../services/eventService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createEventAdminRouter(
  eventService: EventService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  const getContext = (req: Request): EventAuditContext => ({
    actorId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id || null,
  });

  // GET /api/v1/tenant/cms/events - List events
  router.get('/', requirePermission(PERMISSIONS.EVENTS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = EventQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid event query parameters',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const result = await eventService.listEvents(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<EventItemDto>> = {
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

  // GET /api/v1/tenant/cms/events/:id - Get event detail
  router.get('/:id', requirePermission(PERMISSIONS.EVENTS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await eventService.getEventById(tenant.id, req.params.id);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
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

  // POST /api/v1/tenant/cms/events - Create event
  router.post('/', requirePermission(PERMISSIONS.EVENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = CreateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid event data',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await eventService.createEvent(tenant.id, actor, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('ALREADY_EXISTS') || err.message.includes('INVALID_') ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.includes('ALREADY_EXISTS') ? 'SLUG_CONFLICT' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // PUT /api/v1/tenant/cms/events/:id - Update event
  router.put('/:id', requirePermission(PERMISSIONS.EVENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = UpdateEventSchema.safeParse(req.body);
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
      const item = await eventService.updateEvent(tenant.id, req.params.id, actor, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const status = err.message.includes('NOT_FOUND') ? 404 : err.message.includes('ALREADY_EXISTS') ? 409 : 500;
      res.status(status).json({
        success: false,
        error: { code: err.message.includes('NOT_FOUND') ? 'NOT_FOUND' : 'ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // POST /api/v1/tenant/cms/events/:id/publish - Publish event
  router.post('/:id/publish', requirePermission(PERMISSIONS.EVENTS_PUBLISH), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await eventService.publishEvent(tenant.id, req.params.id, actor, getContext(req));
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

  // POST /api/v1/tenant/cms/events/:id/archive - Archive event
  router.post('/:id/archive', requirePermission(PERMISSIONS.EVENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await eventService.archiveEvent(tenant.id, req.params.id, actor, getContext(req));
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

  // DELETE /api/v1/tenant/cms/events/:id - Delete event
  router.delete('/:id', requirePermission(PERMISSIONS.EVENTS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      await eventService.deleteEvent(tenant.id, req.params.id, actor, getContext(req));
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
