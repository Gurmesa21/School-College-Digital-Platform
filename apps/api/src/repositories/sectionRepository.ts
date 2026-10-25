import { prisma, SectionType } from '@school/db';
import {
  CreateReusableSectionDto,
  UpdateReusableSectionDto,
  ReusableSectionQueryDto,
  ReusableSectionDto,
  ReusableSectionPlacementDto,
  PaginatedData,
  validateSectionConfig,
} from '@school/shared';

export interface ISectionRepository {
  listReusableSections(tenantId: string, query?: ReusableSectionQueryDto): Promise<PaginatedData<ReusableSectionDto>>;
  getReusableSectionById(tenantId: string, id: string): Promise<ReusableSectionDto | null>;
  getReusableSectionBySlug(tenantId: string, slug: string): Promise<ReusableSectionDto | null>;
  createReusableSection(
    tenantId: string,
    authorId: string | null,
    data: CreateReusableSectionDto
  ): Promise<ReusableSectionDto>;
  updateReusableSection(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateReusableSectionDto
  ): Promise<ReusableSectionDto>;
  deleteReusableSection(tenantId: string, id: string): Promise<void>;
  getSectionPlacements(tenantId: string, id: string): Promise<ReusableSectionPlacementDto[]>;
}

export class PrismaSectionRepository implements ISectionRepository {
  private mapRecord(r: any): ReusableSectionDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      sectionType: r.sectionType as any,
      category: r.category,
      isGlobal: r.isGlobal,
      config: r.config as Record<string, unknown>,
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      placementCount: r._count?.placements ?? 0,
    };
  }

  async listReusableSections(
    tenantId: string,
    query: ReusableSectionQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<ReusableSectionDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.sectionType) {
      where.sectionType = query.sectionType as SectionType;
    }
    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.reusableSection.count({ where }),
      prisma.reusableSection.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: {
            select: { placements: true },
          },
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapRecord(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getReusableSectionById(tenantId: string, id: string): Promise<ReusableSectionDto | null> {
    const record = await prisma.reusableSection.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { placements: true },
        },
      },
    });
    if (!record) return null;
    return this.mapRecord(record);
  }

  async getReusableSectionBySlug(tenantId: string, slug: string): Promise<ReusableSectionDto | null> {
    const record = await prisma.reusableSection.findFirst({
      where: { slug, tenantId },
      include: {
        _count: {
          select: { placements: true },
        },
      },
    });
    if (!record) return null;
    return this.mapRecord(record);
  }

  async createReusableSection(
    tenantId: string,
    authorId: string | null,
    data: CreateReusableSectionDto
  ): Promise<ReusableSectionDto> {
    const validatedConfig = validateSectionConfig(data.sectionType, data.config);

    const record = await prisma.reusableSection.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sectionType: data.sectionType as SectionType,
        category: data.category,
        isGlobal: data.isGlobal ?? false,
        config: validatedConfig as any,
        authorId,
      },
      include: {
        _count: {
          select: { placements: true },
        },
      },
    });

    return this.mapRecord(record);
  }

  async updateReusableSection(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateReusableSectionDto
  ): Promise<ReusableSectionDto> {
    const existing = await prisma.reusableSection.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error(`ReusableSection not found: ${id}`);
    }

    const newSectionType = (data.sectionType || existing.sectionType) as any;
    let validatedConfig = existing.config;
    if (data.config) {
      validatedConfig = validateSectionConfig(newSectionType, data.config) as any;
    }

    const updatePayload: any = {
      lastEditorId: editorId,
      updatedAt: new Date(),
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.sectionType !== undefined) updatePayload.sectionType = data.sectionType as SectionType;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.isGlobal !== undefined) updatePayload.isGlobal = data.isGlobal;
    if (data.config !== undefined) updatePayload.config = validatedConfig;

    const record = await prisma.reusableSection.update({
      where: { id },
      data: updatePayload,
      include: {
        _count: {
          select: { placements: true },
        },
      },
    });

    return this.mapRecord(record);
  }

  async deleteReusableSection(tenantId: string, id: string): Promise<void> {
    await prisma.reusableSection.deleteMany({
      where: { id, tenantId },
    });
  }

  async getSectionPlacements(tenantId: string, id: string): Promise<ReusableSectionPlacementDto[]> {
    const placements = await prisma.pageSection.findMany({
      where: {
        reusableSectionId: id,
        page: { tenantId },
      },
      include: {
        page: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: {
        page: { title: 'asc' },
      },
    });

    return placements.map((p) => ({
      pageId: p.page.id,
      pageTitle: p.page.title,
      pageSlug: p.page.slug,
      pageStatus: p.page.status,
      sectionId: p.id,
      sortOrder: p.sortOrder,
      isVisible: p.isVisible,
    }));
  }
}

