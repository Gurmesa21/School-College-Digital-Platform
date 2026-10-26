import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PaginatedData,
  PERMISSIONS,
  ResolvedTenant,
  CreateNewsArticleSchema,
  UpdateNewsArticleSchema,
  NewsArticleQuerySchema,
  NewsArticleDto,
} from '@school/shared';
import { NewsService, NewsAuditContext } from '../services/newsService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createNewsAdminRouter(
  newsService: NewsService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  const getContext = (req: Request): NewsAuditContext => ({
    actorId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id || null,
  });

  // GET /api/v1/tenant/cms/news - List news articles
  router.get('/', requirePermission(PERMISSIONS.NEWS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = NewsArticleQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid news query parameters',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const result = await newsService.listNews(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<NewsArticleDto>> = {
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

  // GET /api/v1/tenant/cms/news/:id - Get news article detail
  router.get('/:id', requirePermission(PERMISSIONS.NEWS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await newsService.getNewsById(tenant.id, req.params.id);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'NEWS_NOT_FOUND', message: 'News article not found', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
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

  // POST /api/v1/tenant/cms/news - Create news article
  router.post('/', requirePermission(PERMISSIONS.NEWS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = CreateNewsArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid news article data',
          details: parsed.error.format(),
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await newsService.createNews(tenant.id, actor, parsed.data, getContext(req));
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

  // PUT /api/v1/tenant/cms/news/:id - Update news article
  router.put('/:id', requirePermission(PERMISSIONS.NEWS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = UpdateNewsArticleSchema.safeParse(req.body);
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
      const item = await newsService.updateNews(tenant.id, req.params.id, actor, parsed.data, getContext(req));
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

  // POST /api/v1/tenant/cms/news/:id/publish - Publish news article
  router.post('/:id/publish', requirePermission(PERMISSIONS.NEWS_PUBLISH), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await newsService.publishNews(tenant.id, req.params.id, actor, getContext(req));
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

  // POST /api/v1/tenant/cms/news/:id/archive - Archive news article
  router.post('/:id/archive', requirePermission(PERMISSIONS.NEWS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      const item = await newsService.archiveNews(tenant.id, req.params.id, actor, getContext(req));
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

  // DELETE /api/v1/tenant/cms/news/:id - Delete news article
  router.delete('/:id', requirePermission(PERMISSIONS.NEWS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const actor = { id: req.user!.id, email: req.user!.email };
      await newsService.deleteNews(tenant.id, req.params.id, actor, getContext(req));
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
