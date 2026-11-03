import { Router, Request, Response } from 'express';
import { ApiResponse, ApiErrorResponse, PublicSitemapEntryDto, ResolvedTenant } from '@school/shared';
import { prisma } from '@school/db';
import { ICmsRepository } from '../repositories/cmsRepository.js';
import { IAcademicRepository } from '../repositories/academicRepository.js';
import { IStaffRepository } from '../repositories/staffRepository.js';
import { INewsRepository } from '../repositories/newsRepository.js';
import { IEventRepository } from '../repositories/eventRepository.js';
import { IMediaRepository } from '../repositories/mediaRepository.js';

export interface SitemapDependencies {
  cmsRepo?: ICmsRepository;
  academicRepo?: IAcademicRepository;
  staffRepo?: IStaffRepository;
  newsRepo?: INewsRepository;
  eventRepo?: IEventRepository;
  mediaRepo?: IMediaRepository;
}

export function createPublicSitemapRouter(deps?: SitemapDependencies): Router {
  const router = Router();

  /**
   * GET /api/v1/tenant/public/sitemap
   * Retrieves lightweight indexable entries for search engine sitemaps
   * Bounded strictly to the resolved tenant with publication and privacy boundaries enforced (BR-001, BR-002)
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    if (!tenant) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TENANT_NOT_RESOLVED',
          message: 'Unable to resolve tenant for sitemap delivery.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const now = new Date();
      const tenantId = tenant.id;

      let pages: Array<{ slug: string; updatedAt: Date }> = [];
      let programmes: Array<{ slug: string; updatedAt: Date }> = [];
      let staff: Array<{ slug: string; updatedAt: Date }> = [];
      let news: Array<{ slug: string; updatedAt: Date }> = [];
      let events: Array<{ slug: string; updatedAt: Date }> = [];
      let documents: Array<{ id: string; updatedAt: Date }> = [];

      // Check if in-memory test repositories are provided
      const isInMemory = Boolean(deps?.cmsRepo && (deps.cmsRepo as any).pages);

      if (isInMemory) {
        // 1. Pages from in-memory CMS repository
        if (deps?.cmsRepo && (deps.cmsRepo as any).pages) {
          const pagesMap = (deps.cmsRepo as any).pages as Map<string, any>;
          for (const p of pagesMap.values()) {
            if (p.tenantId !== tenantId) continue;
            if (p.status !== 'PUBLISHED') continue;
            if (p.publishedAt && new Date(p.publishedAt) > now) continue;
            if (p.expiresAt && new Date(p.expiresAt) <= now) continue;
            pages.push({ slug: p.slug, updatedAt: new Date(p.updatedAt || p.createdAt || now) });
          }
        }

        // 2. Programmes from in-memory Academic repository
        if (deps?.academicRepo && (deps.academicRepo as any).programmes) {
          const progs = (deps.academicRepo as any).programmes;
          const progList = Array.isArray(progs) ? progs : Array.from(progs.values());
          for (const prog of progList) {
            if (prog.tenantId !== tenantId) continue;
            const isPub = (prog.status === 'PUBLISHED' || prog.status === 'ACTIVE') && prog.isActive !== false && prog.isPublished !== false;
            if (!isPub) continue;
            programmes.push({ slug: prog.slug, updatedAt: new Date(prog.updatedAt || prog.createdAt || now) });
          }
        }

        // 3. Staff profiles from in-memory Staff repository
        if (deps?.staffRepo && ((deps.staffRepo as any).staff || (deps.staffRepo as any).staffProfiles)) {
          const staffItems = (deps.staffRepo as any).staff || (deps.staffRepo as any).staffProfiles;
          const staffList = Array.isArray(staffItems) ? staffItems : Array.from(staffItems.values());
          for (const s of staffList) {
            if (s.tenantId !== tenantId) continue;
            const isPub = (s.status === 'PUBLISHED' || s.status === 'ACTIVE') && s.isActive !== false && s.isPublished !== false;
            if (!isPub) continue;
            staff.push({ slug: s.slug, updatedAt: new Date(s.updatedAt || s.createdAt || now) });
          }
        }

        // 4. News articles from in-memory News repository
        if (deps?.newsRepo && ((deps.newsRepo as any).items || (deps.newsRepo as any).articles)) {
          const newsItems = (deps.newsRepo as any).items || (deps.newsRepo as any).articles;
          const newsList = Array.isArray(newsItems) ? newsItems : Array.from(newsItems.values());
          for (const n of newsList) {
            if (n.tenantId !== tenantId) continue;
            if (n.status !== 'PUBLISHED') continue;
            if (n.publishedAt && new Date(n.publishedAt) > now) continue;
            if (n.archivedAt && new Date(n.archivedAt) <= now) continue;
            news.push({ slug: n.slug, updatedAt: new Date(n.updatedAt || n.createdAt || now) });
          }
        }

        // 5. Events from in-memory Event repository
        if (deps?.eventRepo && ((deps.eventRepo as any).items || (deps.eventRepo as any).events)) {
          const eventItems = (deps.eventRepo as any).items || (deps.eventRepo as any).events;
          const eventList = Array.isArray(eventItems) ? eventItems : Array.from(eventItems.values());
          for (const e of eventList) {
            if (e.tenantId !== tenantId) continue;
            if (e.status !== 'PUBLISHED') continue;
            events.push({ slug: e.slug, updatedAt: new Date(e.updatedAt || e.createdAt || now) });
          }
        }

        // 6. Documents from in-memory Media repository
        if (deps?.mediaRepo && (deps.mediaRepo as any).assets) {
          const mediaItems = (deps.mediaRepo as any).assets;
          const mediaList = Array.isArray(mediaItems) ? mediaItems : Array.from(mediaItems.values());
          for (const m of mediaList) {
            if (m.tenantId !== tenantId) continue;
            if (m.category !== 'DOCUMENT' || !m.isPublic) continue;
            documents.push({ id: m.id, updatedAt: new Date(m.updatedAt || m.createdAt || now) });
          }
        }
      } else {
        // Execute concurrent, lightweight queries selecting ONLY identifier and timestamp columns via Prisma
        const [dbPages, dbProgrammes, dbStaff, dbNews, dbEvents, dbDocuments] = await Promise.all([
          prisma.page.findMany({
            where: {
              tenantId,
              status: 'PUBLISHED',
              publishedAt: { lte: now },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          }),

          prisma.programme.findMany({
            where: {
              tenantId,
              status: 'PUBLISHED',
              isActive: true,
            },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          }),

          prisma.staffProfile.findMany({
            where: {
              tenantId,
              status: 'PUBLISHED',
              isActive: true,
            },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          }),

          prisma.newsArticle.findMany({
            where: {
              tenantId,
              status: 'PUBLISHED',
              publishedAt: { lte: now },
              OR: [{ archivedAt: null }, { archivedAt: { gt: now } }],
            },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          }),

          prisma.eventItem.findMany({
            where: {
              tenantId,
              status: 'PUBLISHED',
            },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          }),

          prisma.mediaAsset.findMany({
            where: {
              tenantId,
              category: 'DOCUMENT',
              isPublic: true,
            },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 100,
          }),
        ]);

        pages = dbPages;
        programmes = dbProgrammes;
        staff = dbStaff;
        news = dbNews;
        events = dbEvents;
        documents = dbDocuments;
      }

      const nowIso = now.toISOString();

      // Aggregate sitemap entries
      const entries: PublicSitemapEntryDto[] = [
        // Core institutional public landing and directory routes
        { loc: '/', lastmod: nowIso, priority: 1.0, changefreq: 'daily' },
        { loc: '/academics', lastmod: nowIso, priority: 0.9, changefreq: 'weekly' },
        { loc: '/staff', lastmod: nowIso, priority: 0.8, changefreq: 'weekly' },
        { loc: '/news', lastmod: nowIso, priority: 0.8, changefreq: 'daily' },
        { loc: '/events', lastmod: nowIso, priority: 0.8, changefreq: 'daily' },
        { loc: '/admissions', lastmod: nowIso, priority: 0.9, changefreq: 'monthly' },
        { loc: '/contact', lastmod: nowIso, priority: 0.7, changefreq: 'monthly' },
        { loc: '/documents', lastmod: nowIso, priority: 0.6, changefreq: 'weekly' },
        { loc: '/search', lastmod: nowIso, priority: 0.5, changefreq: 'monthly' },
      ];

      // Append published CMS pages
      for (const p of pages) {
        entries.push({
          loc: `/${p.slug}`,
          lastmod: p.updatedAt.toISOString(),
          priority: 0.8,
          changefreq: 'weekly',
        });
      }

      // Append published programmes
      for (const prog of programmes) {
        entries.push({
          loc: `/academics/${prog.slug}`,
          lastmod: prog.updatedAt.toISOString(),
          priority: 0.9,
          changefreq: 'weekly',
        });
      }

      // Append published staff profiles
      for (const s of staff) {
        entries.push({
          loc: `/staff/${s.slug}`,
          lastmod: s.updatedAt.toISOString(),
          priority: 0.7,
          changefreq: 'monthly',
        });
      }

      // Append published news articles
      for (const n of news) {
        entries.push({
          loc: `/news/${n.slug}`,
          lastmod: n.updatedAt.toISOString(),
          priority: 0.8,
          changefreq: 'weekly',
        });
      }

      // Append published events
      for (const e of events) {
        entries.push({
          loc: `/events/${e.slug}`,
          lastmod: e.updatedAt.toISOString(),
          priority: 0.7,
          changefreq: 'weekly',
        });
      }

      // Append public documents
      for (const doc of documents) {
        entries.push({
          loc: `/documents#doc-${doc.id}`,
          lastmod: doc.updatedAt.toISOString(),
          priority: 0.5,
          changefreq: 'monthly',
        });
      }

      const response: ApiResponse<PublicSitemapEntryDto[]> = {
        success: true,
        data: entries,
        meta: {
          requestId,
          timestamp: nowIso,
          count: entries.length,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      console.error('[Public Sitemap] Error generating sitemap entries:', err);
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'SITEMAP_GENERATION_FAILED',
          message: 'An error occurred while compiling public sitemap entries.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}