import express, { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { MediaService } from '../services/mediaService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import { LocalStorageProvider } from '../storage/storageProvider.js';
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

  // Signed URL direct download route (does not require session cookie because it validates HMAC signature)
  router.get('/download-signed', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req.query.tenantId as string) || req.tenant?.id;
      const storageKey = req.query.key as string;
      const expires = parseInt(req.query.expires as string, 10);
      const uid = (req.query.uid as string) || '';
      const signature = req.query.sig as string;

      if (!tenantId || !storageKey || !expires || !signature) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_SIGNED_URL', message: 'Missing required signature parameters.' },
        });
        return;
      }

      const provider = mediaService.getStorageProvider();
      if (provider instanceof LocalStorageProvider) {
        const isValid = provider.verifySignedDownloadToken(tenantId, storageKey, expires, uid, signature);
        if (!isValid) {
          res.status(403).json({
            success: false,
            error: { code: 'EXPIRED_OR_INVALID_SIGNATURE', message: 'The download signature is invalid or has expired.' },
          });
          return;
        }
      }

      const queryResult = await mediaService.listMedia(tenantId, { page: 1, limit: 100 });
      const asset = queryResult.items.find((a) => a.storageKey === storageKey);
      if (!asset) {
        res.status(404).json({ success: false, error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found.' } });
        return;
      }

      const readResult = await provider.read(tenantId, storageKey, asset.storagePolicy);
      if (!readResult) {
        res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Storage file not found.' } });
        return;
      }

      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${asset.title}"`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store');

      if (readResult.filePath && fs.existsSync(readResult.filePath)) {
        fs.createReadStream(readResult.filePath).pipe(res);
      } else {
        res.send(readResult.buffer);
      }
    } catch (err) {
      next(err);
    }
  });

  // All subsequent administrative endpoints require authentication and active tenant membership
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
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_QUERY',
              message: 'Invalid query parameters',
              details: queryParsed.error.issues,
            },
          });
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
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
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
        res.setHeader('Cache-Control', 'private, no-cache, no-store');

        if (result.filePath && fs.existsSync(result.filePath)) {
          fs.createReadStream(result.filePath).pipe(res);
        } else {
          res.send(result.buffer);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
          return;
        }
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/media/:id/signed-url (Generate short-lived signed download URL)
  router.post(
    '/:id/signed-url',
    requirePermission(PERMISSIONS.MEDIA_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const expiresInSeconds = req.body?.expiresInSeconds ? parseInt(req.body.expiresInSeconds, 10) : 900;

        const signedResult = await mediaService.generateSignedDownloadUrl(
          tenantId,
          req.params.id,
          { id: req.user!.id, email: req.user!.email },
          expiresInSeconds
        );

        res.json({
          success: true,
          data: signedResult,
        });
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
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
        const { fileBase64, ...meta } = req.body;
        let fileBuffer: Buffer | undefined;

        if (fileBase64 && typeof fileBase64 === 'string') {
          fileBuffer = Buffer.from(fileBase64, 'base64');
          meta.fileSizeBytes = fileBuffer.length;
        }

        if (meta.fileSizeBytes === undefined) {
          meta.fileSizeBytes = meta.fileSize !== undefined ? meta.fileSize : 1024;
        }

        if (!meta.storageKey) {
          meta.storageKey = meta.storagePath || `pending-${Date.now()}`;
        }

        const parsed = CreateMediaSchema.safeParse(meta);
        if (!parsed.success) {
          const firstMsg = parsed.error.issues[0]?.message || 'Invalid media asset configuration';
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: firstMsg,
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
        if (
          err.message &&
          (err.message.includes('ACCESSIBILITY_ERROR') ||
            err.message.includes('FILE_VALIDATION_ERROR') ||
            err.message.includes('UNSUPPORTED_MIME_TYPE') ||
            err.message.includes('FILE_TOO_LARGE') ||
            err.message.includes('CONTENT_SIGNATURE_MISMATCH') ||
            err.message.includes('EMPTY_FILE'))
        ) {
          res.status(400).json({
            success: false,
            error: { code: 'MEDIA_VALIDATION_ERROR', message: err.message },
          });
          return;
        }
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/media/:id/replace (Safe 2-phase replacement)
  router.post(
    '/:id/replace',
    requirePermission(PERMISSIONS.MEDIA_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const { fileBase64, mimeType, fileName, title } = req.body;

        if (!fileBase64 || !mimeType) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'fileBase64 and mimeType are required for file replacement',
            },
          });
          return;
        }

        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const updated = await mediaService.replaceMedia(
          tenantId,
          req.params.id,
          {
            fileBuffer,
            mimeType,
            fileName,
            title,
          },
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, data: updated });
      } catch (err: any) {
        if (err.message && err.message.includes('MEDIA_NOT_FOUND')) {
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
          return;
        }
        if (
          err.message &&
          (err.message.includes('FILE_VALIDATION_ERROR') ||
            err.message.includes('CONTENT_SIGNATURE_MISMATCH') ||
            err.message.includes('EMPTY_FILE') ||
            err.message.includes('FILE_TOO_LARGE'))
        ) {
          res.status(400).json({
            success: false,
            error: { code: 'MEDIA_VALIDATION_ERROR', message: err.message },
          });
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
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
          return;
        }
        if (err.message && err.message.includes('ACCESSIBILITY_ERROR')) {
          res.status(400).json({
            success: false,
            error: { code: 'ACCESSIBILITY_ERROR', message: err.message },
          });
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
          res.status(404).json({
            success: false,
            error: { code: 'MEDIA_NOT_FOUND', message: 'Media asset not found' },
          });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