export class InMemorySectionRepository implements ISectionRepository {
  private sections: any[] = [];
  private pageSectionsRef: any = [];

  constructor(initialSections: any[] = [], pageSectionsRef: any = []) {
    this.sections = [...initialSections];
    this.pageSectionsRef = pageSectionsRef;
  }

  private getAllPageSections(): any[] {
    if (!this.pageSectionsRef) return [];
    if (Array.isArray(this.pageSectionsRef)) return this.pageSectionsRef;
    if (this.pageSectionsRef instanceof Map) {
      const all: any[] = [];
      for (const arr of this.pageSectionsRef.values()) {
        if (Array.isArray(arr)) all.push(...arr);
      }
      return all;
    }
    return [];
  }

  async listReusableSections(
    tenantId: string,
    query: ReusableSectionQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<ReusableSectionDto>> {
    let list = this.sections.filter((s) => s.tenantId === tenantId);
    if (query.sectionType) {
      list = list.filter((s) => s.sectionType === query.sectionType);
    }
    if (query.category) {
      list = list.filter((s) => s.category?.toLowerCase() === query.category?.toLowerCase());
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;
    const paginated = list.slice(skip, skip + limit);

    return {
      items: paginated.map((r) => ({
        ...r,
        placementCount: this.getAllPageSections().filter((ps) => ps.reusableSectionId === r.id).length,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getReusableSectionById(tenantId: string, id: string): Promise<ReusableSectionDto | null> {
    const found = this.sections.find((s) => s.id === id && s.tenantId === tenantId);
    if (!found) return null;
    return {
      ...found,
      placementCount: this.getAllPageSections().filter((ps) => ps.reusableSectionId === found.id).length,
    };
  }

  async getReusableSectionBySlug(tenantId: string, slug: string): Promise<ReusableSectionDto | null> {
    const found = this.sections.find((s) => s.slug === slug && s.tenantId === tenantId);
    if (!found) return null;
    return {
      ...found,
      placementCount: this.getAllPageSections().filter((ps) => ps.reusableSectionId === found.id).length,
    };
  }

  async createReusableSection(
    tenantId: string,
    authorId: string | null,
    data: CreateReusableSectionDto
  ): Promise<ReusableSectionDto> {
    const validatedConfig = validateSectionConfig(data.sectionType, data.config);
    const now = new Date().toISOString();
    const newSection: ReusableSectionDto = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenantId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      sectionType: data.sectionType,
      category: data.category || null,
      isGlobal: data.isGlobal ?? false,
      config: validatedConfig,
      authorId,
      lastEditorId: null,
      createdAt: now,
      updatedAt: now,
      placementCount: 0,
    };
    this.sections.push(newSection);
    return newSection;
  }

  async updateReusableSection(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateReusableSectionDto
  ): Promise<ReusableSectionDto> {
    const idx = this.sections.findIndex((s) => s.id === id && s.tenantId === tenantId);
    if (idx === -1) {
      throw new Error(`ReusableSection not found: ${id}`);
    }
    const current = this.sections[idx];
    const newType = data.sectionType || current.sectionType;
    let validatedConfig = current.config;
    if (data.config) {
      validatedConfig = validateSectionConfig(newType, data.config);
    }

    const updated: ReusableSectionDto = {
      ...current,
      name: data.name !== undefined ? data.name : current.name,
      slug: data.slug !== undefined ? data.slug : current.slug,
      description: data.description !== undefined ? data.description : current.description,
      sectionType: newType,
      category: data.category !== undefined ? data.category : current.category,
      isGlobal: data.isGlobal !== undefined ? data.isGlobal : current.isGlobal,
      config: validatedConfig,
      lastEditorId: editorId,
      updatedAt: new Date().toISOString(),
      placementCount: this.getAllPageSections().filter((ps) => ps.reusableSectionId === id).length,
    };
    this.sections[idx] = updated;
    return updated;
  }

  async deleteReusableSection(tenantId: string, id: string): Promise<void> {
    this.sections = this.sections.filter((s) => !(s.id === id && s.tenantId === tenantId));
    // Clear placement references
    for (const ps of this.getAllPageSections()) {
      if (ps.reusableSectionId === id) {
        ps.reusableSectionId = null;
      }
    }
  }

  async getSectionPlacements(tenantId: string, id: string): Promise<ReusableSectionPlacementDto[]> {
    const matches = this.getAllPageSections().filter((ps) => ps.reusableSectionId === id);
    return matches.map((m) => ({
      pageId: m.pageId,
      pageTitle: m.pageTitle || 'Untitled Page',
      pageSlug: m.pageSlug || 'untitled-page',
      pageStatus: m.pageStatus || 'DRAFT',
      sectionId: m.id,
      sortOrder: m.sortOrder,
      isVisible: m.isVisible,
    }));
  }
}
