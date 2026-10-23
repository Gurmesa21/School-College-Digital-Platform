import { prisma, PageStatus, SectionType } from '@school/db';
import {
  CreatePageDto,
  UpdatePageDto,
  PageQueryDto,
  PageDto,
  PageDetailDto,
  PublicPageDto,
  PaginatedData,
  validateSectionConfig,
} from '@school/shared';

export interface ICmsRepository {
  listPages(tenantId: string, query: PageQueryDto): Promise<PaginatedData<PageDto>>;
  findPageById(tenantId: string, pageId: string): Promise<PageDetailDto | null>;
  findPageBySlug(tenantId: string, slug: string): Promise<PageDetailDto | null>;
  findPublicPageBySlug(tenantId: string, slug: string): Promise<PublicPageDto | null>;
  createPage(tenantId: string, authorId: string | null, data: CreatePageDto): Promise<PageDetailDto>;
  updatePage(tenantId: string, pageId: string, editorId: string | null, data: UpdatePageDto): Promise<PageDetailDto>;
  publishPage(tenantId: string, pageId: string, editorId: string | null, scheduledPublishAt?: string | null): Promise<PageDetailDto>;
  archivePage(tenantId: string, pageId: string, editorId: string | null): Promise<PageDetailDto>;
}

export class PrismaCmsRepository implements ICmsRepository {
  async listPages(tenantId: string, query: PageQueryDto): Promise<PaginatedData<PageDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) {
      where.status = query.status as PageStatus;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.page.count({ where }),
      prisma.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: {
            select: { sections: true },
          },
        },
      }),
    ]);

    const items: PageDto[] = records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      status: r.status as any,
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      scheduledPublishAt: r.scheduledPublishAt ? r.scheduledPublishAt.toISOString() : null,
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      version: r.version,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sectionsCount: r._count.sections,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findPageById(tenantId: string, pageId: string): Promise<PageDetailDto | null> {
    const record = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        lastEditor: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      tenantId: record.tenantId,
      title: record.title,
      slug: record.slug,
      summary: record.summary,
      status: record.status as any,
      authorId: record.authorId,
      lastEditorId: record.lastEditorId,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      scheduledPublishAt: record.scheduledPublishAt ? record.scheduledPublishAt.toISOString() : null,
      archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      canonicalUrl: record.canonicalUrl,
      version: record.version,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      sections: record.sections.map((s) => ({
        id: s.id,
        pageId: s.pageId,
        sectionType: s.sectionType as any,
        sortOrder: s.sortOrder,
        isVisible: s.isVisible,
        config: s.config as Record<string, unknown>,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      author: record.author,
      lastEditor: record.lastEditor,
    };
  }

  async findPageBySlug(tenantId: string, slug: string): Promise<PageDetailDto | null> {
    const record = await prisma.page.findFirst({
      where: { slug, tenantId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        lastEditor: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      tenantId: record.tenantId,
      title: record.title,
      slug: record.slug,
      summary: record.summary,
      status: record.status as any,
      authorId: record.authorId,
      lastEditorId: record.lastEditorId,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      scheduledPublishAt: record.scheduledPublishAt ? record.scheduledPublishAt.toISOString() : null,
      archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      canonicalUrl: record.canonicalUrl,
      version: record.version,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      sections: record.sections.map((s) => ({
        id: s.id,
        pageId: s.pageId,
        sectionType: s.sectionType as any,
        sortOrder: s.sortOrder,
        isVisible: s.isVisible,
        config: s.config as Record<string, unknown>,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      author: record.author,
      lastEditor: record.lastEditor,
    };
  }

  async findPublicPageBySlug(tenantId: string, slug: string): Promise<PublicPageDto | null> {
    const now = new Date();

    const record = await prisma.page.findFirst({
      where: {
        tenantId,
        slug,
        status: PageStatus.PUBLISHED,
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!record) {
      return null;
    }

    return {
      title: record.title,
      slug: record.slug,
      summary: record.summary,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      canonicalUrl: record.canonicalUrl,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : record.createdAt.toISOString(),
      sections: record.sections.map((s) => ({
        id: s.id,
        sectionType: s.sectionType as any,
        sortOrder: s.sortOrder,
        config: s.config as Record<string, unknown>,
      })),
    };
  }

  async createPage(tenantId: string, authorId: string | null, data: CreatePageDto): Promise<PageDetailDto> {
    // Check tenant-scoped slug collision (BR-013)
    const existing = await prisma.page.findFirst({
      where: { tenantId, slug: data.slug },
    });
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: A page with slug "${data.slug}" already exists in this institution.`);
    }

    // Validate sections configs
    const validatedSections = data.sections.map((sec, idx) => ({
      sectionType: sec.sectionType as SectionType,
      sortOrder: sec.sortOrder ?? idx,
      isVisible: sec.isVisible ?? true,
      config: validateSectionConfig(sec.sectionType, sec.config),
    }));

    const created = await prisma.$transaction(async (tx) => {
      const page = await tx.page.create({
        data: {
          tenantId,
          title: data.title,
          slug: data.slug,
          summary: data.summary || null,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          canonicalUrl: data.canonicalUrl || null,
          scheduledPublishAt: data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          status: PageStatus.DRAFT,
          authorId,
          lastEditorId: authorId,
          version: 1,
        },
      });

      if (validatedSections.length > 0) {
        await tx.pageSection.createMany({
          data: validatedSections.map((s) => ({
            pageId: page.id,
            sectionType: s.sectionType,
            sortOrder: s.sortOrder,
            isVisible: s.isVisible,
            config: s.config as any,
          })),
        });
      }

      return page;
    });

    const full = await this.findPageById(tenantId, created.id);
    if (!full) {
      throw new Error('Failed to retrieve newly created page');
    }
    return full;
  }

  async updatePage(
    tenantId: string,
    pageId: string,
    editorId: string | null,
    data: UpdatePageDto
  ): Promise<PageDetailDto> {
    const existing = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!existing) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    // Optimistic concurrency check
    if (data.version !== undefined && data.version !== existing.version) {
      throw new Error(
        `CONCURRENCY_CONFLICT: Page was modified by another editor (current version ${existing.version}, supplied version ${data.version}). Please reload and retry.`
      );
    }

    // Check slug collision if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const slugCollision = await prisma.page.findFirst({
        where: { tenantId, slug: data.slug, id: { not: pageId } },
      });
      if (slugCollision) {
        throw new Error(`SLUG_ALREADY_EXISTS: A page with slug "${data.slug}" already exists in this institution.`);
      }
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        version: { increment: 1 },
        lastEditorId: editorId,
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle;
      if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription;
      if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl;
      if (data.scheduledPublishAt !== undefined) {
        updateData.scheduledPublishAt = data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null;
      }
      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      }

      await tx.page.update({
        where: { id: pageId },
        data: updateData,
      });

      if (data.sections !== undefined) {
        // Validate each section config
        const validatedSections = data.sections.map((sec, idx) => ({
          sectionType: sec.sectionType as SectionType,
          sortOrder: sec.sortOrder ?? idx,
          isVisible: sec.isVisible ?? true,
          config: validateSectionConfig(sec.sectionType, sec.config),
        }));

        // Replace sections atomically
        await tx.pageSection.deleteMany({ where: { pageId } });
        if (validatedSections.length > 0) {
          await tx.pageSection.createMany({
            data: validatedSections.map((s) => ({
              pageId,
              sectionType: s.sectionType,
              sortOrder: s.sortOrder,
              isVisible: s.isVisible,
              config: s.config as any,
            })),
          });
        }
      }
    });

    const updated = await this.findPageById(tenantId, pageId);
    if (!updated) {
      throw new Error('Failed to retrieve updated page');
    }
    return updated;
  }

  async publishPage(
    tenantId: string,
    pageId: string,
    editorId: string | null,
    scheduledPublishAt?: string | null
  ): Promise<PageDetailDto> {
    const existing = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!existing) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    const now = new Date();
    let publishedAt = now;
    let scheduledDate: Date | null = null;

    if (scheduledPublishAt) {
      scheduledDate = new Date(scheduledPublishAt);
      if (scheduledDate > now) {
        // Future scheduled publication
        publishedAt = scheduledDate;
      }
    }

    await prisma.page.update({
      where: { id: pageId },
      data: {
        status: PageStatus.PUBLISHED,
        publishedAt,
        scheduledPublishAt: scheduledDate,
        lastEditorId: editorId,
        version: { increment: 1 },
      },
    });

    const updated = await this.findPageById(tenantId, pageId);
    if (!updated) {
      throw new Error('Failed to retrieve published page');
    }
    return updated;
  }

  async archivePage(tenantId: string, pageId: string, editorId: string | null): Promise<PageDetailDto> {
    const existing = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!existing) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    await prisma.page.update({
      where: { id: pageId },
      data: {
        status: PageStatus.ARCHIVED,
        archivedAt: new Date(),
        lastEditorId: editorId,
        version: { increment: 1 },
      },
    });

    const updated = await this.findPageById(tenantId, pageId);
    if (!updated) {
      throw new Error('Failed to retrieve archived page');
    }
    return updated;
  }
}

/**
 * In-Memory CMS Repository for offline testing and fast standalone execution
 */
export class InMemoryCmsRepository implements ICmsRepository {
  private pages: Map<string, any> = new Map();
  private sections: Map<string, any[]> = new Map();

  async listPages(tenantId: string, query: PageQueryDto): Promise<PaginatedData<PageDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let items = Array.from(this.pages.values()).filter((p) => p.tenantId === tenantId);

    if (query.status) {
      items = items.filter((p) => p.status === query.status);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return {
      items: paged.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        status: p.status,
        authorId: p.authorId,
        lastEditorId: p.lastEditorId,
        publishedAt: p.publishedAt,
        scheduledPublishAt: p.scheduledPublishAt,
        archivedAt: p.archivedAt,
        expiresAt: p.expiresAt,
        version: p.version,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        sectionsCount: (this.sections.get(p.id) || []).length,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findPageById(tenantId: string, pageId: string): Promise<PageDetailDto | null> {
    const p = this.pages.get(pageId);
    if (!p || p.tenantId !== tenantId) {
      return null;
    }
    const secs = (this.sections.get(pageId) || []).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      ...p,
      sections: secs,
    };
  }

  async findPageBySlug(tenantId: string, slug: string): Promise<PageDetailDto | null> {
    const p = Array.from(this.pages.values()).find((item) => item.tenantId === tenantId && item.slug === slug);
    if (!p) {
      return null;
    }
    const secs = (this.sections.get(p.id) || []).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      ...p,
      sections: secs,
    };
  }

  async findPublicPageBySlug(tenantId: string, slug: string): Promise<PublicPageDto | null> {
    const now = new Date();
    const p = Array.from(this.pages.values()).find(
      (item) => item.tenantId === tenantId && item.slug === slug && item.status === 'PUBLISHED'
    );
    if (!p) {
      return null;
    }

    if (p.publishedAt && new Date(p.publishedAt) > now) {
      return null;
    }

    if (p.expiresAt && new Date(p.expiresAt) <= now) {
      return null;
    }

    const secs = (this.sections.get(p.id) || [])
      .filter((s) => s.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        id: s.id,
        sectionType: s.sectionType,
        sortOrder: s.sortOrder,
        config: s.config,
      }));

    return {
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      canonicalUrl: p.canonicalUrl,
      publishedAt: p.publishedAt || p.createdAt,
      sections: secs,
    };
  }

  async createPage(tenantId: string, authorId: string | null, data: CreatePageDto): Promise<PageDetailDto> {
    const collision = Array.from(this.pages.values()).find(
      (item) => item.tenantId === tenantId && item.slug === data.slug
    );
    if (collision) {
      throw new Error(`SLUG_ALREADY_EXISTS: A page with slug "${data.slug}" already exists in this institution.`);
    }

    const id = `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const validatedSections = data.sections.map((sec, idx) => ({
      id: `sec_${Date.now()}_${idx}`,
      pageId: id,
      sectionType: sec.sectionType,
      sortOrder: sec.sortOrder ?? idx,
      isVisible: sec.isVisible ?? true,
      config: validateSectionConfig(sec.sectionType, sec.config),
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const pageRecord = {
      id,
      tenantId,
      title: data.title,
      slug: data.slug,
      summary: data.summary || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      canonicalUrl: data.canonicalUrl || null,
      scheduledPublishAt: data.scheduledPublishAt || null,
      expiresAt: data.expiresAt || null,
      status: 'DRAFT' as const,
      authorId,
      lastEditorId: authorId,
      publishedAt: null,
      archivedAt: null,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.pages.set(id, pageRecord);
    this.sections.set(id, validatedSections);

    return {
      ...pageRecord,
      sections: validatedSections,
    };
  }

  async updatePage(
    tenantId: string,
    pageId: string,
    editorId: string | null,
    data: UpdatePageDto
  ): Promise<PageDetailDto> {
    const p = this.pages.get(pageId);
    if (!p || p.tenantId !== tenantId) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    if (data.version !== undefined && data.version !== p.version) {
      throw new Error(
        `CONCURRENCY_CONFLICT: Page was modified by another editor (current version ${p.version}, supplied version ${data.version}). Please reload and retry.`
      );
    }

    if (data.slug && data.slug !== p.slug) {
      const collision = Array.from(this.pages.values()).find(
        (item) => item.tenantId === tenantId && item.slug === data.slug && item.id !== pageId
      );
      if (collision) {
        throw new Error(`SLUG_ALREADY_EXISTS: A page with slug "${data.slug}" already exists in this institution.`);
      }
    }

    const nowIso = new Date().toISOString();
    const updated = {
      ...p,
      title: data.title !== undefined ? data.title : p.title,
      slug: data.slug !== undefined ? data.slug : p.slug,
      summary: data.summary !== undefined ? data.summary : p.summary,
      seoTitle: data.seoTitle !== undefined ? data.seoTitle : p.seoTitle,
      seoDescription: data.seoDescription !== undefined ? data.seoDescription : p.seoDescription,
      canonicalUrl: data.canonicalUrl !== undefined ? data.canonicalUrl : p.canonicalUrl,
      scheduledPublishAt: data.scheduledPublishAt !== undefined ? data.scheduledPublishAt : p.scheduledPublishAt,
      expiresAt: data.expiresAt !== undefined ? data.expiresAt : p.expiresAt,
      lastEditorId: editorId,
      version: p.version + 1,
      updatedAt: nowIso,
    };

    this.pages.set(pageId, updated);

    if (data.sections !== undefined) {
      const validatedSections = data.sections.map((sec, idx) => ({
        id: sec.id || `sec_${Date.now()}_${idx}`,
        pageId,
        sectionType: sec.sectionType,
        sortOrder: sec.sortOrder ?? idx,
        isVisible: sec.isVisible ?? true,
        config: validateSectionConfig(sec.sectionType, sec.config),
        createdAt: nowIso,
        updatedAt: nowIso,
      }));
      this.sections.set(pageId, validatedSections);
    }

    return {
      ...updated,
      sections: this.sections.get(pageId) || [],
    };
  }

  async publishPage(
    tenantId: string,
    pageId: string,
    editorId: string | null,
    scheduledPublishAt?: string | null
  ): Promise<PageDetailDto> {
    const p = this.pages.get(pageId);
    if (!p || p.tenantId !== tenantId) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    const nowIso = new Date().toISOString();
    const publishedAt = scheduledPublishAt ? scheduledPublishAt : nowIso;

    const updated = {
      ...p,
      status: 'PUBLISHED',
      publishedAt,
      scheduledPublishAt: scheduledPublishAt || null,
      lastEditorId: editorId,
      version: p.version + 1,
      updatedAt: nowIso,
    };

    this.pages.set(pageId, updated);

    return {
      ...updated,
      sections: this.sections.get(pageId) || [],
    };
  }

  async archivePage(tenantId: string, pageId: string, editorId: string | null): Promise<PageDetailDto> {
    const p = this.pages.get(pageId);
    if (!p || p.tenantId !== tenantId) {
      throw new Error(`PAGE_NOT_FOUND: Page "${pageId}" not found in this institution.`);
    }

    const nowIso = new Date().toISOString();
    const updated = {
      ...p,
      status: 'ARCHIVED',
      archivedAt: nowIso,
      lastEditorId: editorId,
      version: p.version + 1,
      updatedAt: nowIso,
    };

    this.pages.set(pageId, updated);

    return {
      ...updated,
      sections: this.sections.get(pageId) || [],
    };
  }
}
