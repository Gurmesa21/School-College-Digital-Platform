import {
  AnnouncementDto,
  PublicAnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementQueryDto,
  PaginatedData,
} from '@school/shared';
import { IAnnouncementRepository } from '../repositories/announcementRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export interface AnnouncementAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class AnnouncementService {
  constructor(
    private readonly announcementRepository: IAnnouncementRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async listAnnouncements(tenantId: string, query?: AnnouncementQueryDto): Promise<PaginatedData<AnnouncementDto>> {
    return this.announcementRepository.listAnnouncements(tenantId, query);
  }

  async getAnnouncementById(tenantId: string, id: string): Promise<AnnouncementDto | null> {
    return this.announcementRepository.getAnnouncementById(tenantId, id);
  }

  async createAnnouncement(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateAnnouncementDto,
    context?: AnnouncementAuditContext
  ): Promise<AnnouncementDto> {
    const created = await this.announcementRepository.createAnnouncement(tenantId, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'announcement:create',
      entityType: 'ANNOUNCEMENT',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: created.title, priority: created.priority, status: created.status },
    });

    return created;
  }

  async updateAnnouncement(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateAnnouncementDto,
    context?: AnnouncementAuditContext
  ): Promise<AnnouncementDto> {
    const existing = await this.announcementRepository.getAnnouncementById(tenantId, id);
    if (!existing) {
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: Announcement '${id}' not found in this institution.`);
    }

    const updated = await this.announcementRepository.updateAnnouncement(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'announcement:update',
      entityType: 'ANNOUNCEMENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, priority: updated.priority, status: updated.status },
    });

    return updated;
  }

  async publishAnnouncement(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AnnouncementAuditContext
  ): Promise<AnnouncementDto> {
    const existing = await this.announcementRepository.getAnnouncementById(tenantId, id);
    if (!existing) {
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: Announcement '${id}' not found in this institution.`);
    }

    const updated = await this.announcementRepository.updateAnnouncement(tenantId, id, actor.id, {
      status: 'PUBLISHED',
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'announcement:publish',
      entityType: 'ANNOUNCEMENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, status: updated.status },
    });

    return updated;
  }

  async archiveAnnouncement(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AnnouncementAuditContext
  ): Promise<AnnouncementDto> {
    const existing = await this.announcementRepository.getAnnouncementById(tenantId, id);
    if (!existing) {
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: Announcement '${id}' not found in this institution.`);
    }

    const updated = await this.announcementRepository.updateAnnouncement(tenantId, id, actor.id, {
      status: 'ARCHIVED',
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'announcement:archive',
      entityType: 'ANNOUNCEMENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, status: updated.status },
    });

    return updated;
  }

  async deleteAnnouncement(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AnnouncementAuditContext
  ): Promise<void> {
    const existing = await this.announcementRepository.getAnnouncementById(tenantId, id);
    if (!existing) {
      throw new Error(`ANNOUNCEMENT_NOT_FOUND: Announcement '${id}' not found in this institution.`);
    }

    await this.announcementRepository.deleteAnnouncement(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'announcement:delete',
      entityType: 'ANNOUNCEMENT',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: existing.title },
    });
  }

  async listPublicActiveAnnouncements(tenantId: string): Promise<PublicAnnouncementDto[]> {
    return this.announcementRepository.listPublicActiveAnnouncements(tenantId);
  }
}
