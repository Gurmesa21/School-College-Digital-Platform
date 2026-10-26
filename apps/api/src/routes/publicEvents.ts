import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PaginatedData,
  ResolvedTenant,
  EventQuerySchema,
  PublicEventItemDto,
} from '@school/shared';
import { EventService } from '../services/eventService.js';

export function createPublicEventsRouter(eventService: EventService): Router {
  const router = Router();

  // GET /api/v1/tenant/public/events - List public calendar events
  router.get('/', async (req: Request, res: Response) => {
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
      const result = await eventService.listPublicEvents(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<PublicEventItemDto>> = {
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

  // GET /api/v1/tenant/public/events/:slug/ics - Download iCalendar .ics file
  router.get('/:slug/ics', async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await eventService.getPublicEventBySlug(tenant.id, req.params.slug);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found or not published', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }

      const icsData = eventService.generateIcs(item);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${item.slug}.ics"`);
      res.status(200).send(icsData);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // GET /api/v1/tenant/public/events/:slug - Get published event detail
  router.get('/:slug', async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await eventService.getPublicEventBySlug(tenant.id, req.params.slug);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found or not published', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
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

  return router;
}
