import { prisma, PageStatus } from '@school/db';
import {
  NewsArticleDto,
  PublicNewsArticleDto,
  CreateNewsArticleDto,
  UpdateNewsArticleDto,
  NewsArticleQueryDto,
  PaginatedData,
} from '@school/shared';

export interface INewsRepository {
  listNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<NewsArticleDto>>;
  getNewsById(tenantId: string, id: string): Promise<NewsArticleDto | null>;
  getNewsBySlug(tenantId: string, slug: string): Promise<NewsArticleDto | null>;
  createNews(tenantId: string, authorId: string | null, data: CreateNewsArticleDto): Promise<NewsArticleDto>;
  updateNews(tenantId: string, id: string, editorId: string | null, data: UpdateNewsArticleDto): Promise<NewsArticleDto>;
  deleteNews(tenantId: string, id: string): Promise<void>;
  listPublicNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<PublicNewsArticleDto>>;
  getPublicNewsBySlug(tenantId: string, slug: string): Promise<PublicNewsArticleDto | null>;
  getArchiveSummary(tenantId: string): Promise<Array<{ year: number; month: number; count: number }>>;
}

export class PrismaNewsRepository implements INewsRepository {
  private mapNews(r: any): NewsArticleDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      body: r.body,
      authorName: r.authorName,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      featuredMediaId: r.featuredMediaId,
      tags: Array.isArray(r.tags) ? r.tags : [],
      relatedIds: Array.isArray(r.relatedIds) ? r.relatedIds : [],
      status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      canonicalUrl: r.canonicalUrl,
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      featuredMedia: r.featuredMedia
        ? {
            id: r.featuredMedia.id,
            title: r.featuredMedia.title,
            publicUrl: r.featuredMedia.publicUrl,
            altText: r.featuredMedia.altText,
            caption: r.featuredMedia.caption,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapPublicNews(r: any, relatedArticles?: any[]): PublicNewsArticleDto {
    const approvedMedia =
      r.featuredMedia && r.featuredMedia.isPublic
        ? {
            id: r.featuredMedia.id,
            title: r.featuredMedia.title,
            publicUrl: r.featuredMedia.publicUrl,
            altText: r.featuredMedia.altText,
            caption: r.featuredMedia.caption,
          }
        : null;

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      body: r.body,
      authorName: r.authorName,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : r.createdAt.toISOString(),
      featuredMedia: approvedMedia,
      tags: Array.isArray(r.tags) ? r.tags : [],
      relatedArticles: Array.isArray(relatedArticles) ? relatedArticles : undefined,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      canonicalUrl: r.canonicalUrl,
    };
  }

