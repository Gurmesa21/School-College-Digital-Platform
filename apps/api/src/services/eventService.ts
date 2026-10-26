import {
  EventItemDto,
  PublicEventItemDto,
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  PaginatedData,
} from '@school/shared';
import { IEventRepository } from '../repositories/eventRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { IMediaRepository } from '../repositories/mediaRepository.js';

export interface EventAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class EventService {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly auditRepository: IAuditRepository,
    private readonly mediaRepository?: IMediaRepository
  ) {}

  async listEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<EventItemDto>> {
    return this.eventRepository.listEvents(tenantId, query);
  }

  async getEventById(tenantId: string, id: string): Promise<EventItemDto | null> {
    return this.eventRepository.getEventById(tenantId, id);
  }

  async getEventBySlug(tenantId: string, slug: string): Promise<EventItemDto | null> {
    return this.eventRepository.getEventBySlug(tenantId, slug);
  }

  async createEvent(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateEventDto,
    context?: EventAuditContext
  ): Promise<EventItemDto> {
    // 1. Slug uniqueness in tenant boundary
    const existing = await this.eventRepository.getEventBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: An event with slug '${data.slug}' already exists in this institution.`);
    }

    // 2. Validate media asset tenant ownership
    if (data.coverMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.coverMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Cover media asset '${data.coverMediaId}' does not belong to this institution.`);
      }
    }

    // 3. Consistency check on start & end times
    if (new Date(data.endsAt) < new Date(data.startsAt)) {
      throw new Error('INVALID_DATES: Event end time cannot be earlier than start time.');
    }

    // 4. Persistence
    const created = await this.eventRepository.createEvent(tenantId, actor.id, data);

    // 5. Audit log
    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'event:create',
      entityType: 'EVENT',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: created.title, slug: created.slug, timezone: created.timezone, startsAt: created.startsAt, endsAt: created.endsAt },
    });

    return created;
  }

  async updateEvent(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateEventDto,
    context?: EventAuditContext
  ): Promise<EventItemDto> {
    const existing = await this.eventRepository.getEventById(tenantId, id);
    if (!existing) {
      throw new Error(`EVENT_NOT_FOUND: Event '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.eventRepository.getEventBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: An event with slug '${data.slug}' already exists in this institution.`);
      }
    }

    if (data.coverMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.coverMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Cover media asset '${data.coverMediaId}' does not belong to this institution.`);
      }
    }

    const start = data.startsAt ? new Date(data.startsAt) : new Date(existing.startsAt);
    const end = data.endsAt ? new Date(data.endsAt) : new Date(existing.endsAt);
    if (end < start) {
      throw new Error('INVALID_DATES: Event end time cannot be earlier than start time.');
    }

    const updated = await this.eventRepository.updateEvent(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'event:update',
      entityType: 'EVENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async publishEvent(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: EventAuditContext
  ): Promise<EventItemDto> {
    const existing = await this.eventRepository.getEventById(tenantId, id);
    if (!existing) {
      throw new Error(`EVENT_NOT_FOUND: Event '${id}' not found in this institution.`);
    }

    const updated = await this.eventRepository.updateEvent(tenantId, id, actor.id, {
      status: 'PUBLISHED',
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'event:publish',
      entityType: 'EVENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async archiveEvent(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: EventAuditContext
  ): Promise<EventItemDto> {
    const existing = await this.eventRepository.getEventById(tenantId, id);
    if (!existing) {
      throw new Error(`EVENT_NOT_FOUND: Event '${id}' not found in this institution.`);
    }

    const updated = await this.eventRepository.updateEvent(tenantId, id, actor.id, {
      status: 'ARCHIVED',
    });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'event:archive',
      entityType: 'EVENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async deleteEvent(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: EventAuditContext
  ): Promise<void> {
    const existing = await this.eventRepository.getEventById(tenantId, id);
    if (!existing) {
      throw new Error(`EVENT_NOT_FOUND: Event '${id}' not found in this institution.`);
    }

    await this.eventRepository.deleteEvent(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'event:delete',
      entityType: 'EVENT',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: existing.title, slug: existing.slug },
    });
  }

  async listPublicEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<PublicEventItemDto>> {
    return this.eventRepository.listPublicEvents(tenantId, query);
  }

  async getPublicEventBySlug(tenantId: string, slug: string): Promise<PublicEventItemDto | null> {
    return this.eventRepository.getPublicEventBySlug(tenantId, slug);
  }

  /**
   * Generates standard RFC 5545 iCalendar content for event export (FR-EVT-002)
   */
  generateIcs(event: PublicEventItemDto | EventItemDto): string {
    const formatIcsDate = (isoStr: string) => {
      const d = new Date(isoStr);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dtStart = formatIcsDate(event.startsAt);
    const dtEnd = formatIcsDate(event.endsAt);
    const dtStamp = formatIcsDate(new Date().toISOString());
    const uid = `event-${event.id || event.slug}@schoolplatform.local`;
    const summary = (event.title || '').replace(/[,;\\]/g, '\\$&');
    const description = (event.description || '').replace(/\n/g, '\\n').replace(/[,;\\]/g, '\\$&');
    const location = (event.location || '').replace(/[,;\\]/g, '\\$&');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//School Platform//Events Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
  }
}
