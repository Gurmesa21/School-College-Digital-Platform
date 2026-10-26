import { prisma, PageStatus } from '@school/db';
import {
  StaffProfileDto,
  PublicStaffProfileDto,
  CreateStaffProfileDto,
  UpdateStaffProfileDto,
  StaffProfileQueryDto,
  PaginatedData,
} from '@school/shared';

export interface IStaffRepository {
  listStaff(tenantId: string, query?: StaffProfileQueryDto): Promise<PaginatedData<StaffProfileDto>>;
  getStaffById(tenantId: string, id: string): Promise<StaffProfileDto | null>;
  getStaffBySlug(tenantId: string, slug: string): Promise<StaffProfileDto | null>;
  createStaff(tenantId: string, authorId: string | null, data: CreateStaffProfileDto): Promise<StaffProfileDto>;
  updateStaff(tenantId: string, id: string, editorId: string | null, data: UpdateStaffProfileDto): Promise<StaffProfileDto>;
  deleteStaff(tenantId: string, id: string): Promise<void>;
  listPublicStaff(tenantId: string, query?: StaffProfileQueryDto): Promise<PaginatedData<PublicStaffProfileDto>>;
  getPublicStaffBySlug(tenantId: string, slug: string): Promise<PublicStaffProfileDto | null>;
}

