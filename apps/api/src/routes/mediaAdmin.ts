import express, { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { MediaService } from '../services/mediaService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';
import {
  PERMISSIONS,
  MediaQuerySchema,
  CreateMediaSchema,
  UpdateMediaSchema,
} from '@school/shared';

export function createMediaAdminRouter(
  mediaService: MediaService,
  authRepository: IAuthRepository
): Router {
  const router = express.Router();
  const membershipGuard = createTenantMembershipGuard(authRepository);

  // All endpoints require authentication and active tenant membership
  router.use(requireAuth);
  router.use(membershipGuard);

  // GET /api/v1/tenant/cms/media (List media assets with filters and pagination)
  router.get(
    '/',
    requirePermission(PERMISSIONS.MEDIA_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const queryParsed = MediaQuerySchema.safeParse(req.query);
        if (!queryParsed.success) {
          res.status(400).json({ success: false, error: { code: 'INVALID_QUERY', message: 'Invalid query parameters', details: queryParsed.error.issues } });
          return;
        }

        const data = await mediaService.listMedia(tenantId, queryParsed.data);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/v1/tenant/cms/media/:id (Get single asset metadata)
  router.get(
    '/:id',
    requirePermission(PERMISSIONS.MEDIA_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const asset = await mediaService.getMediaById(tenantId, req.params.id);
        if (!asset) {
          res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' } });
          return;
        }

        res.json({ success: true, data: asset });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/v1/tenant/cms/media/:id/file (Secure file access for private/public documents)
  router.get(
    '/:id/file',
    requirePermission(PERMISSIONS.MEDIA_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const result = await mediaService.getPrivateMedia(tenantId, req.params.id, {
          id: req.user!.id,
          email: req.user!.email,
        });

        res.setHeader('Content-Type', result.asset.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${result.asset.title}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');

        if (result.filePath && fs.existsSync(result.filePath)) {
          fs.createReadStream(result.filePath).pipe(res);
        } else {
          // Virtual file representation if raw buffer on disk was simulated
          res.send(Buffer.from(`[MEDIA FILE DATA: ${result.asset.title}]`));
        }
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' } });
          return;
        }
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/media (Upload or register media asset)
  router.post(
    '/',
    requirePermission(PERMISSIONS.MEDIA_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;

        // Support JSON payload with optional base64 content
        const { fileBase64, ...meta } = req.body;
        let fileBuffer: Buffer | undefined;

        if (fileBase64 && typeof fileBase64 === 'string') {
          fileBuffer = Buffer.from(fileBase64, 'base64');
          meta.fileSizeBytes = fileBuffer.length;
        }

        if (!meta.fileSizeBytes) {
          meta.fileSizeBytes = meta.fileSize || 1024; // default size if not provided
        }

        if (!meta.storageKey) {
          meta.storageKey = meta.storagePath || `uploads/media-${Date.now()}.bin`;
        }

        const parsed = CreateMediaSchema.safeParse(meta);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid media asset configuration',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const asset = await mediaService.uploadMedia(
          tenantId,
          { id: req.user!.id, email: req.user!.email },
          {
            ...parsed.data,
            fileBuffer,
            fileName: meta.fileName || `${parsed.data.title.toLowerCase().replace(/\s+/g, '-')}`,
          }
        );

        res.status(201).json({ success: true, data: asset });
      } catch (err: any) {
        if (err.message && (err.message.includes('ACCESSIBILITY_ERROR') || err.message.includes('UNSUPPORTED_MIME_TYPE') || err.message.includes('FILE_TOO_LARGE'))) {
          res.status(400).json({ success: false, error: { code: 'MEDIA_VALIDATION_ERROR', message: err.message } });
          return;
        }
        next(err);
      }
    }
  );

  // PUT /api/v1/tenant/cms/media/:id (Update media metadata)
  router.put(
    '/:id',
    requirePermission(PERMISSIONS.MEDIA_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const parsed = UpdateMediaSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid update payload',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const asset = await mediaService.updateMedia(
          tenantId,
          req.params.id,
          parsed.data,
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, data: asset });
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' } });
          return;
        }
        if (err.message && err.message.includes('ACCESSIBILITY_ERROR')) {
          res.status(400).json({ success: false, error: { code: 'ACCESSIBILITY_ERROR', message: err.message } });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/v1/tenant/cms/media/:id (Delete asset)
  router.delete(
    '/:id',
    requirePermission(PERMISSIONS.MEDIA_DELETE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        await mediaService.deleteMedia(tenantId, req.params.id, {
          id: req.user!.id,
          email: req.user!.email,
        });

        res.json({ success: true, message: 'Media asset deleted successfully' });
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' } });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
