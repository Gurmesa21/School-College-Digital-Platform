import { prisma, PageStatus, AnnouncementAudience, MediaCategory } from '@school/db';
import {
  SearchResultType,
  SearchResultItemDto,
  SearchQueryDto,
  SearchResponseData,
  SearchFacetsDto,
} from '@school/shared';
import { ICmsRepository } from './cmsRepository.js';
import { IAcademicRepository } from './academicRepository.js';
import { IStaffRepository } from './staffRepository.js';
import { INewsRepository } from './newsRepository.js';
import { IEventRepository } from './eventRepository.js';
import { IAnnouncementRepository } from './announcementRepository.js';
import { IMediaRepository } from './mediaRepository.js';
import { IFormRepository } from './formRepository.js';

export interface ISearchRepository {
  search(tenantId: string, query: SearchQueryDto): Promise<SearchResponseData>;
}

export function computeRelevanceScore(
  query: string,
  title: string,
  summary?: string | null,
  content?: string | null
): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();
  let score = 0;

  if (t === q) {
    score += 100;
  } else if (t.startsWith(q)) {
    score += 80;
  } else if (t.includes(q)) {
    score += 50;
  } else {
    const qWords = q.split(' ').filter(Boolean);
    const matches = qWords.filter((w) => t.includes(w)).length;
    score += matches * 20;
  }

  if (summary) {
    const s = summary.toLowerCase();
    if (s.includes(q)) {
      score += 25;
    }
  }

  if (content) {
    const c = content.toLowerCase();
    if (c.includes(q)) {
      score += 10;
    }
  }

  return score;
}

export class PrismaSearchRepository implements ISearchRepository {
  async search(tenantId: string, query: SearchQueryDto): Promise<SearchResponseData> {
    const now = new Date();
    const term = query.q.trim();

    // 1. Query all searchable content types concurrently in parallel
    const [
      pages,
      programmes,
      staffProfiles,
      newsArticles,
      events,
      announcements,
      documents,
      forms,
    ] = await Promise.all([
      // A. Published Pages
      prisma.page.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { summary: { contains: term, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          createdAt: true,
        },
        take: 100,
      }),

      // B. Published Programmes (with tuition privacy checks)
      prisma.programme.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          isActive: true,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { summary: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { curriculum: { contains: term, mode: 'insensitive' } },
            { qualificationsAwarded: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          department: { select: { name: true } },
          level: { select: { name: true } },
        },
        take: 100,
      }),

      // C. Published Staff Profiles (with contact privacy checks)
      prisma.staffProfile.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          isActive: true,
          OR: [
            { fullName: { contains: term, mode: 'insensitive' } },
            { roleTitle: { contains: term, mode: 'insensitive' } },
            { biography: { contains: term, mode: 'insensitive' } },
            { qualifications: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          department: { select: { name: true } },
        },
        take: 100,
      }),

