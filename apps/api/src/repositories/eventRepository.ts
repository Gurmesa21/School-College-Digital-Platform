import { prisma, PageStatus } from '@school/db';
import {
  EventItemDto,
  PublicEventItemDto,
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  PaginatedData,
} from '@school/shared';

export interface IEventRepository {
  listEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<EventItemDto>>;
  getEventById(tenantId: string, id: string): Promise<EventItemDto | null>;
  getEventBySlug(tenantId: string, slug: string): Promise<EventItemDto | null>;
  createEvent(tenantId: string, authorId: string | null, data: CreateEventDto): Promise<EventItemDto>;
  updateEvent(tenantId: string, id: string, editorId: string | null, data: UpdateEventDto): Promise<EventItemDto>;
  deleteEvent(tenantId: string, id: string): Promise<void>;
  listPublicEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<PublicEventItemDto>>;
  getPublicEventBySlug(tenantId: string, slug: string): Promise<PublicEventItemDto | null>;
}

export class PrismaEventRepository implements IEventRepository {
  private mapEvent(r: any): EventItemDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      description: r.description,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      timezone: r.timezone,
      location: r.location,
      category: r.category,
      coverMediaId: r.coverMediaId,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
      capacity: r.capacity,
      isRegistrationOpen: r.isRegistrationOpen,
      registrationUrl: r.registrationUrl,
      status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      coverMedia: r.coverMedia
        ? {
            id: r.coverMedia.id,
            title: r.coverMedia.title,
            publicUrl: r.coverMedia.publicUrl,
            altText: r.coverMedia.altText,
            caption: r.coverMedia.caption,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapPublicEvent(r: any): PublicEventItemDto {
    const approvedMedia =
      r.coverMedia && r.coverMedia.isPublic
        ? {
            id: r.coverMedia.id,
            title: r.coverMedia.title,
            publicUrl: r.coverMedia.publicUrl,
            altText: r.coverMedia.altText,
            caption: r.coverMedia.caption,
          }
        : null;

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      timezone: r.timezone,
      location: r.location,
      category: r.category,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
      capacity: r.capacity,
      isRegistrationOpen: r.isRegistrationOpen,
      registrationUrl: r.registrationUrl,
      coverMedia: approvedMedia,
    };
  }

