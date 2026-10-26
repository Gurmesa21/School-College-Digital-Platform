import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PaginatedData,
  ResolvedTenant,
  NewsArticleQuerySchema,
  PublicNewsArticleDto,
} from '@school/shared';
import { NewsService } from '../services/newsService.js';

export function createPublicNewsRouter(newsService: NewsService): Router {
  const router = Router();

  // GET /api/v1/tenant/public/news/archive - Archive timeline summary
  router.get('/archive', async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const summary = await newsService.getArchiveSummary(tenant.id);
      res.status(200).json({
        success: true,
        data: summary,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // GET /api/v1/tenant/public/news - List published news
  router.get('/', async (req: Request, res: Response) => {
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
      const result = await newsService.listPublicNews(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<PublicNewsArticleDto>> = {
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

  // GET /api/v1/tenant/public/news/:slug - Get published article detail
  router.get('/:slug', async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await newsService.getPublicNewsBySlug(tenant.id, req.params.slug);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'NEWS_NOT_FOUND', message: 'News article not found or not published', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
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