export class PrismaStaffRepository implements IStaffRepository {
  private mapStaff(r: any): StaffProfileDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      fullName: r.fullName,
      slug: r.slug,
      roleTitle: r.roleTitle,
      biography: r.biography,
      departmentId: r.departmentId,
      profileMediaId: r.profileMediaId,
      subjects: Array.isArray(r.subjects) ? r.subjects : [],
      qualifications: r.qualifications,
      officeLocation: r.officeLocation,
      consultationHours: r.consultationHours,
      publicEmail: r.publicEmail,
      publicPhone: r.publicPhone,
      displayEmail: r.displayEmail,
      displayPhone: r.displayPhone,
      websiteUrl: r.websiteUrl,
      internalNotes: r.internalNotes,
      userId: r.userId,
      status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      isActive: r.isActive,
      isFeatured: r.isFeatured,
      orderIndex: r.orderIndex,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      canonicalUrl: r.canonicalUrl,
      authorId: r.authorId,
      lastEditorId: r.lastEditorId,
      department: r.department
        ? {
            id: r.department.id,
            tenantId: r.department.tenantId,
            name: r.department.name,
            slug: r.department.slug,
            code: r.department.code,
            description: r.department.description,
            parentId: r.department.parentId,
            orderIndex: r.department.orderIndex,
            isActive: r.department.isActive,
            createdAt: r.department.createdAt.toISOString(),
            updatedAt: r.department.updatedAt.toISOString(),
          }
        : null,
      profileMedia: r.profileMedia
        ? {
            id: r.profileMedia.id,
            title: r.profileMedia.title,
            publicUrl: r.profileMedia.publicUrl,
            altText: r.profileMedia.altText,
            caption: r.profileMedia.caption,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapPublicStaff(r: any): PublicStaffProfileDto {
    const approvedMedia =
      r.profileMedia && r.profileMedia.isPublic
        ? {
            id: r.profileMedia.id,
            title: r.profileMedia.title,
            publicUrl: r.profileMedia.publicUrl,
            altText: r.profileMedia.altText,
            caption: r.profileMedia.caption,
          }
        : null;

    return {
      id: r.id,
      fullName: r.fullName,
      slug: r.slug,
      roleTitle: r.roleTitle,
      biography: r.biography,
      subjects: Array.isArray(r.subjects) ? r.subjects : [],
      qualifications: r.qualifications,
      officeLocation: r.officeLocation,
      consultationHours: r.consultationHours,
      // Strict privacy allowlist: Only return email/phone if explicitly approved
      publicEmail: r.displayEmail && r.publicEmail ? r.publicEmail : null,
      publicPhone: r.displayPhone && r.publicPhone ? r.publicPhone : null,
      websiteUrl: r.websiteUrl,
      isFeatured: r.isFeatured,
      orderIndex: r.orderIndex,
      department: r.department
        ? {
            id: r.department.id,
            name: r.department.name,
            slug: r.department.slug,
            code: r.department.code,
          }
        : null,
      profileMedia: approvedMedia,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      canonicalUrl: r.canonicalUrl,
    };
  }

  async listStaff(
    tenantId: string,
    query: StaffProfileQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<StaffProfileDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) where.status = query.status as PageStatus;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.roleTitle) where.roleTitle = { contains: query.roleTitle, mode: 'insensitive' };
    if (query.subject) where.subjects = { has: query.subject };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { roleTitle: { contains: q, mode: 'insensitive' } },
        { biography: { contains: q, mode: 'insensitive' } },
        { qualifications: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.staffProfile.count({ where }),
      prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }, { fullName: 'asc' }],
        include: {
          department: true,
          profileMedia: true,
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapStaff(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStaffById(tenantId: string, id: string): Promise<StaffProfileDto | null> {
    const r = await prisma.staffProfile.findFirst({
      where: { tenantId, id },
      include: {
        department: true,
        profileMedia: true,
      },
    });
    if (!r) return null;
    return this.mapStaff(r);
  }

  async getStaffBySlug(tenantId: string, slug: string): Promise<StaffProfileDto | null> {
    const r = await prisma.staffProfile.findFirst({
      where: { tenantId, slug },
      include: {
        department: true,
        profileMedia: true,
      },
    });
    if (!r) return null;
    return this.mapStaff(r);
  }

  async createStaff(
    tenantId: string,
    authorId: string | null,
    data: CreateStaffProfileDto
  ): Promise<StaffProfileDto> {
    const r = await prisma.staffProfile.create({
      data: {
        tenantId,
        authorId,
        fullName: data.fullName,
        slug: data.slug,
        roleTitle: data.roleTitle,
        biography: data.biography,
        departmentId: data.departmentId,
        profileMediaId: data.profileMediaId,
        subjects: data.subjects || [],
        qualifications: data.qualifications,
        officeLocation: data.officeLocation,
        consultationHours: data.consultationHours,
        publicEmail: data.publicEmail || null,
        publicPhone: data.publicPhone || null,
        displayEmail: data.displayEmail ?? false,
        displayPhone: data.displayPhone ?? false,
        websiteUrl: data.websiteUrl || null,
        internalNotes: data.internalNotes,
        userId: data.userId,
        status: (data.status as PageStatus) || PageStatus.DRAFT,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        orderIndex: data.orderIndex ?? 0,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        canonicalUrl: data.canonicalUrl,
      },
      include: {
        department: true,
        profileMedia: true,
      },
    });
    return this.mapStaff(r);
  }

  async updateStaff(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateStaffProfileDto
  ): Promise<StaffProfileDto> {
    const updateData: any = {
      ...(editorId && { lastEditorId: editorId }),
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.roleTitle !== undefined && { roleTitle: data.roleTitle }),
      ...(data.biography !== undefined && { biography: data.biography }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.profileMediaId !== undefined && { profileMediaId: data.profileMediaId }),
      ...(data.subjects !== undefined && { subjects: data.subjects }),
      ...(data.qualifications !== undefined && { qualifications: data.qualifications }),
      ...(data.officeLocation !== undefined && { officeLocation: data.officeLocation }),
      ...(data.consultationHours !== undefined && { consultationHours: data.consultationHours }),
      ...(data.publicEmail !== undefined && { publicEmail: data.publicEmail || null }),
      ...(data.publicPhone !== undefined && { publicPhone: data.publicPhone || null }),
      ...(data.displayEmail !== undefined && { displayEmail: data.displayEmail }),
      ...(data.displayPhone !== undefined && { displayPhone: data.displayPhone }),
      ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
      ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
      ...(data.userId !== undefined && { userId: data.userId }),
      ...(data.status !== undefined && {
        status: data.status as PageStatus,
        ...(data.status === 'PUBLISHED' && { publishedAt: new Date() }),
        ...(data.status === 'ARCHIVED' && { archivedAt: new Date() }),
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      ...(data.canonicalUrl !== undefined && { canonicalUrl: data.canonicalUrl }),
    };

    const r = await prisma.staffProfile.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        profileMedia: true,
      },
    });
    return this.mapStaff(r);
  }

  async deleteStaff(tenantId: string, id: string): Promise<void> {
    await prisma.staffProfile.deleteMany({ where: { id, tenantId } });
  }

  // --- Public Retrieval with Privacy Redaction ---
  async listPublicStaff(
    tenantId: string,
    query: StaffProfileQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<PublicStaffProfileDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: PageStatus.PUBLISHED,
      isActive: true,
    };
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.roleTitle) where.roleTitle = { contains: query.roleTitle, mode: 'insensitive' };
    if (query.subject) where.subjects = { has: query.subject };
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { roleTitle: { contains: q, mode: 'insensitive' } },
        { biography: { contains: q, mode: 'insensitive' } },
        { qualifications: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.staffProfile.count({ where }),
      prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }, { fullName: 'asc' }],
        include: {
          department: { select: { id: true, name: true, slug: true, code: true } },
          profileMedia: { select: { id: true, title: true, publicUrl: true, altText: true, caption: true, isPublic: true } },
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapPublicStaff(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicStaffBySlug(tenantId: string, slug: string): Promise<PublicStaffProfileDto | null> {
    const r = await prisma.staffProfile.findFirst({
      where: {
        tenantId,
        slug,
        status: PageStatus.PUBLISHED,
        isActive: true,
      },
      include: {
        department: { select: { id: true, name: true, slug: true, code: true } },
        profileMedia: { select: { id: true, title: true, publicUrl: true, altText: true, caption: true, isPublic: true } },
      },
    });
    if (!r) return null;
    return this.mapPublicStaff(r);
  }
}

import { IMediaRepository } from './mediaRepository.js';
import { IAcademicRepository } from './academicRepository.js';

/**
 * In-memory repository implementation for automated isolated test suites
 */
export class InMemoryStaffRepository implements IStaffRepository {
  private staff: Array<any> = [];

  constructor(
    initialStaff: any[] = [],
    private readonly mediaRepo?: IMediaRepository,
    private readonly academicRepo?: IAcademicRepository
  ) {
    this.staff = [...initialStaff];
  }

  private mapStaff(r: any): StaffProfileDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      fullName: r.fullName,
      slug: r.slug,
      roleTitle: r.roleTitle,
      biography: r.biography ?? null,
      departmentId: r.departmentId ?? null,
      profileMediaId: r.profileMediaId ?? null,
      subjects: Array.isArray(r.subjects) ? r.subjects : [],
      qualifications: r.qualifications ?? null,
      officeLocation: r.officeLocation ?? null,
      consultationHours: r.consultationHours ?? null,
      publicEmail: r.publicEmail ?? null,
      publicPhone: r.publicPhone ?? null,
      displayEmail: Boolean(r.displayEmail),
      displayPhone: Boolean(r.displayPhone),
      websiteUrl: r.websiteUrl ?? null,
      internalNotes: r.internalNotes ?? null,
      userId: r.userId ?? null,
      status: r.status || 'DRAFT',
      isActive: r.isActive !== false,
      isFeatured: Boolean(r.isFeatured),
      orderIndex: r.orderIndex || 0,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      archivedAt: r.archivedAt ? new Date(r.archivedAt).toISOString() : null,
      seoTitle: r.seoTitle ?? null,
      seoDescription: r.seoDescription ?? null,
      canonicalUrl: r.canonicalUrl ?? null,
      authorId: r.authorId ?? null,
      lastEditorId: r.lastEditorId ?? null,
      department: r.department ?? null,
      profileMedia: r.profileMedia ?? null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapPublicStaff(r: any): PublicStaffProfileDto {
    const approvedMedia =
      r.profileMedia && r.profileMedia.isPublic
        ? {
            id: r.profileMedia.id,
            title: r.profileMedia.title,
            publicUrl: r.profileMedia.publicUrl,
            altText: r.profileMedia.altText ?? null,
            caption: r.profileMedia.caption ?? null,
          }
        : null;

    return {
      id: r.id,
      fullName: r.fullName,
      slug: r.slug,
      roleTitle: r.roleTitle,
      biography: r.biography ?? null,
      subjects: Array.isArray(r.subjects) ? r.subjects : [],
      qualifications: r.qualifications ?? null,
      officeLocation: r.officeLocation ?? null,
      consultationHours: r.consultationHours ?? null,
      publicEmail: r.displayEmail && r.publicEmail ? r.publicEmail : null,
      publicPhone: r.displayPhone && r.publicPhone ? r.publicPhone : null,
      websiteUrl: r.websiteUrl ?? null,
      isFeatured: Boolean(r.isFeatured),
      orderIndex: r.orderIndex || 0,
      department: r.department
        ? {
            id: r.department.id,
            name: r.department.name,
            slug: r.department.slug,
            code: r.department.code ?? null,
          }
        : null,
      profileMedia: approvedMedia,
      seoTitle: r.seoTitle ?? null,
      seoDescription: r.seoDescription ?? null,
      canonicalUrl: r.canonicalUrl ?? null,
    };
  }

  async listStaff(tenantId: string, query: StaffProfileQueryDto = { page: 1, limit: 20 }): Promise<PaginatedData<StaffProfileDto>> {
    let items = this.staff.filter((s) => s.tenantId === tenantId);

    if (query.status) items = items.filter((s) => s.status === query.status);
    if (query.departmentId) items = items.filter((s) => s.departmentId === query.departmentId);
    if (query.roleTitle) {
      const q = query.roleTitle.toLowerCase();
      items = items.filter((s) => s.roleTitle.toLowerCase().includes(q));
    }
    if (query.subject) {
      items = items.filter((s) => (s.subjects || []).includes(query.subject));
    }
    if (query.isActive !== undefined) items = items.filter((s) => s.isActive === query.isActive);
    if (query.isFeatured !== undefined) items = items.filter((s) => s.isFeatured === query.isFeatured);
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          s.roleTitle.toLowerCase().includes(q) ||
          (s.biography && s.biography.toLowerCase().includes(q)) ||
          (s.qualifications && s.qualifications.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.fullName.localeCompare(b.fullName);
    });

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginated.map((r) => this.mapStaff(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStaffById(tenantId: string, id: string): Promise<StaffProfileDto | null> {
    const item = this.staff.find((s) => s.tenantId === tenantId && s.id === id);
    if (!item) return null;
    return this.mapStaff(item);
  }

  async getStaffBySlug(tenantId: string, slug: string): Promise<StaffProfileDto | null> {
    const item = this.staff.find((s) => s.tenantId === tenantId && s.slug === slug);
    if (!item) return null;
    return this.mapStaff(item);
  }

  async createStaff(
    tenantId: string,
    authorId: string | null,
    data: CreateStaffProfileDto
  ): Promise<StaffProfileDto> {
    const now = new Date();
    let profileMedia: any = null;
    if (data.profileMediaId && this.mediaRepo) {
      const m = await this.mediaRepo.getMediaById(tenantId, data.profileMediaId);
      if (m) {
        profileMedia = {
          id: m.id,
          title: m.title,
          publicUrl: m.publicUrl,
          altText: m.altText,
          caption: m.caption,
          isPublic: m.isPublic,
        };
      }
    }

    let department: any = null;
    if (data.departmentId && this.academicRepo) {
      const d = await this.academicRepo.getDepartmentById(tenantId, data.departmentId);
      if (d) {
        department = {
          id: d.id,
          tenantId: d.tenantId,
          name: d.name,
          slug: d.slug,
          code: d.code,
        };
      }
    }

    const newRecord: any = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      authorId,
      fullName: data.fullName,
      slug: data.slug,
      roleTitle: data.roleTitle,
      biography: data.biography || null,
      departmentId: data.departmentId || null,
      profileMediaId: data.profileMediaId || null,
      subjects: data.subjects || [],
      qualifications: data.qualifications || null,
      officeLocation: data.officeLocation || null,
      consultationHours: data.consultationHours || null,
      publicEmail: data.publicEmail || null,
      publicPhone: data.publicPhone || null,
      displayEmail: data.displayEmail ?? false,
      displayPhone: data.displayPhone ?? false,
      websiteUrl: data.websiteUrl || null,
      internalNotes: data.internalNotes || null,
      userId: data.userId || null,
      status: data.status || 'DRAFT',
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      orderIndex: data.orderIndex ?? 0,
      publishedAt: data.status === 'PUBLISHED' ? now : null,
      archivedAt: null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      canonicalUrl: data.canonicalUrl || null,
      profileMedia,
      department,
      createdAt: now,
      updatedAt: now,
    };

    this.staff.push(newRecord);
    return this.mapStaff(newRecord);
  }

  async updateStaff(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateStaffProfileDto
  ): Promise<StaffProfileDto> {
    const index = this.staff.findIndex((s) => s.tenantId === tenantId && s.id === id);
    if (index === -1) throw new Error('Staff record not found');

    const current = this.staff[index];
    const now = new Date();

    let profileMedia = current.profileMedia;
    if (data.profileMediaId !== undefined) {
      if (data.profileMediaId && this.mediaRepo) {
        const m = await this.mediaRepo.getMediaById(tenantId, data.profileMediaId);
        profileMedia = m
          ? {
              id: m.id,
              title: m.title,
              publicUrl: m.publicUrl,
              altText: m.altText,
              caption: m.caption,
              isPublic: m.isPublic,
            }
          : null;
      } else {
        profileMedia = null;
      }
    }

    let department = current.department;
    if (data.departmentId !== undefined) {
      if (data.departmentId && this.academicRepo) {
        const d = await this.academicRepo.getDepartmentById(tenantId, data.departmentId);
        department = d
          ? {
              id: d.id,
              tenantId: d.tenantId,
              name: d.name,
              slug: d.slug,
              code: d.code,
            }
          : null;
      } else {
        department = null;
      }
    }

    const updated = {
      ...current,
      ...(editorId && { lastEditorId: editorId }),
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.roleTitle !== undefined && { roleTitle: data.roleTitle }),
      ...(data.biography !== undefined && { biography: data.biography }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.profileMediaId !== undefined && { profileMediaId: data.profileMediaId }),
      ...(data.subjects !== undefined && { subjects: data.subjects }),
      ...(data.qualifications !== undefined && { qualifications: data.qualifications }),
      ...(data.officeLocation !== undefined && { officeLocation: data.officeLocation }),
      ...(data.consultationHours !== undefined && { consultationHours: data.consultationHours }),
      ...(data.publicEmail !== undefined && { publicEmail: data.publicEmail || null }),
      ...(data.publicPhone !== undefined && { publicPhone: data.publicPhone || null }),
      ...(data.displayEmail !== undefined && { displayEmail: data.displayEmail }),
      ...(data.displayPhone !== undefined && { displayPhone: data.displayPhone }),
      ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
      ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
      ...(data.userId !== undefined && { userId: data.userId }),
      ...(data.status !== undefined && {
        status: data.status,
        ...(data.status === 'PUBLISHED' && { publishedAt: now }),
        ...(data.status === 'ARCHIVED' && { archivedAt: now }),
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      ...(data.canonicalUrl !== undefined && { canonicalUrl: data.canonicalUrl }),
      profileMedia,
      department,
      updatedAt: now,
    };

    this.staff[index] = updated;
    return this.mapStaff(updated);
  }

  async deleteStaff(tenantId: string, id: string): Promise<void> {
    this.staff = this.staff.filter((s) => !(s.tenantId === tenantId && s.id === id));
  }

  async listPublicStaff(
    tenantId: string,
    query: StaffProfileQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<PublicStaffProfileDto>> {
    let items = this.staff.filter(
      (s) => s.tenantId === tenantId && s.status === 'PUBLISHED' && s.isActive === true
    );

    if (query.departmentId) items = items.filter((s) => s.departmentId === query.departmentId);
    if (query.roleTitle) {
      const q = query.roleTitle.toLowerCase();
      items = items.filter((s) => s.roleTitle.toLowerCase().includes(q));
    }
    if (query.subject) {
      items = items.filter((s) => (s.subjects || []).includes(query.subject));
    }
    if (query.isFeatured !== undefined) items = items.filter((s) => s.isFeatured === query.isFeatured);
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.roleTitle.toLowerCase().includes(q) ||
          (s.biography && s.biography.toLowerCase().includes(q)) ||
          (s.qualifications && s.qualifications.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.fullName.localeCompare(b.fullName);
    });

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginated.map((r) => this.mapPublicStaff(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicStaffBySlug(tenantId: string, slug: string): Promise<PublicStaffProfileDto | null> {
    const item = this.staff.find(
      (s) => s.tenantId === tenantId && s.slug === slug && s.status === 'PUBLISHED' && s.isActive === true
    );
    if (!item) return null;
    return this.mapPublicStaff(item);
  }
}