  async listNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<NewsArticleDto>> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.status) where.status = query.status as PageStatus;
    if (query?.tag) where.tags = { has: query.tag };
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.year) {
      const yearStart = new Date(Date.UTC(query.year, 0, 1));
      const yearEnd = new Date(Date.UTC(query.year + 1, 0, 1));
      where.publishedAt = { gte: yearStart, lt: yearEnd };
    }

    const [total, items] = await Promise.all([
      prisma.newsArticle.count({ where }),
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: { featuredMedia: true },
      }),
    ]);

    return {
      items: items.map((i) => this.mapNews(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getNewsById(tenantId: string, id: string): Promise<NewsArticleDto | null> {
    const item = await prisma.newsArticle.findFirst({
      where: { id, tenantId },
      include: { featuredMedia: true },
    });
    return item ? this.mapNews(item) : null;
  }

  async getNewsBySlug(tenantId: string, slug: string): Promise<NewsArticleDto | null> {
    const item = await prisma.newsArticle.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      include: { featuredMedia: true },
    });
    return item ? this.mapNews(item) : null;
  }

  async createNews(tenantId: string, authorId: string | null, data: CreateNewsArticleDto): Promise<NewsArticleDto> {
    const status = (data.status as PageStatus) || PageStatus.DRAFT;
    const publishedAt =
      status === PageStatus.PUBLISHED ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : (data.publishedAt ? new Date(data.publishedAt) : null);

    const item = await prisma.newsArticle.create({
      data: {
        tenantId,
        authorId,
        lastEditorId: authorId,
        title: data.title,
        slug: data.slug,
        summary: data.summary || null,
        body: data.body,
        authorName: data.authorName || null,
        publishedAt,
        featuredMediaId: data.featuredMediaId || null,
        tags: data.tags || [],
        relatedIds: data.relatedIds || [],
        status,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        canonicalUrl: data.canonicalUrl || null,
      },
      include: { featuredMedia: true },
    });

    return this.mapNews(item);
  }

  async updateNews(tenantId: string, id: string, editorId: string | null, data: UpdateNewsArticleDto): Promise<NewsArticleDto> {
    const existing = await prisma.newsArticle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('News article not found');

    const updateData: any = {
      lastEditorId: editorId,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.authorName !== undefined) updateData.authorName = data.authorName;
    if (data.featuredMediaId !== undefined) updateData.featuredMediaId = data.featuredMediaId;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.relatedIds !== undefined) updateData.relatedIds = data.relatedIds;
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription;
    if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl;

    if (data.status !== undefined) {
      updateData.status = data.status as PageStatus;
      if (data.status === PageStatus.PUBLISHED && !existing.publishedAt) {
        updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
      } else if (data.status === PageStatus.ARCHIVED && !existing.archivedAt) {
        updateData.archivedAt = new Date();
      }
    }

    if (data.publishedAt !== undefined) {
      updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    }

    const item = await prisma.newsArticle.update({
      where: { id },
      data: updateData,
      include: { featuredMedia: true },
    });

    return this.mapNews(item);
  }

  async deleteNews(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.newsArticle.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('News article not found');
    await prisma.newsArticle.delete({ where: { id } });
  }

  async listPublicNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<PublicNewsArticleDto>> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: PageStatus.PUBLISHED,
    };

    if (query?.tag) where.tags = { has: query.tag };
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.year) {
      let start: Date;
      let end: Date;
      if (query.month) {
        start = new Date(Date.UTC(query.year, query.month - 1, 1));
        end = new Date(Date.UTC(query.year, query.month, 1));
      } else {
        start = new Date(Date.UTC(query.year, 0, 1));
        end = new Date(Date.UTC(query.year + 1, 0, 1));
      }
      where.publishedAt = { gte: start, lt: end };
    }

    const [total, items] = await Promise.all([
      prisma.newsArticle.count({ where }),
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: { featuredMedia: true },
      }),
    ]);

    return {
      items: items.map((i) => this.mapPublicNews(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicNewsBySlug(tenantId: string, slug: string): Promise<PublicNewsArticleDto | null> {
    const item = await prisma.newsArticle.findFirst({
      where: {
        tenantId,
        slug,
        status: PageStatus.PUBLISHED,
      },
      include: { featuredMedia: true },
    });

    if (!item) return null;

    let relatedArticles: any[] = [];
    if (item.tags && item.tags.length > 0) {
      const related = await prisma.newsArticle.findMany({
        where: {
          tenantId,
          status: PageStatus.PUBLISHED,
          id: { not: item.id },
          tags: { hasSome: item.tags },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
      });
      relatedArticles = related.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        publishedAt: r.publishedAt ? r.publishedAt.toISOString() : r.createdAt.toISOString(),
      }));
    }

    return this.mapPublicNews(item, relatedArticles);
  }

  async getArchiveSummary(tenantId: string): Promise<Array<{ year: number; month: number; count: number }>> {
    const items = await prisma.newsArticle.findMany({
      where: { tenantId, status: PageStatus.PUBLISHED, publishedAt: { not: null } },
      select: { publishedAt: true },
    });

    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.publishedAt) {
        const year = item.publishedAt.getUTCFullYear();
        const month = item.publishedAt.getUTCMonth() + 1;
        const key = `${year}-${month}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const result: Array<{ year: number; month: number; count: number }> = [];
    counts.forEach((count, key) => {
      const [year, month] = key.split('-').map(Number);
      result.push({ year, month, count });
    });

    return result.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
  }
}

export class InMemoryNewsRepository implements INewsRepository {
  private items: any[] = [];

  constructor(initialItems: any[] = []) {
    this.items = [...initialItems];
  }

  private map(r: any): NewsArticleDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      summary: r.summary || null,
      body: r.body,
      authorName: r.authorName || null,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      archivedAt: r.archivedAt ? new Date(r.archivedAt).toISOString() : null,
      featuredMediaId: r.featuredMediaId || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      relatedIds: Array.isArray(r.relatedIds) ? r.relatedIds : [],
      status: r.status,
      seoTitle: r.seoTitle || null,
      seoDescription: r.seoDescription || null,
      canonicalUrl: r.canonicalUrl || null,
      authorId: r.authorId || null,
      lastEditorId: r.lastEditorId || null,
      featuredMedia: r.featuredMedia || null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  async listNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<NewsArticleDto>> {
    let filtered = this.items.filter((i) => i.tenantId === tenantId);
    if (query?.status) filtered = filtered.filter((i) => i.status === query.status);
    if (query?.tag) filtered = filtered.filter((i) => Array.isArray(i.tags) && i.tags.includes(query.tag));
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.summary && i.summary.toLowerCase().includes(s)) ||
          i.body.toLowerCase().includes(s)
      );
    }
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated.map((i) => this.map(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getNewsById(tenantId: string, id: string): Promise<NewsArticleDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.id === id);
    return item ? this.map(item) : null;
  }

  async getNewsBySlug(tenantId: string, slug: string): Promise<NewsArticleDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.slug === slug);
    return item ? this.map(item) : null;
  }

  async createNews(tenantId: string, authorId: string | null, data: CreateNewsArticleDto): Promise<NewsArticleDto> {
    const existing = this.items.find((i) => i.tenantId === tenantId && i.slug === data.slug);
    if (existing) throw new Error('A news article with this slug already exists for this tenant');

    const status = data.status || 'DRAFT';
    const publishedAt =
      status === 'PUBLISHED' ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : (data.publishedAt ? new Date(data.publishedAt) : null);

    const now = new Date();
    const newItem = {
      id: `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      authorId,
      lastEditorId: authorId,
      title: data.title,
      slug: data.slug,
      summary: data.summary || null,
      body: data.body,
      authorName: data.authorName || null,
      publishedAt,
      featuredMediaId: data.featuredMediaId || null,
      tags: data.tags || [],
      relatedIds: data.relatedIds || [],
      status,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      canonicalUrl: data.canonicalUrl || null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(newItem);
    return this.map(newItem);
  }

  async updateNews(tenantId: string, id: string, editorId: string | null, data: UpdateNewsArticleDto): Promise<NewsArticleDto> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('News article not found');

    if (data.slug) {
      const conflict = this.items.find((i) => i.tenantId === tenantId && i.slug === data.slug && i.id !== id);
      if (conflict) throw new Error('A news article with this slug already exists for this tenant');
    }

    const existing = this.items[index];
    const updated = {
      ...existing,
      ...data,
      lastEditorId: editorId,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return this.map(updated);
  }

  async deleteNews(tenantId: string, id: string): Promise<void> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('News article not found');
    this.items.splice(index, 1);
  }

  async listPublicNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<PublicNewsArticleDto>> {
    let filtered = this.items.filter((i) => i.tenantId === tenantId && i.status === 'PUBLISHED');
    if (query?.tag) filtered = filtered.filter((i) => Array.isArray(i.tags) && i.tags.includes(query.tag));
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.summary && i.summary.toLowerCase().includes(s)) ||
          i.body.toLowerCase().includes(s)
      );
    }
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated.map((i) => ({
        id: i.id,
        title: i.title,
        slug: i.slug,
        summary: i.summary || null,
        body: i.body,
        authorName: i.authorName || null,
        publishedAt: i.publishedAt ? new Date(i.publishedAt).toISOString() : new Date(i.createdAt).toISOString(),
        featuredMedia: i.featuredMedia || null,
        tags: Array.isArray(i.tags) ? i.tags : [],
        seoTitle: i.seoTitle || null,
        seoDescription: i.seoDescription || null,
        canonicalUrl: i.canonicalUrl || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicNewsBySlug(tenantId: string, slug: string): Promise<PublicNewsArticleDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.slug === slug && i.status === 'PUBLISHED');
    if (!item) return null;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary || null,
      body: item.body,
      authorName: item.authorName || null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : new Date(item.createdAt).toISOString(),
      featuredMedia: item.featuredMedia || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      seoTitle: item.seoTitle || null,
      seoDescription: item.seoDescription || null,
      canonicalUrl: item.canonicalUrl || null,
    };
  }

  async getArchiveSummary(tenantId: string): Promise<Array<{ year: number; month: number; count: number }>> {
    const counts = new Map<string, number>();
    for (const item of this.items) {
      if (item.tenantId === tenantId && item.status === 'PUBLISHED' && item.publishedAt) {
        const d = new Date(item.publishedAt);
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const result: Array<{ year: number; month: number; count: number }> = [];
    counts.forEach((count, key) => {
      const [year, month] = key.split('-').map(Number);
      result.push({ year, month, count });
    });
    return result.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
  }
}
