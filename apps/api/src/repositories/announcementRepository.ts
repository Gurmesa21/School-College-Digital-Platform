import { prisma, PageStatus, AnnouncementPriority, AnnouncementAudience } from '@school/db';
import {
  AnnouncementDto,
  PublicAnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementQueryDto,
  PaginatedData,
} from '@school/shared';

export interface IAnnouncementRepository {
  listAnnouncements(tenantId: string, query?: AnnouncementQueryDto): Promise<PaginatedData<AnnouncementDto>>;
  getAnnouncementById(tenantId: string, id: string): Promise<AnnouncementDto | null>;
  createAnnouncement(tenantId: string, authorId: string | null, data: CreateAnnouncementDto): Promise<AnnouncementDto>;
  updateAnnouncement(tenantId: string, id: string, editorId: string | null, data: UpdateAnnouncementDto): Promise<AnnouncementDto>;
  deleteAnnouncement(tenantId: string, id: string): Promise<void>;
  listPublicActiveAnnouncements(tenantId: string): Promise<PublicAnnouncementDto[]>;
}

export class PrismaAnnouncementRepository implements IAnnouncementRepository {
  private mapAnnouncement(r: any): AnnouncementDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      content: r.content,
      priority: r.priority as any,
      audience: r.audience as any,
      isPinned: r.isPinned,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapPublicAnnouncement(r: any): PublicAnnouncementDto {
    return {
      id: r.id,
      title: r.title,
      content: r.content,
      priority: r.priority as any,
      audience: r.audience as any,
      isPinned: r.isPinned,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async listAnnouncements(tenantId: string, query?: AnnouncementQueryDto): Promise<PaginatedData<AnnouncementDto>> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.status) where.status = query.status as PageStatus;
    if (query?.priority) where.priority = query.priority as AnnouncementPriority;
    if (query?.audience) where.audience = query.audience as AnnouncementAudience;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.activeOnly) {
      const now = new Date();
      where.status = PageStatus.PUBLISHED;
      where.AND = [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items: items.map((i) => this.mapAnnouncement(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAnnouncementById(tenantId: string, id: string): Promise<AnnouncementDto | null> {
    const item = await prisma.announcement.findFirst({
      where: { id, tenantId },
    });
    return item ? this.mapAnnouncement(item) : null;
  }

  async createAnnouncement(tenantId: string, authorId: string | null, data: CreateAnnouncementDto): Promise<AnnouncementDto> {
    const startsAt = data.startsAt ? new Date(data.startsAt) : null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const item = await prisma.announcement.create({
      data: {
        tenantId,
        authorId,
        lastEditorId: authorId,
        title: data.title,
        content: data.content,
        priority: (data.priority as AnnouncementPriority) || AnnouncementPriority.NORMAL,
        audience: (data.audience as AnnouncementAudience) || AnnouncementAudience.GENERAL,
        isPinned: data.isPinned ?? false,
        startsAt,
        expiresAt,
        status: (data.status as PageStatus) || PageStatus.DRAFT,
      },
    });

    return this.mapAnnouncement(item);
  }

  async updateAnnouncement(tenantId: string, id: string, editorId: string | null, data: UpdateAnnouncementDto): Promise<AnnouncementDto> {
    const existing = await prisma.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Announcement not found');

    const updateData: any = {
      lastEditorId: editorId,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.priority !== undefined) updateData.priority = data.priority as AnnouncementPriority;
    if (data.audience !== undefined) updateData.audience = data.audience as AnnouncementAudience;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.status !== undefined) updateData.status = data.status as PageStatus;

    if (data.startsAt !== undefined) {
      updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    const item = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    return this.mapAnnouncement(item);
  }

  async deleteAnnouncement(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Announcement not found');
    await prisma.announcement.delete({ where: { id } });
  }

  async listPublicActiveAnnouncements(tenantId: string): Promise<PublicAnnouncementDto[]> {
    const now = new Date();

    const items = await prisma.announcement.findMany({
      where: {
        tenantId,
        status: PageStatus.PUBLISHED,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return items.map((i) => this.mapPublicAnnouncement(i));
  }
}

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private items: any[] = [];

  constructor(initialItems: any[] = []) {
    this.items = [...initialItems];
  }

  private map(r: any): AnnouncementDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      content: r.content,
      priority: r.priority,
      audience: r.audience,
      isPinned: Boolean(r.isPinned),
      startsAt: r.startsAt ? new Date(r.startsAt).toISOString() : null,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      status: r.status,
      authorId: r.authorId || null,
      lastEditorId: r.lastEditorId || null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  async listAnnouncements(tenantId: string, query?: AnnouncementQueryDto): Promise<PaginatedData<AnnouncementDto>> {
    let filtered = this.items.filter((i) => i.tenantId === tenantId);
    if (query?.status) filtered = filtered.filter((i) => i.status === query.status);
    if (query?.priority) filtered = filtered.filter((i) => i.priority === query.priority);
    if (query?.audience) filtered = filtered.filter((i) => i.audience === query.audience);
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter((i) => i.title.toLowerCase().includes(s) || i.content.toLowerCase().includes(s));
    }
    if (query?.activeOnly) {
      const now = new Date();
      filtered = filtered.filter((i) => {
        if (i.status !== 'PUBLISHED') return false;
        if (i.startsAt && new Date(i.startsAt) > now) return false;
        if (i.expiresAt && new Date(i.expiresAt) <= now) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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

  async getAnnouncementById(tenantId: string, id: string): Promise<AnnouncementDto | null> {
    const item = this.items.find((i) => i.tenantId === tenantId && i.id === id);
    return item ? this.map(item) : null;
  }

  async createAnnouncement(tenantId: string, authorId: string | null, data: CreateAnnouncementDto): Promise<AnnouncementDto> {
    const now = new Date();
    const newItem = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      authorId,
      lastEditorId: authorId,
      title: data.title,
      content: data.content,
      priority: data.priority || 'NORMAL',
      audience: data.audience || 'GENERAL',
      isPinned: Boolean(data.isPinned),
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      status: data.status || 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(newItem);
    return this.map(newItem);
  }

  async updateAnnouncement(tenantId: string, id: string, editorId: string | null, data: UpdateAnnouncementDto): Promise<AnnouncementDto> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('Announcement not found');

    const existing = this.items[index];
    const updated = {
      ...existing,
      ...data,
      startsAt: data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : existing.startsAt,
      expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : existing.expiresAt,
      lastEditorId: editorId,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return this.map(updated);
  }

  async deleteAnnouncement(tenantId: string, id: string): Promise<void> {
    const index = this.items.findIndex((i) => i.tenantId === tenantId && i.id === id);
    if (index === -1) throw new Error('Announcement not found');
    this.items.splice(index, 1);
  }

  async listPublicActiveAnnouncements(tenantId: string): Promise<PublicAnnouncementDto[]> {
    const now = new Date();
    const active = this.items.filter((i) => {
      if (i.tenantId !== tenantId) return false;
      if (i.status !== 'PUBLISHED') return false;
      if (i.startsAt && new Date(i.startsAt) > now) return false;
      if (i.expiresAt && new Date(i.expiresAt) <= now) return false;
      return true;
    });

    active.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return active.map((i) => ({
      id: i.id,
      title: i.title,
      content: i.content,
      priority: i.priority,
      audience: i.audience,
      isPinned: i.isPinned,
      startsAt: i.startsAt ? new Date(i.startsAt).toISOString() : null,
      expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : null,
      createdAt: new Date(i.createdAt).toISOString(),
    }));
  }
}
