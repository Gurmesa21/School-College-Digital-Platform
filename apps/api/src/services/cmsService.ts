import {
  CreatePageDto,
  UpdatePageDto,
  PageQueryDto,
  PageDto,
  PageDetailDto,
  PublicPageDto,
  PaginatedData,
} from '@school/shared';
import { ICmsRepository } from '../repositories/cmsRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export interface AuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class CmsService {
  constructor(
    private readonly cmsRepository: ICmsRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async listPages(tenantId: string, query: PageQueryDto): Promise<PaginatedData<PageDto>> {
    return this.cmsRepository.listPages(tenantId, query);
  }

  async getPageById(tenantId: string, pageId: string): Promise<PageDetailDto | null> {
    return this.cmsRepository.findPageById(tenantId, pageId);
  }

  async getPageBySlug(tenantId: string, slug: string): Promise<PageDetailDto | null> {
    return this.cmsRepository.findPageBySlug(tenantId, slug);
  }

  async getPublicPageBySlug(tenantId: string, slug: string): Promise<PublicPageDto | null> {
    return this.cmsRepository.findPublicPageBySlug(tenantId, slug);
  }

  async createDraft(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreatePageDto,
    context?: AuditContext
  ): Promise<PageDetailDto> {
    const page = await this.cmsRepository.createPage(tenantId, actor.id, data);

    try {
      await this.auditRepository.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'PAGE_CREATED',
        entityType: 'Page',
        entityId: page.id,
        outcome: 'SUCCESS',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        metadata: {
          title: page.title,
          slug: page.slug,
          status: page.status,
          sectionsCount: page.sections.length,
        },
      });
    } catch (auditErr) {
      console.error('[CmsService] Failed to write PAGE_CREATED audit log:', auditErr);
    }

    return page;
  }

  async updateDraft(
    tenantId: string,
    pageId: string,
    actor: { id: string; email: string },
    data: UpdatePageDto,
    context?: AuditContext
  ): Promise<PageDetailDto> {
    const page = await this.cmsRepository.updatePage(tenantId, pageId, actor.id, data);

    try {
      await this.auditRepository.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'PAGE_UPDATED',
        entityType: 'Page',
        entityId: page.id,
        outcome: 'SUCCESS',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        metadata: {
          title: page.title,
          slug: page.slug,
          version: page.version,
          status: page.status,
        },
      });
    } catch (auditErr) {
      console.error('[CmsService] Failed to write PAGE_UPDATED audit log:', auditErr);
    }

    return page;
  }

  async publishPage(
    tenantId: string,
    pageId: string,
    actor: { id: string; email: string },
    scheduledPublishAt?: string | null,
    context?: AuditContext
  ): Promise<PageDetailDto> {
    const page = await this.cmsRepository.publishPage(tenantId, pageId, actor.id, scheduledPublishAt);

    try {
      await this.auditRepository.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'PAGE_PUBLISHED',
        entityType: 'Page',
        entityId: page.id,
        outcome: 'SUCCESS',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        metadata: {
          title: page.title,
          slug: page.slug,
          publishedAt: page.publishedAt,
          scheduledPublishAt: page.scheduledPublishAt,
          status: page.status,
        },
      });
    } catch (auditErr) {
      console.error('[CmsService] Failed to write PAGE_PUBLISHED audit log:', auditErr);
    }

    return page;
  }

  async archivePage(
    tenantId: string,
    pageId: string,
    actor: { id: string; email: string },
    context?: AuditContext
  ): Promise<PageDetailDto> {
    const page = await this.cmsRepository.archivePage(tenantId, pageId, actor.id);

    try {
      await this.auditRepository.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'PAGE_ARCHIVED',
        entityType: 'Page',
        entityId: page.id,
        outcome: 'SUCCESS',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        metadata: {
          title: page.title,
          slug: page.slug,
          archivedAt: page.archivedAt,
          status: page.status,
        },
      });
    } catch (auditErr) {
      console.error('[CmsService] Failed to write PAGE_ARCHIVED audit log:', auditErr);
    }

    return page;
  }
}
