import express, { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { MediaService } from '../services/mediaService.js';

export function createPublicMediaRouter(mediaService: MediaService): Router {
  const router = express.Router();

  // GET /api/v1/tenant/public/media/:id (JSON metadata or direct stream based on Accept header)
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const { id } = req.params;

      const result = await mediaService.getPublicMedia(tenantId, id);

      if (req.headers.accept?.includes('application/json') || req.query.info === 'true') {
        res.json({
          success: true,
          data: result.asset,
        });
        return;
      }

      res.setHeader('Content-Type', result.asset.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${result.asset.title}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

      if (result.filePath && fs.existsSync(result.filePath)) {
        fs.createReadStream(result.filePath).pipe(res);
      } else {
        res.send(result.buffer);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: 'Public media asset not found or access denied',
          },
        });
        return;
      }
      next(err);
    }
  });

  // GET /api/v1/tenant/public/media/:id/file (Direct asset file download/streaming)
  router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const { id } = req.params;

      const result = await mediaService.getPublicMedia(tenantId, id);

      res.setHeader('Content-Type', result.asset.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${result.asset.title}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

      if (result.filePath && fs.existsSync(result.filePath)) {
        fs.createReadStream(result.filePath).pipe(res);
      } else {
        res.send(result.buffer);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MEDIA_NOT_FOUND',
            message: 'Public media asset not found or access denied',
          },
        });
        return;
      }
      next(err);
    }
  });

  return router;
}
