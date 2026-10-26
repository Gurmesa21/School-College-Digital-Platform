import {
  NewsArticleDto,
  PublicNewsArticleDto,
  CreateNewsArticleDto,
  UpdateNewsArticleDto,
  NewsArticleQueryDto,
  PaginatedData,
} from '@school/shared';
import { INewsRepository } from '../repositories/newsRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { IMediaRepository } from '../repositories/mediaRepository.js';

export interface NewsAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class NewsService {
  constructor(
    private readonly newsRepository: INewsRepository,
    private readonly auditRepository: IAuditRepository,
    private readonly mediaRepository?: IMediaRepository
  ) {}

  async listNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<NewsArticleDto>> {
    return this.newsRepository.listNews(tenantId, query);
  }

  async getNewsById(tenantId: string, id: string): Promise<NewsArticleDto | null> {
    return this.newsRepository.getNewsById(tenantId, id);
  }

  async getNewsBySlug(tenantId: string, slug: string): Promise<NewsArticleDto | null> {
    return this.newsRepository.getNewsBySlug(tenantId, slug);
  }

  async createNews(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateNewsArticleDto,
    context?: NewsAuditContext
  ): Promise<NewsArticleDto> {
    // 1. Slug uniqueness in tenant boundary
    const existing = await this.newsRepository.getNewsBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: A news article with slug '${data.slug}' already exists in this institution.`);
    }

    // 2. Validate media asset tenant ownership
    if (data.featuredMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.featuredMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Featured media asset '${data.featuredMediaId}' does not belong to this institution.`);
      }
    }

    // 3. Create record
    const created = await this.newsRepository.createNews(tenantId, actor.id, data);

    // 4. Audit logging
    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'news:article:create',
      entityType: 'NEWS_ARTICLE',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: created.title, slug: created.slug, status: created.status },
    });

    return created;
  }

  async updateNews(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateNewsArticleDto,
    context?: NewsAuditContext
  ): Promise<NewsArticleDto> {
    const existing = await this.newsRepository.getNewsById(tenantId, id);
    if (!existing) {
      throw new Error(`NEWS_NOT_FOUND: News article '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.newsRepository.getNewsBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: A news article with slug '${data.slug}' already exists in this institution.`);
      }
    }

    if (data.featuredMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.featuredMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Featured media asset '${data.featuredMediaId}' does not belong to this institution.`);
      }
    }

    const updated = await this.newsRepository.updateNews(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'news:article:update',
      entityType: 'NEWS_ARTICLE',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async publishNews(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: NewsAuditContext
  ): Promise<NewsArticleDto> {
    const existing = await this.newsRepository.getNewsById(tenantId, id);
    if (!existing) {
      throw new Error(`NEWS_NOT_FOUND: News article '${id}' not found in this institution.`);
    }

    const updated = await this.newsRepository.updateNews(tenantId, id, actor.id, {
      status: 'PUBLISHED',
      publishedAt: existing.publishedAt || new Date().toISOString(),
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'news:article:publish',
      entityType: 'NEWS_ARTICLE',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async archiveNews(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: NewsAuditContext
  ): Promise<NewsArticleDto> {
    const existing = await this.newsRepository.getNewsById(tenantId, id);
    if (!existing) {
      throw new Error(`NEWS_NOT_FOUND: News article '${id}' not found in this institution.`);
    }

    const updated = await this.newsRepository.updateNews(tenantId, id, actor.id, {
      status: 'ARCHIVED',
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'news:article:archive',
      entityType: 'NEWS_ARTICLE',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async deleteNews(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: NewsAuditContext
  ): Promise<void> {
    const existing = await this.newsRepository.getNewsById(tenantId, id);
    if (!existing) {
      throw new Error(`NEWS_NOT_FOUND: News article '${id}' not found in this institution.`);
    }

    await this.newsRepository.deleteNews(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'news:article:delete',
      entityType: 'NEWS_ARTICLE',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: existing.title, slug: existing.slug },
    });
  }

  async listPublicNews(tenantId: string, query?: NewsArticleQueryDto): Promise<PaginatedData<PublicNewsArticleDto>> {
    return this.newsRepository.listPublicNews(tenantId, query);
  }

  async getPublicNewsBySlug(tenantId: string, slug: string): Promise<PublicNewsArticleDto | null> {
    return this.newsRepository.getPublicNewsBySlug(tenantId, slug);
  }

  async getArchiveSummary(tenantId: string): Promise<Array<{ year: number; month: number; count: number }>> {
    return this.newsRepository.getArchiveSummary(tenantId);
  }
}
