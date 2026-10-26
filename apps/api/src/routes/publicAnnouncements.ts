import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ResolvedTenant,
  PublicAnnouncementDto,
} from '@school/shared';
import { AnnouncementService } from '../services/announcementService.js';

export function createPublicAnnouncementsRouter(announcementService: AnnouncementService): Router {
  const router = Router();

  // GET /api/v1/tenant/public/announcements - List active public announcements
  router.get('/', async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const items = await announcementService.listPublicActiveAnnouncements(tenant.id);
      const response: ApiResponse<PublicAnnouncementDto[]> = {
        success: true,
        data: items,
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

  return router;
}