      // D. Published News Articles (within active publication window)
      prisma.newsArticle.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          publishedAt: { lte: now },
          OR: [{ archivedAt: null }, { archivedAt: { gt: now } }],
          AND: [
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { summary: { contains: term, mode: 'insensitive' } },
                { body: { contains: term, mode: 'insensitive' } },
              ],
            },
          ],
        },
        take: 100,
      }),

      // E. Published Events
      prisma.eventItem.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { location: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 100,
      }),

      // F. Published General Announcements (active time window)
      prisma.announcement.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          audience: AnnouncementAudience.GENERAL,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { content: { contains: term, mode: 'insensitive' } },
              ],
            },
          ],
        },
        take: 100,
      }),

      // G. Public Documents
      prisma.mediaAsset.findMany({
        where: {
          tenantId,
          category: MediaCategory.DOCUMENT,
          isPublic: true,
          storagePolicy: 'PUBLIC',
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { caption: { contains: term, mode: 'insensitive' } },
            { altText: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 100,
      }),

      // H. Published Public Forms
      prisma.form.findMany({
        where: {
          tenantId,
          isPublished: true,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 100,
      }),
    ]);

    // 2. Transform into unified SearchResultItemDto with privacy protection
    const allResults: SearchResultItemDto[] = [];

    // Pages
    for (const p of pages) {
      allResults.push({
        id: p.id,
        type: 'PAGE',
        title: p.title,
        summary: p.summary,
        url: `/${p.slug}`,
        slug: p.slug,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : p.createdAt.toISOString(),
        score: computeRelevanceScore(term, p.title, p.summary),
      });
    }

    // Programmes
    for (const prog of programmes) {
      allResults.push({
        id: prog.id,
        type: 'PROGRAMME',
        title: prog.title,
        summary: prog.summary,
        url: `/academics/${prog.slug}`,
        slug: prog.slug,
        publishedAt: prog.publishedAt ? prog.publishedAt.toISOString() : prog.createdAt.toISOString(),
        score: computeRelevanceScore(term, prog.title, prog.summary, prog.description),
        metadata: {
          departmentName: prog.department?.name || null,
          levelName: prog.level?.name || null,
          displayTuition: prog.displayTuition,
          // Strict Tuition Privacy Rule
          tuitionFee: prog.displayTuition ? prog.tuitionFee : null,
          tuitionCurrency: prog.displayTuition ? prog.tuitionCurrency : null,
          tuitionPeriod: prog.displayTuition ? prog.tuitionPeriod : null,
        },
      });
    }

    // Staff Profiles
    for (const s of staffProfiles) {
      allResults.push({
        id: s.id,
        type: 'STAFF',
        title: s.fullName,
        summary: s.biography ? s.biography.slice(0, 160) : `${s.roleTitle}${s.department ? ` - ${s.department.name}` : ''}`,
        url: `/staff/${s.slug}`,
        slug: s.slug,
        publishedAt: s.publishedAt ? s.publishedAt.toISOString() : s.createdAt.toISOString(),
        score: computeRelevanceScore(term, s.fullName, s.roleTitle, s.biography),
        metadata: {
          roleTitle: s.roleTitle,
          departmentName: s.department?.name || null,
          displayEmail: s.displayEmail,
          displayPhone: s.displayPhone,
          // Strict Staff Privacy Rule: redact unless explicitly approved
          publicEmail: s.displayEmail && s.publicEmail ? s.publicEmail : null,
          publicPhone: s.displayPhone && s.publicPhone ? s.publicPhone : null,
        },
      });
    }

    // News Articles
    for (const n of newsArticles) {
      allResults.push({
        id: n.id,
        type: 'NEWS',
        title: n.title,
        summary: n.summary,
        url: `/news/${n.slug}`,
        slug: n.slug,
        publishedAt: n.publishedAt ? n.publishedAt.toISOString() : n.createdAt.toISOString(),
        score: computeRelevanceScore(term, n.title, n.summary, n.body),
        metadata: {
          tags: n.tags,
        },
      });
    }

    // Events
    for (const e of events) {
      allResults.push({
        id: e.id,
        type: 'EVENT',
        title: e.title,
        summary: e.description,
        url: `/events/${e.slug}`,
        slug: e.slug,
        publishedAt: e.startsAt.toISOString(),
        score: computeRelevanceScore(term, e.title, e.description, e.location),
        metadata: {
          eventDate: e.startsAt.toISOString(),
          eventLocation: e.location || null,
          category: e.category,
        },
      });
    }

    // Announcements
    for (const a of announcements) {
      allResults.push({
        id: a.id,
        type: 'ANNOUNCEMENT',
        title: a.title,
        summary: a.content.slice(0, 160),
        url: `/news#announcement-${a.id}`,
        slug: `announcement-${a.id}`,
        publishedAt: a.createdAt.toISOString(),
        score: computeRelevanceScore(term, a.title, a.content),
      });
    }

    // Documents
    for (const d of documents) {
      allResults.push({
        id: d.id,
        type: 'DOCUMENT',
        title: d.title,
        summary: d.caption || d.altText || 'Downloadable Institutional Document',
        url: d.publicUrl || `/api/v1/tenant/public/media/${d.id}/file`,
        slug: d.id,
        publishedAt: d.createdAt.toISOString(),
        score: computeRelevanceScore(term, d.title, d.caption, d.altText),
        metadata: {
          fileSizeBytes: d.fileSizeBytes,
          mimeType: d.mimeType,
        },
      });
    }

    // Forms
    for (const f of forms) {
      allResults.push({
        id: f.id,
        type: 'FORM',
        title: f.title,
        summary: f.description,
        url: `/forms/${f.slug}`,
        slug: f.slug,
        publishedAt: f.createdAt.toISOString(),
        score: computeRelevanceScore(term, f.title, f.description),
      });
    }

    // 3. Calculate Facets across all matching content types
    const facets: SearchFacetsDto = {
      totalByContentType: {
        PAGE: allResults.filter((r) => r.type === 'PAGE').length,
        PROGRAMME: allResults.filter((r) => r.type === 'PROGRAMME').length,
        STAFF: allResults.filter((r) => r.type === 'STAFF').length,
        NEWS: allResults.filter((r) => r.type === 'NEWS').length,
        EVENT: allResults.filter((r) => r.type === 'EVENT').length,
        ANNOUNCEMENT: allResults.filter((r) => r.type === 'ANNOUNCEMENT').length,
        DOCUMENT: allResults.filter((r) => r.type === 'DOCUMENT').length,
        FORM: allResults.filter((r) => r.type === 'FORM').length,
      },
    };

    // 4. Filter by requested type if specified
    let filtered = allResults;
    if (query.type !== 'ALL') {
      filtered = allResults.filter((r) => r.type === query.type);
    }

    // 5. Apply Sorting
    filtered.sort((a, b) => {
      if (query.sort === 'newest') {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      }
      if (query.sort === 'oldest') {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return da - db;
      }
      if (query.sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      // Default: relevance
      const diff = (b.score || 0) - (a.score || 0);
      if (diff !== 0) return diff;
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    // 6. Pagination
    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;
    const paginatedItems = filtered.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      query: term,
      type: query.type,
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      facets,
    };
  }
}

export interface InMemorySearchDependencies {
  cmsRepo?: ICmsRepository;
  academicRepo?: IAcademicRepository;
  staffRepo?: IStaffRepository;
  newsRepo?: INewsRepository;
  eventRepo?: IEventRepository;
  announcementRepo?: IAnnouncementRepository;
  mediaRepo?: IMediaRepository;
  formRepo?: IFormRepository;
}

export class InMemorySearchRepository implements ISearchRepository {
  private customItems: Array<{ tenantId: string; item: SearchResultItemDto }> = [];

  constructor(private readonly deps: InMemorySearchDependencies = {}) {}

  addMockItem(tenantId: string, item: SearchResultItemDto): void {
    this.customItems.push({ tenantId, item });
  }

  async search(tenantId: string, query: SearchQueryDto): Promise<SearchResponseData> {
    const now = new Date();
    const normalizedTerm = query.q.trim();
    const term = normalizedTerm.toLowerCase();
    const allResults: SearchResultItemDto[] = [];

    // A. CMS Pages from cmsRepo
    if (this.deps.cmsRepo && (this.deps.cmsRepo as any).pages) {
      const pagesMap = (this.deps.cmsRepo as any).pages as Map<string, any>;
      for (const p of pagesMap.values()) {
        if (p.tenantId !== tenantId) continue;
        if (p.status !== 'PUBLISHED') continue;
        if (p.publishedAt && new Date(p.publishedAt) > now) continue;
        if (p.expiresAt && new Date(p.expiresAt) <= now) continue;

        const titleMatch = (p.title || '').toLowerCase().includes(term);
        const summaryMatch = (p.summary || '').toLowerCase().includes(term);
        if (titleMatch || summaryMatch) {
          allResults.push({
            id: p.id,
            type: 'PAGE',
            title: p.title,
            summary: p.summary,
            url: `/${p.slug}`,
            slug: p.slug,
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : new Date(p.createdAt).toISOString(),
            score: computeRelevanceScore(term, p.title, p.summary),
          });
        }
      }
    }

    // B. Academic Programmes from academicRepo
    if (this.deps.academicRepo) {
      try {
        const res = await this.deps.academicRepo.listPublicProgrammes(tenantId, { page: 1, limit: 100, search: term });
        for (const prog of res.items) {
          allResults.push({
            id: prog.id,
            type: 'PROGRAMME',
            title: prog.title,
            summary: prog.summary ?? null,
            url: `/academics/${prog.slug}`,
            slug: prog.slug,
            score: computeRelevanceScore(term, prog.title, prog.summary, prog.description),
            metadata: {
              departmentName: prog.department?.name || null,
              levelName: prog.level?.name || null,
              displayTuition: prog.displayTuition,
              tuitionFee: prog.tuitionFee,
              tuitionCurrency: prog.tuitionCurrency,
              tuitionPeriod: prog.tuitionPeriod,
            },
          });
        }
      } catch {
        // Continue if repo list error
      }
    }

    // C. Staff from staffRepo
    if (this.deps.staffRepo) {
      try {
        const res = await this.deps.staffRepo.listPublicStaff(tenantId, { page: 1, limit: 100, search: term });
        for (const s of res.items) {
          allResults.push({
            id: s.id,
            type: 'STAFF',
            title: s.fullName,
            summary: s.biography ? s.biography.slice(0, 160) : s.roleTitle,
            url: `/staff/${s.slug}`,
            slug: s.slug,
            score: computeRelevanceScore(term, s.fullName, s.roleTitle, s.biography),
            metadata: {
              roleTitle: s.roleTitle,
              departmentName: s.department?.name || null,
              displayEmail: Boolean(s.publicEmail),
              displayPhone: Boolean(s.publicPhone),
              publicEmail: s.publicEmail || null,
              publicPhone: s.publicPhone || null,
            },
          });
        }
      } catch {
        // Continue if repo list error
      }
    }

    // D. News from newsRepo
    if (this.deps.newsRepo) {
      try {
        const res = await this.deps.newsRepo.listPublicNews(tenantId, { page: 1, limit: 100, search: term });
        for (const n of res.items) {
          allResults.push({
            id: n.id,
            type: 'NEWS',
            title: n.title,
            summary: n.summary ?? null,
            url: `/news/${n.slug}`,
            slug: n.slug,
            publishedAt: n.publishedAt,
            score: computeRelevanceScore(term, n.title, n.summary),
            metadata: {
              tags: n.tags,
            },
          });
        }
      } catch {
        // Continue if repo list error
      }
    }

    // E. Events from eventRepo
    if (this.deps.eventRepo) {
      try {
        const res = await this.deps.eventRepo.listPublicEvents(tenantId, { page: 1, limit: 100, timeframe: 'all', search: term });
        for (const e of res.items) {
          allResults.push({
            id: e.id,
            type: 'EVENT',
            title: e.title,
            summary: e.description ?? null,
            url: `/events/${e.slug}`,
            slug: e.slug,
            publishedAt: e.startsAt,
            score: computeRelevanceScore(term, e.title, e.description, e.location),
            metadata: {
              eventDate: e.startsAt,
              eventLocation: e.location || null,
              category: e.category,
            },
          });
        }
      } catch {
        // Continue if repo list error
      }
    }

    // F. Announcements from announcementRepo
    if (this.deps.announcementRepo) {
      try {
        const res = await this.deps.announcementRepo.listPublicActiveAnnouncements(tenantId);
        for (const a of res) {
          const titleMatch = (a.title || '').toLowerCase().includes(term);
          const contentMatch = (a.content || '').toLowerCase().includes(term);
          if (titleMatch || contentMatch) {
            allResults.push({
              id: a.id,
              type: 'ANNOUNCEMENT',
              title: a.title,
              summary: a.content.slice(0, 160),
              url: `/news#announcement-${a.id}`,
              slug: `announcement-${a.id}`,
              publishedAt: a.createdAt,
              score: computeRelevanceScore(term, a.title, a.content),
            });
          }
        }
      } catch {
        // Continue if repo list error
      }
    }

    // G. Documents from mediaRepo
    if (this.deps.mediaRepo) {
      try {
        const res = await this.deps.mediaRepo.listMedia(tenantId, { page: 1, limit: 100, category: 'DOCUMENT' });
        for (const m of res.items) {
          if (!m.isPublic || m.storagePolicy !== 'PUBLIC') continue;
          const titleMatch = (m.title || '').toLowerCase().includes(term);
          const captionMatch = (m.caption || '').toLowerCase().includes(term);
          const altMatch = (m.altText || '').toLowerCase().includes(term);
          if (titleMatch || captionMatch || altMatch) {
            allResults.push({
              id: m.id,
              type: 'DOCUMENT',
              title: m.title,
              summary: m.caption || m.altText || 'Downloadable Institutional Document',
              url: m.publicUrl || `/api/v1/tenant/public/media/${m.id}/file`,
              slug: m.id,
              publishedAt: m.createdAt,
              score: computeRelevanceScore(term, m.title, m.caption, m.altText),
              metadata: {
                fileSizeBytes: m.fileSizeBytes,
                mimeType: m.mimeType,
              },
            });
          }
        }
      } catch {
        // Continue if repo list error
      }
    }

    // H. Forms from formRepo
    if (this.deps.formRepo) {
      try {
        const res = await this.deps.formRepo.listForms(tenantId);
        for (const f of res) {
          if (!f.isPublished) continue;
          const titleMatch = (f.title || '').toLowerCase().includes(term);
          const descMatch = (f.description || '').toLowerCase().includes(term);
          if (titleMatch || descMatch) {
            allResults.push({
              id: f.id,
              type: 'FORM',
              title: f.title,
              summary: f.description,
              url: `/forms/${f.slug}`,
              slug: f.slug,
              publishedAt: f.createdAt,
              score: computeRelevanceScore(term, f.title, f.description),
            });
          }
        }
      } catch {
        // Continue if repo list error
      }
    }

    // I. Custom / Mock items
    for (const custom of this.customItems) {
      if (custom.tenantId === tenantId) {
        const titleMatch = custom.item.title.toLowerCase().includes(term);
        const summaryMatch = (custom.item.summary || '').toLowerCase().includes(term);
        if (titleMatch || summaryMatch) {
          allResults.push({
            ...custom.item,
            score: computeRelevanceScore(term, custom.item.title, custom.item.summary),
          });
        }
      }
    }

    // Facets
    const facets: SearchFacetsDto = {
      totalByContentType: {
        PAGE: allResults.filter((r) => r.type === 'PAGE').length,
        PROGRAMME: allResults.filter((r) => r.type === 'PROGRAMME').length,
        STAFF: allResults.filter((r) => r.type === 'STAFF').length,
        NEWS: allResults.filter((r) => r.type === 'NEWS').length,
        EVENT: allResults.filter((r) => r.type === 'EVENT').length,
        ANNOUNCEMENT: allResults.filter((r) => r.type === 'ANNOUNCEMENT').length,
        DOCUMENT: allResults.filter((r) => r.type === 'DOCUMENT').length,
        FORM: allResults.filter((r) => r.type === 'FORM').length,
      },
    };

    // Filter by type if requested
    let filtered = allResults;
    if (query.type !== 'ALL') {
      filtered = allResults.filter((r) => r.type === query.type);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (query.sort === 'newest') {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      }
      if (query.sort === 'oldest') {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return da - db;
      }
      if (query.sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      const diff = (b.score || 0) - (a.score || 0);
      if (diff !== 0) return diff;
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    // Pagination
    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;
    const paginatedItems = filtered.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      query: normalizedTerm,
      type: query.type,
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      facets,
    };
  }
}
