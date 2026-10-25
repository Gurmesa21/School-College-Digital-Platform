import {
  CreateReusableSectionDto,
  UpdateReusableSectionDto,
  ReusableSectionQueryDto,
  ReusableSectionDto,
  ReusableSectionPlacementDto,
  PaginatedData,
  validateSectionConfig,
} from '@school/shared';
import { ISectionRepository } from '../repositories/sectionRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export interface AuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class SectionService {
  constructor(
    private readonly sectionRepository: ISectionRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async listReusableSections(
    tenantId: string,
    query?: ReusableSectionQueryDto
  ): Promise<PaginatedData<ReusableSectionDto>> {
    return this.sectionRepository.listReusableSections(tenantId, query);
  }

  async getReusableSectionById(tenantId: string, id: string): Promise<ReusableSectionDto | null> {
    return this.sectionRepository.getReusableSectionById(tenantId, id);
  }

  async getReusableSectionBySlug(tenantId: string, slug: string): Promise<ReusableSectionDto | null> {
    return this.sectionRepository.getReusableSectionBySlug(tenantId, slug);
  }

  async createReusableSection(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateReusableSectionDto,
    context?: AuditContext
  ): Promise<ReusableSectionDto> {
    // 1. Check slug uniqueness within tenant
    const existing = await this.sectionRepository.getReusableSectionBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: A reusable section with slug '${data.slug}' already exists for this institution.`);
    }

    // 2. Validate configuration schema
    validateSectionConfig(data.sectionType, data.config);

    // 3. Persist record
    const created = await this.sectionRepository.createReusableSection(tenantId, actor.id, data);

    // 4. Audit logging
    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:section:create',
      entityType: 'REUSABLE_SECTION',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: {
        name: created.name,
        slug: created.slug,
        sectionType: created.sectionType,
      },
    });

    return created;
  }

  async updateReusableSection(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateReusableSectionDto,
    context?: AuditContext
  ): Promise<ReusableSectionDto> {
    const existing = await this.sectionRepository.getReusableSectionById(tenantId, id);
    if (!existing) {
      throw new Error(`SECTION_NOT_FOUND: Reusable section '${id}' not found in this institution.`);
    }

    // Check slug collision if slug changed
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.sectionRepository.getReusableSectionBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: A reusable section with slug '${data.slug}' already exists.`);
      }
    }

    // Validate config if updated
    if (data.config) {
      const sectionType = data.sectionType || existing.sectionType;
      validateSectionConfig(sectionType, data.config);
    }

    const updated = await this.sectionRepository.updateReusableSection(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:section:update',
      entityType: 'REUSABLE_SECTION',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: {
        name: updated.name,
        slug: updated.slug,
        sectionType: updated.sectionType,
      },
    });

    return updated;
  }

  async deleteReusableSection(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AuditContext
  ): Promise<void> {
    const existing = await this.sectionRepository.getReusableSectionById(tenantId, id);
    if (!existing) {
      throw new Error(`SECTION_NOT_FOUND: Reusable section '${id}' not found in this institution.`);
    }

    await this.sectionRepository.deleteReusableSection(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:section:delete',
      entityType: 'REUSABLE_SECTION',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: {
        name: existing.name,
        slug: existing.slug,
      },
    });
  }

  async getSectionPlacements(tenantId: string, id: string): Promise<ReusableSectionPlacementDto[]> {
    const existing = await this.sectionRepository.getReusableSectionById(tenantId, id);
    if (!existing) {
      throw new Error(`SECTION_NOT_FOUND: Reusable section '${id}' not found in this institution.`);
    }
    return this.sectionRepository.getSectionPlacements(tenantId, id);
  }
}