  async listEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<EventItemDto>> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.status) where.status = query.status as PageStatus;
    if (query?.category) where.category = query.category;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    if (query?.timeframe === 'upcoming') {
      where.endsAt = { gte: now };
    } else if (query?.timeframe === 'past') {
      where.endsAt = { lt: now };
    }

    const orderBy = query?.timeframe === 'past' ? [{ startsAt: 'desc' as const }] : [{ startsAt: 'asc' as const }];

    const [total, items] = await Promise.all([
      prisma.eventItem.count({ where }),
      prisma.eventItem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { coverMedia: true },
      }),
    ]);

    return {
      items: items.map((i) => this.mapEvent(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getEventById(tenantId: string, id: string): Promise<EventItemDto | null> {
    const item = await prisma.eventItem.findFirst({
      where: { id, tenantId },
      include: { coverMedia: true },
    });
    return item ? this.mapEvent(item) : null;
  }

  async getEventBySlug(tenantId: string, slug: string): Promise<EventItemDto | null> {
    const item = await prisma.eventItem.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      include: { coverMedia: true },
    });
    return item ? this.mapEvent(item) : null;
  }

  async createEvent(tenantId: string, authorId: string | null, data: CreateEventDto): Promise<EventItemDto> {
    const item = await prisma.eventItem.create({
      data: {
        tenantId,
        authorId,
        lastEditorId: authorId,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        timezone: data.timezone || 'UTC',
        location: data.location || null,
        category: data.category || 'GENERAL',
        coverMediaId: data.coverMediaId || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        capacity: data.capacity || null,
        isRegistrationOpen: data.isRegistrationOpen ?? false,
        registrationUrl: data.registrationUrl || null,
        status: (data.status as PageStatus) || PageStatus.DRAFT,
      },
      include: { coverMedia: true },
    });

    return this.mapEvent(item);
  }

  async updateEvent(tenantId: string, id: string, editorId: string | null, data: UpdateEventDto): Promise<EventItemDto> {
    const existing = await prisma.eventItem.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Event not found');

    const updateData: any = {
      lastEditorId: editorId,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) updateData.endsAt = new Date(data.endsAt);
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.coverMediaId !== undefined) updateData.coverMediaId = data.coverMediaId;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.isRegistrationOpen !== undefined) updateData.isRegistrationOpen = data.isRegistrationOpen;
    if (data.registrationUrl !== undefined) updateData.registrationUrl = data.registrationUrl;
    if (data.status !== undefined) updateData.status = data.status as PageStatus;

    const item = await prisma.eventItem.update({
      where: { id },
      data: updateData,
      include: { coverMedia: true },
    });

    return this.mapEvent(item);
  }

  async deleteEvent(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.eventItem.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Event not found');
    await prisma.eventItem.delete({ where: { id } });
  }

  async listPublicEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<PublicEventItemDto>> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: PageStatus.PUBLISHED,
    };

    if (query?.category) where.category = query.category;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    if (query?.timeframe === 'past') {
      where.endsAt = { lt: now };
    } else if (query?.timeframe === 'upcoming') {
      where.endsAt = { gte: now };
    }

    const orderBy = query?.timeframe === 'past' ? [{ startsAt: 'desc' as const }] : [{ startsAt: 'asc' as const }];

    const [total, items] = await Promise.all([
      prisma.eventItem.count({ where }),
      prisma.eventItem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { coverMedia: true },
      }),
    ]);

    return {
      items: items.map((i) => this.mapPublicEvent(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicEventBySlug(tenantId: string, slug: string): Promise<PublicEventItemDto | null> {
    const item = await prisma.eventItem.findFirst({
      where: {
        tenantId,
        slug,
        status: PageStatus.PUBLISHED,
      },
      include: { coverMedia: true },
    });

    return item ? this.mapPublicEvent(item) : null;
  }
}

export class InMemoryEventRepository implements IEventRepository {
  private items: any[] = [];

  constructor(initialItems: any[] = []) {
    this.items = [...initialItems];
  }

  private map(r: any): EventItemDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      description: r.description || null,
      startsAt: new Date(r.startsAt).toISOString(),
      endsAt: new Date(r.endsAt).toISOString(),
      timezone: r.timezone,
      location: r.location || null,
      category: r.category,
      coverMediaId: r.coverMediaId || null,
      contactName: r.contactName || null,
      contactEmail: r.contactEmail || null,
      contactPhone: r.contactPhone || null,
      capacity: r.capacity || null,
      isRegistrationOpen: Boolean(r.isRegistrationOpen),
      registrationUrl: r.registrationUrl || null,
      status: r.status,
      authorId: r.authorId || null,
      lastEditorId: r.lastEditorId || null,
      coverMedia: r.coverMedia || null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  async listEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<EventItemDto>> {
    let filtered = this.items.filter((i) => i.tenantId === tenantId);
    if (query?.status) filtered = filtered.filter((i) => i.status === query.status);
    if (query?.category) filtered = filtered.filter((i) => i.category === query.category);
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.description && i.description.toLowerCase().includes(s)) ||
          (i.location && i.location.toLowerCase().includes(s))
      );
    }
    const now = new Date();
    if (query?.timeframe === 'past') {
      filtered = filtered.filter((i) => new Date(i.endsAt) < now);
      filtered.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    } else if (query?.timeframe === 'upcoming') {
      filtered = filtered.filter((i) => new Date(i.endsAt) >= now);
      filtered.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
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

  async getEventById(tenantId: string, id: string): Promise<EventItemDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.id === id);
    return item ? this.map(item) : null;
  }

  async getEventBySlug(tenantId: string, slug: string): Promise<EventItemDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.slug === slug);
    return item ? this.map(item) : null;
  }

  async createEvent(tenantId: string, authorId: string | null, data: CreateEventDto): Promise<EventItemDto> {
    const existing = this.items.find((i) => i.tenantId === tenantId && i.slug === data.slug);
    if (existing) throw new Error('An event with this slug already exists for this tenant');

    const now = new Date();
    const newItem = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      authorId,
      lastEditorId: authorId,
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      timezone: data.timezone || 'UTC',
      location: data.location || null,
      category: data.category || 'GENERAL',
      coverMediaId: data.coverMediaId || null,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      capacity: data.capacity || null,
      isRegistrationOpen: Boolean(data.isRegistrationOpen),
      registrationUrl: data.registrationUrl || null,
      status: data.status || 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(newItem);
    return this.map(newItem);
  }

  async updateEvent(tenantId: string, id: string, editorId: string | null, data: UpdateEventDto): Promise<EventItemDto> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('Event not found');

    if (data.slug) {
      const conflict = this.items.find((i) => i.tenantId === tenantId && i.slug === data.slug && i.id !== id);
      if (conflict) throw new Error('An event with this slug already exists for this tenant');
    }

    const existing = this.items[index];
    const updated = {
      ...existing,
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt) : existing.startsAt,
      endsAt: data.endsAt ? new Date(data.endsAt) : existing.endsAt,
      lastEditorId: editorId,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return this.map(updated);
  }

  async deleteEvent(tenantId: string, id: string): Promise<void> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('Event not found');
    this.items.splice(index, 1);
  }

  async listPublicEvents(tenantId: string, query?: EventQueryDto): Promise<PaginatedData<PublicEventItemDto>> {
    let filtered = this.items.filter((i) => i.tenantId === tenantId && i.status === 'PUBLISHED');
    if (query?.category) filtered = filtered.filter((i) => i.category === query.category);
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.description && i.description.toLowerCase().includes(s)) ||
          (i.location && i.location.toLowerCase().includes(s))
      );
    }
    const now = new Date();
    if (query?.timeframe === 'past') {
      filtered = filtered.filter((i) => new Date(i.endsAt) < now);
      filtered.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    } else if (query?.timeframe === 'upcoming') {
      filtered = filtered.filter((i) => new Date(i.endsAt) >= now);
      filtered.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
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
        description: i.description || null,
        startsAt: new Date(i.startsAt).toISOString(),
        endsAt: new Date(i.endsAt).toISOString(),
        timezone: i.timezone,
        location: i.location || null,
        category: i.category,
        contactName: i.contactName || null,
        contactEmail: i.contactEmail || null,
        contactPhone: i.contactPhone || null,
        capacity: i.capacity || null,
        isRegistrationOpen: Boolean(i.isRegistrationOpen),
        registrationUrl: i.registrationUrl || null,
        coverMedia: i.coverMedia || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicEventBySlug(tenantId: string, slug: string): Promise<PublicEventItemDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.slug === slug && i.status === 'PUBLISHED');
    if (!item) return null;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description || null,
      startsAt: new Date(item.startsAt).toISOString(),
      endsAt: new Date(item.endsAt).toISOString(),
      timezone: item.timezone,
      location: item.location || null,
      category: item.category,
      contactName: item.contactName || null,
      contactEmail: item.contactEmail || null,
      contactPhone: item.contactPhone || null,
      capacity: item.capacity || null,
      isRegistrationOpen: Boolean(item.isRegistrationOpen),
      registrationUrl: item.registrationUrl || null,
      coverMedia: item.coverMedia || null,
    };
  }
}
