import { prisma, PageStatus } from '@school/db';
import {
  AcademicLevelDto,
  CreateAcademicLevelDto,
  UpdateAcademicLevelDto,
  AcademicDepartmentDto,
  CreateAcademicDepartmentDto,
  UpdateAcademicDepartmentDto,
  ProgrammeDto,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  ProgrammeQueryDto,
  PublicProgrammeDto,
  CourseDto,
  CreateCourseDto,
  UpdateCourseDto,
  PaginatedData,
} from '@school/shared';

export interface IAcademicRepository {
  // Academic Levels
  listLevels(tenantId: string, onlyActive?: boolean): Promise<AcademicLevelDto[]>;
  getLevelById(tenantId: string, id: string): Promise<AcademicLevelDto | null>;
  getLevelBySlug(tenantId: string, slug: string): Promise<AcademicLevelDto | null>;
  createLevel(tenantId: string, data: CreateAcademicLevelDto): Promise<AcademicLevelDto>;
  updateLevel(tenantId: string, id: string, data: UpdateAcademicLevelDto): Promise<AcademicLevelDto>;
  deleteLevel(tenantId: string, id: string): Promise<void>;

  // Academic Departments
  listDepartments(tenantId: string, onlyActive?: boolean): Promise<AcademicDepartmentDto[]>;
  getDepartmentById(tenantId: string, id: string): Promise<AcademicDepartmentDto | null>;
  getDepartmentBySlug(tenantId: string, slug: string): Promise<AcademicDepartmentDto | null>;
  createDepartment(tenantId: string, data: CreateAcademicDepartmentDto): Promise<AcademicDepartmentDto>;
  updateDepartment(tenantId: string, id: string, data: UpdateAcademicDepartmentDto): Promise<AcademicDepartmentDto>;
  deleteDepartment(tenantId: string, id: string): Promise<void>;

  // Programmes
  listProgrammes(tenantId: string, query?: ProgrammeQueryDto): Promise<PaginatedData<ProgrammeDto>>;
  getProgrammeById(tenantId: string, id: string): Promise<ProgrammeDto | null>;
  getProgrammeBySlug(tenantId: string, slug: string): Promise<ProgrammeDto | null>;
  createProgramme(tenantId: string, authorId: string | null, data: CreateProgrammeDto): Promise<ProgrammeDto>;
  updateProgramme(tenantId: string, id: string, editorId: string | null, data: UpdateProgrammeDto): Promise<ProgrammeDto>;
  deleteProgramme(tenantId: string, id: string): Promise<void>;
  listPublicProgrammes(tenantId: string, query?: ProgrammeQueryDto): Promise<PaginatedData<PublicProgrammeDto>>;
  getPublicProgrammeBySlug(tenantId: string, slug: string): Promise<PublicProgrammeDto | null>;

  // Courses
  listCourses(tenantId: string, levelId?: string, departmentId?: string): Promise<CourseDto[]>;
  getCourseById(tenantId: string, id: string): Promise<CourseDto | null>;
  getCourseBySlug(tenantId: string, slug: string): Promise<CourseDto | null>;
  createCourse(tenantId: string, data: CreateCourseDto): Promise<CourseDto>;
  updateCourse(tenantId: string, id: string, data: UpdateCourseDto): Promise<CourseDto>;
  deleteCourse(tenantId: string, id: string): Promise<void>;
  assignCoursesToProgramme(programmeId: string, courseIds: string[], isRequired?: boolean, term?: string | null): Promise<void>;
  removeCourseFromProgramme(programmeId: string, courseId: string): Promise<void>;
}

export class PrismaAcademicRepository implements IAcademicRepository {
  // --- Academic Levels ---
  async listLevels(tenantId: string, onlyActive = false): Promise<AcademicLevelDto[]> {
    const where: any = { tenantId };
    if (onlyActive) where.isActive = true;
    const records = await prisma.academicLevel.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
    return records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getLevelById(tenantId: string, id: string): Promise<AcademicLevelDto | null> {
    const r = await prisma.academicLevel.findFirst({ where: { tenantId, id } });
    if (!r) return null;
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async getLevelBySlug(tenantId: string, slug: string): Promise<AcademicLevelDto | null> {
    const r = await prisma.academicLevel.findFirst({ where: { tenantId, slug } });
    if (!r) return null;
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async createLevel(tenantId: string, data: CreateAcademicLevelDto): Promise<AcademicLevelDto> {
    const r = await prisma.academicLevel.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        levelType: data.levelType,
        description: data.description,
        orderIndex: data.orderIndex ?? 0,
        minAge: data.minAge,
        maxAge: data.maxAge,
        isActive: data.isActive ?? true,
      },
    });
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async updateLevel(tenantId: string, id: string, data: UpdateAcademicLevelDto): Promise<AcademicLevelDto> {
    const r = await prisma.academicLevel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.levelType !== undefined && { levelType: data.levelType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.minAge !== undefined && { minAge: data.minAge }),
        ...(data.maxAge !== undefined && { maxAge: data.maxAge }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async deleteLevel(tenantId: string, id: string): Promise<void> {
    await prisma.academicLevel.deleteMany({ where: { id, tenantId } });
  }

  // --- Academic Departments ---
  async listDepartments(tenantId: string, onlyActive = false): Promise<AcademicDepartmentDto[]> {
    const where: any = { tenantId };
    if (onlyActive) where.isActive = true;
    const records = await prisma.academicDepartment.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
    return records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getDepartmentById(tenantId: string, id: string): Promise<AcademicDepartmentDto | null> {
    const r = await prisma.academicDepartment.findFirst({
      where: { tenantId, id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!r) return null;
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async getDepartmentBySlug(tenantId: string, slug: string): Promise<AcademicDepartmentDto | null> {
    const r = await prisma.academicDepartment.findFirst({
      where: { tenantId, slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!r) return null;
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async createDepartment(tenantId: string, data: CreateAcademicDepartmentDto): Promise<AcademicDepartmentDto> {
    const r = await prisma.academicDepartment.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        code: data.code,
        description: data.description,
        parentId: data.parentId,
        orderIndex: data.orderIndex ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    });
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async updateDepartment(tenantId: string, id: string, data: UpdateAcademicDepartmentDto): Promise<AcademicDepartmentDto> {
    const r = await prisma.academicDepartment.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    });
    return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async deleteDepartment(tenantId: string, id: string): Promise<void> {
    await prisma.academicDepartment.deleteMany({ where: { id, tenantId } });
  }

  // --- Programmes ---
  private mapProgramme(r: any): ProgrammeDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      description: r.description,
      programmeType: r.programmeType,
      levelId: r.levelId,
      departmentId: r.departmentId,
      duration: r.duration,
      entryRequirements: r.entryRequirements,
      qualificationsAwarded: r.qualificationsAwarded,
      curriculum: r.curriculum,
      tuitionFee: r.tuitionFee,
      tuitionCurrency: r.tuitionCurrency,
      tuitionPeriod: r.tuitionPeriod,
      tuitionDescription: r.tuitionDescription,
      displayTuition: r.displayTuition,
      heroMediaId: r.heroMediaId,
      status: r.status as any,
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
      level: r.level
        ? {
            ...r.level,
            createdAt: r.level.createdAt.toISOString(),
            updatedAt: r.level.updatedAt.toISOString(),
          }
        : null,
      department: r.department
        ? {
            ...r.department,
            createdAt: r.department.createdAt.toISOString(),
            updatedAt: r.department.updatedAt.toISOString(),
          }
        : null,
      heroMedia: r.heroMedia
        ? {
            id: r.heroMedia.id,
            title: r.heroMedia.title,
            publicUrl: r.heroMedia.publicUrl,
            altText: r.heroMedia.altText,
            caption: r.heroMedia.caption,
          }
        : null,
      courses: r.courses
        ? r.courses.map((pc: any) => ({
            programmeId: pc.programmeId,
            courseId: pc.courseId,
            isRequired: pc.isRequired,
            term: pc.term,
            orderIndex: pc.orderIndex,
            course: {
              ...pc.course,
              createdAt: pc.course.createdAt.toISOString(),
              updatedAt: pc.course.updatedAt.toISOString(),
            },
          }))
        : [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async listProgrammes(
    tenantId: string,
    query: ProgrammeQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<ProgrammeDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) where.status = query.status as PageStatus;
    if (query.levelId) where.levelId = query.levelId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.programmeType) where.programmeType = query.programmeType;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.programme.count({ where }),
      prisma.programme.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }, { title: 'asc' }],
        include: {
          level: true,
          department: true,
          heroMedia: true,
          courses: {
            include: { course: true },
            orderBy: [{ orderIndex: 'asc' }],
          },
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapProgramme(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProgrammeById(tenantId: string, id: string): Promise<ProgrammeDto | null> {
    const r = await prisma.programme.findFirst({
      where: { tenantId, id },
      include: {
        level: true,
        department: true,
        heroMedia: true,
        courses: {
          include: { course: true },
          orderBy: [{ orderIndex: 'asc' }],
        },
      },
    });
    if (!r) return null;
    return this.mapProgramme(r);
  }

  async getProgrammeBySlug(tenantId: string, slug: string): Promise<ProgrammeDto | null> {
    const r = await prisma.programme.findFirst({
      where: { tenantId, slug },
      include: {
        level: true,
        department: true,
        heroMedia: true,
        courses: {
          include: { course: true },
          orderBy: [{ orderIndex: 'asc' }],
        },
      },
    });
    if (!r) return null;
    return this.mapProgramme(r);
  }

  async createProgramme(
    tenantId: string,
    authorId: string | null,
    data: CreateProgrammeDto
  ): Promise<ProgrammeDto> {
    const r = await prisma.programme.create({
      data: {
        tenantId,
        authorId,
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        programmeType: data.programmeType,
        levelId: data.levelId,
        departmentId: data.departmentId,
        duration: data.duration,
        entryRequirements: data.entryRequirements,
        qualificationsAwarded: data.qualificationsAwarded,
        curriculum: data.curriculum,
        tuitionFee: data.tuitionFee,
        tuitionCurrency: data.tuitionCurrency || 'USD',
        tuitionPeriod: data.tuitionPeriod,
        tuitionDescription: data.tuitionDescription,
        displayTuition: data.displayTuition ?? false,
        heroMediaId: data.heroMediaId,
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
        level: true,
        department: true,
        heroMedia: true,
        courses: {
          include: { course: true },
          orderBy: [{ orderIndex: 'asc' }],
        },
      },
    });
    return this.mapProgramme(r);
  }

  async updateProgramme(
    tenantId: string,
    id: string,
    editorId: string | null,
    data: UpdateProgrammeDto
  ): Promise<ProgrammeDto> {
    const updateData: any = {
      ...(editorId && { lastEditorId: editorId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.programmeType !== undefined && { programmeType: data.programmeType }),
      ...(data.levelId !== undefined && { levelId: data.levelId }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.entryRequirements !== undefined && { entryRequirements: data.entryRequirements }),
      ...(data.qualificationsAwarded !== undefined && { qualificationsAwarded: data.qualificationsAwarded }),
      ...(data.curriculum !== undefined && { curriculum: data.curriculum }),
      ...(data.tuitionFee !== undefined && { tuitionFee: data.tuitionFee }),
      ...(data.tuitionCurrency !== undefined && { tuitionCurrency: data.tuitionCurrency }),
      ...(data.tuitionPeriod !== undefined && { tuitionPeriod: data.tuitionPeriod }),
      ...(data.tuitionDescription !== undefined && { tuitionDescription: data.tuitionDescription }),
      ...(data.displayTuition !== undefined && { displayTuition: data.displayTuition }),
      ...(data.heroMediaId !== undefined && { heroMediaId: data.heroMediaId }),
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

    const r = await prisma.programme.update({
      where: { id },
      data: updateData,
      include: {
        level: true,
        department: true,
        heroMedia: true,
        courses: {
          include: { course: true },
          orderBy: [{ orderIndex: 'asc' }],
        },
      },
    });
    return this.mapProgramme(r);
  }

  async deleteProgramme(tenantId: string, id: string): Promise<void> {
    await prisma.programme.deleteMany({ where: { id, tenantId } });
  }

  // --- Public Retrieval ---
  async listPublicProgrammes(
    tenantId: string,
    query: ProgrammeQueryDto = { page: 1, limit: 20 }
  ): Promise<PaginatedData<PublicProgrammeDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: PageStatus.PUBLISHED,
      isActive: true,
    };
    if (query.levelId) where.levelId = query.levelId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.programmeType) where.programmeType = query.programmeType;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.programme.count({ where }),
      prisma.programme.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }, { title: 'asc' }],
        include: {
          level: { select: { id: true, name: true, slug: true, levelType: true } },
          department: { select: { id: true, name: true, slug: true, code: true } },
          heroMedia: { select: { id: true, title: true, publicUrl: true, altText: true, caption: true, isPublic: true } },
          courses: {
            include: {
              course: { select: { id: true, title: true, code: true, credits: true, summary: true } },
            },
            orderBy: [{ orderIndex: 'asc' }],
          },
        },
      }),
    ]);

    const items: PublicProgrammeDto[] = records.map((r) => {
      const approvedHero = r.heroMedia?.isPublic ? r.heroMedia : null;
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        description: r.description,
        programmeType: r.programmeType,
        duration: r.duration,
        entryRequirements: r.entryRequirements,
        qualificationsAwarded: r.qualificationsAwarded,
        curriculum: r.curriculum,
        displayTuition: r.displayTuition,
        // Only disclose tuition if displayTuition is approved
        tuitionFee: r.displayTuition ? r.tuitionFee : null,
        tuitionCurrency: r.displayTuition ? r.tuitionCurrency : null,
        tuitionPeriod: r.displayTuition ? r.tuitionPeriod : null,
        tuitionDescription: r.displayTuition ? r.tuitionDescription : null,
        isFeatured: r.isFeatured,
        level: r.level ? { id: r.level.id, name: r.level.name, slug: r.level.slug, levelType: r.level.levelType } : null,
        department: r.department
          ? { id: r.department.id, name: r.department.name, slug: r.department.slug, code: r.department.code }
          : null,
        heroMedia: approvedHero,
        courses: r.courses.map((pc) => ({
          courseId: pc.courseId,
          isRequired: pc.isRequired,
          term: pc.term,
          title: pc.course.title,
          code: pc.course.code,
          credits: pc.course.credits,
          summary: pc.course.summary,
        })),
        seoTitle: r.seoTitle,
        seoDescription: r.seoDescription,
        canonicalUrl: r.canonicalUrl,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPublicProgrammeBySlug(tenantId: string, slug: string): Promise<PublicProgrammeDto | null> {
    const r = await prisma.programme.findFirst({
      where: {
        tenantId,
        slug,
        status: PageStatus.PUBLISHED,
        isActive: true,
      },
      include: {
        level: { select: { id: true, name: true, slug: true, levelType: true } },
        department: { select: { id: true, name: true, slug: true, code: true } },
        heroMedia: { select: { id: true, title: true, publicUrl: true, altText: true, caption: true, isPublic: true } },
        courses: {
          include: {
            course: { select: { id: true, title: true, code: true, credits: true, summary: true } },
          },
          orderBy: [{ orderIndex: 'asc' }],
        },
      },
    });
    if (!r) return null;

    const approvedHero = r.heroMedia?.isPublic ? r.heroMedia : null;
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      description: r.description,
      programmeType: r.programmeType,
      duration: r.duration,
      entryRequirements: r.entryRequirements,
      qualificationsAwarded: r.qualificationsAwarded,
      curriculum: r.curriculum,
      displayTuition: r.displayTuition,
      tuitionFee: r.displayTuition ? r.tuitionFee : null,
      tuitionCurrency: r.displayTuition ? r.tuitionCurrency : null,
      tuitionPeriod: r.displayTuition ? r.tuitionPeriod : null,
      tuitionDescription: r.displayTuition ? r.tuitionDescription : null,
      isFeatured: r.isFeatured,
      level: r.level ? { id: r.level.id, name: r.level.name, slug: r.level.slug, levelType: r.level.levelType } : null,
      department: r.department
        ? { id: r.department.id, name: r.department.name, slug: r.department.slug, code: r.department.code }
        : null,
      heroMedia: approvedHero,
      courses: r.courses.map((pc) => ({
        courseId: pc.courseId,
        isRequired: pc.isRequired,
        term: pc.term,
        title: pc.course.title,
        code: pc.course.code,
        credits: pc.course.credits,
        summary: pc.course.summary,
      })),
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      canonicalUrl: r.canonicalUrl,
    };
  }

  // --- Courses ---
  private mapCourse(r: any): CourseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      code: r.code,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      description: r.description,
      credits: r.credits,
      hours: r.hours,
      levelId: r.levelId,
      departmentId: r.departmentId,
      syllabus: r.syllabus,
      status: r.status as any,
      orderIndex: r.orderIndex,
      level: r.level ? { id: r.level.id, name: r.level.name, slug: r.level.slug } : null,
      department: r.department ? { id: r.department.id, name: r.department.name, slug: r.department.slug } : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async listCourses(tenantId: string, levelId?: string, departmentId?: string): Promise<CourseDto[]> {
    const where: any = { tenantId };
    if (levelId) where.levelId = levelId;
    if (departmentId) where.departmentId = departmentId;
    const records = await prisma.course.findMany({
      where,
      include: {
        level: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
    });
    return records.map((r) => this.mapCourse(r));
  }

  async getCourseById(tenantId: string, id: string): Promise<CourseDto | null> {
    const r = await prisma.course.findFirst({
      where: { tenantId, id },
      include: {
        level: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!r) return null;
    return this.mapCourse(r);
  }

  async getCourseBySlug(tenantId: string, slug: string): Promise<CourseDto | null> {
    const r = await prisma.course.findFirst({
      where: { tenantId, slug },
      include: {
        level: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!r) return null;
    return this.mapCourse(r);
  }

  async createCourse(tenantId: string, data: CreateCourseDto): Promise<CourseDto> {
    const r = await prisma.course.create({
      data: {
        tenantId,
        code: data.code,
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        credits: data.credits,
        hours: data.hours,
        levelId: data.levelId,
        departmentId: data.departmentId,
        syllabus: data.syllabus,
        status: (data.status as PageStatus) || PageStatus.DRAFT,
        orderIndex: data.orderIndex ?? 0,
      },
      include: {
        level: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    });
    return this.mapCourse(r);
  }

  async updateCourse(tenantId: string, id: string, data: UpdateCourseDto): Promise<CourseDto> {
    const r = await prisma.course.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.credits !== undefined && { credits: data.credits }),
        ...(data.hours !== undefined && { hours: data.hours }),
        ...(data.levelId !== undefined && { levelId: data.levelId }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.syllabus !== undefined && { syllabus: data.syllabus }),
        ...(data.status !== undefined && { status: data.status as PageStatus }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
      include: {
        level: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    });
    return this.mapCourse(r);
  }

  async deleteCourse(tenantId: string, id: string): Promise<void> {
    await prisma.course.deleteMany({ where: { id, tenantId } });
  }

  async assignCoursesToProgramme(
    programmeId: string,
    courseIds: string[],
    isRequired = true,
    term?: string | null
  ): Promise<void> {
    for (let i = 0; i < courseIds.length; i++) {
      const courseId = courseIds[i];
      await prisma.programmeCourse.upsert({
        where: { programmeId_courseId: { programmeId, courseId } },
        update: { isRequired, term, orderIndex: i },
        create: { programmeId, courseId, isRequired, term, orderIndex: i },
      });
    }
  }

  async removeCourseFromProgramme(programmeId: string, courseId: string): Promise<void> {
    await prisma.programmeCourse.deleteMany({ where: { programmeId, courseId } });
  }
}

/**
 * High-speed In-Memory Academic Repository for isolated automated unit/integration tests
 */
export class InMemoryAcademicRepository implements IAcademicRepository {
  private levels: AcademicLevelDto[] = [];
  private departments: AcademicDepartmentDto[] = [];
  private programmes: ProgrammeDto[] = [];
  private courses: CourseDto[] = [];
  private programmeCourses: Array<{ programmeId: string; courseId: string; isRequired: boolean; term?: string | null; orderIndex: number }> = [];

  // --- Levels ---
  async listLevels(tenantId: string, onlyActive = false): Promise<AcademicLevelDto[]> {
    return this.levels
      .filter((l) => l.tenantId === tenantId && (!onlyActive || l.isActive))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getLevelById(tenantId: string, id: string): Promise<AcademicLevelDto | null> {
    return this.levels.find((l) => l.tenantId === tenantId && l.id === id) || null;
  }

  async getLevelBySlug(tenantId: string, slug: string): Promise<AcademicLevelDto | null> {
    return this.levels.find((l) => l.tenantId === tenantId && l.slug === slug) || null;
  }

  async createLevel(tenantId: string, data: CreateAcademicLevelDto): Promise<AcademicLevelDto> {
    const level: AcademicLevelDto = {
      id: `lvl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      name: data.name,
      slug: data.slug,
      levelType: data.levelType,
      description: data.description,
      orderIndex: data.orderIndex ?? 0,
      minAge: data.minAge,
      maxAge: data.maxAge,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.levels.push(level);
    return level;
  }

  async updateLevel(tenantId: string, id: string, data: UpdateAcademicLevelDto): Promise<AcademicLevelDto> {
    const idx = this.levels.findIndex((l) => l.tenantId === tenantId && l.id === id);
    if (idx === -1) throw new Error('Level not found');
    const existing = this.levels[idx];
    const updated: AcademicLevelDto = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.levels[idx] = updated;
    return updated;
  }

  async deleteLevel(tenantId: string, id: string): Promise<void> {
    this.levels = this.levels.filter((l) => !(l.tenantId === tenantId && l.id === id));
  }

  // --- Departments ---
  async listDepartments(tenantId: string, onlyActive = false): Promise<AcademicDepartmentDto[]> {
    return this.departments
      .filter((d) => d.tenantId === tenantId && (!onlyActive || d.isActive))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getDepartmentById(tenantId: string, id: string): Promise<AcademicDepartmentDto | null> {
    return this.departments.find((d) => d.tenantId === tenantId && d.id === id) || null;
  }

  async getDepartmentBySlug(tenantId: string, slug: string): Promise<AcademicDepartmentDto | null> {
    return this.departments.find((d) => d.tenantId === tenantId && d.slug === slug) || null;
  }

  async createDepartment(tenantId: string, data: CreateAcademicDepartmentDto): Promise<AcademicDepartmentDto> {
    const dept: AcademicDepartmentDto = {
      id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      name: data.name,
      slug: data.slug,
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      orderIndex: data.orderIndex ?? 0,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.departments.push(dept);
    return dept;
  }

  async updateDepartment(tenantId: string, id: string, data: UpdateAcademicDepartmentDto): Promise<AcademicDepartmentDto> {
    const idx = this.departments.findIndex((d) => d.tenantId === tenantId && d.id === id);
    if (idx === -1) throw new Error('Department not found');
    const existing = this.departments[idx];
    const updated: AcademicDepartmentDto = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.departments[idx] = updated;
    return updated;
  }

  async deleteDepartment(tenantId: string, id: string): Promise<void> {
    this.departments = this.departments.filter((d) => !(d.tenantId === tenantId && d.id === id));
  }

  // --- Programmes ---
  async listProgrammes(tenantId: string, query: ProgrammeQueryDto = { page: 1, limit: 20 }): Promise<PaginatedData<ProgrammeDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    let filtered = this.programmes.filter((p) => p.tenantId === tenantId);

    if (query.status) filtered = filtered.filter((p) => p.status === query.status);
    if (query.levelId) filtered = filtered.filter((p) => p.levelId === query.levelId);
    if (query.departmentId) filtered = filtered.filter((p) => p.departmentId === query.departmentId);
    if (query.programmeType) filtered = filtered.filter((p) => p.programmeType === query.programmeType);
    if (query.isFeatured !== undefined) filtered = filtered.filter((p) => p.isFeatured === query.isFeatured);
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.summary && p.summary.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.orderIndex - b.orderIndex);

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProgrammeById(tenantId: string, id: string): Promise<ProgrammeDto | null> {
    return this.programmes.find((p) => p.tenantId === tenantId && p.id === id) || null;
  }

  async getProgrammeBySlug(tenantId: string, slug: string): Promise<ProgrammeDto | null> {
    return this.programmes.find((p) => p.tenantId === tenantId && p.slug === slug) || null;
  }

  async createProgramme(tenantId: string, authorId: string | null, data: CreateProgrammeDto): Promise<ProgrammeDto> {
    const level = data.levelId ? this.levels.find((l) => l.id === data.levelId) : null;
    const dept = data.departmentId ? this.departments.find((d) => d.id === data.departmentId) : null;

    const prog: ProgrammeDto = {
      id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      description: data.description,
      programmeType: data.programmeType || null,
      levelId: data.levelId || null,
      departmentId: data.departmentId || null,
      duration: data.duration || null,
      entryRequirements: data.entryRequirements,
      qualificationsAwarded: data.qualificationsAwarded,
      curriculum: data.curriculum,
      tuitionFee: data.tuitionFee,
      tuitionCurrency: data.tuitionCurrency || 'USD',
      tuitionPeriod: data.tuitionPeriod,
      tuitionDescription: data.tuitionDescription,
      displayTuition: data.displayTuition ?? false,
      heroMediaId: data.heroMediaId,
      status: data.status || 'DRAFT',
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      orderIndex: data.orderIndex ?? 0,
      publishedAt: data.status === 'PUBLISHED' ? new Date().toISOString() : null,
      archivedAt: data.status === 'ARCHIVED' ? new Date().toISOString() : null,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      canonicalUrl: data.canonicalUrl,
      authorId,
      level: level || null,
      department: dept || null,
      courses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.programmes.push(prog);
    return prog;
  }

  async updateProgramme(tenantId: string, id: string, editorId: string | null, data: UpdateProgrammeDto): Promise<ProgrammeDto> {
    const idx = this.programmes.findIndex((p) => p.tenantId === tenantId && p.id === id);
    if (idx === -1) throw new Error('Programme not found');
    const existing = this.programmes[idx];

    const level = data.levelId !== undefined ? (data.levelId ? this.levels.find((l) => l.id === data.levelId) || null : null) : existing.level;
    const dept = data.departmentId !== undefined ? (data.departmentId ? this.departments.find((d) => d.id === data.departmentId) || null : null) : existing.department;

    const updated: ProgrammeDto = {
      ...existing,
      ...data,
      level,
      department: dept,
      lastEditorId: editorId,
      publishedAt: data.status === 'PUBLISHED' ? new Date().toISOString() : existing.publishedAt,
      archivedAt: data.status === 'ARCHIVED' ? new Date().toISOString() : existing.archivedAt,
      updatedAt: new Date().toISOString(),
    };
    this.programmes[idx] = updated;
    return updated;
  }

  async deleteProgramme(tenantId: string, id: string): Promise<void> {
    this.programmes = this.programmes.filter((p) => !(p.tenantId === tenantId && p.id === id));
    this.programmeCourses = this.programmeCourses.filter((pc) => pc.programmeId !== id);
  }

  async listPublicProgrammes(tenantId: string, query: ProgrammeQueryDto = { page: 1, limit: 20 }): Promise<PaginatedData<PublicProgrammeDto>> {
    const adminRes = await this.listProgrammes(tenantId, { ...query, status: 'PUBLISHED' });
    const items: PublicProgrammeDto[] = adminRes.items
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        programmeType: p.programmeType,
        duration: p.duration,
        entryRequirements: p.entryRequirements,
        qualificationsAwarded: p.qualificationsAwarded,
        curriculum: p.curriculum,
        displayTuition: p.displayTuition,
        tuitionFee: p.displayTuition ? p.tuitionFee : null,
        tuitionCurrency: p.displayTuition ? p.tuitionCurrency : null,
        tuitionPeriod: p.displayTuition ? p.tuitionPeriod : null,
        tuitionDescription: p.displayTuition ? p.tuitionDescription : null,
        isFeatured: p.isFeatured,
        level: p.level ? { id: p.level.id, name: p.level.name, slug: p.level.slug, levelType: p.level.levelType } : null,
        department: p.department ? { id: p.department.id, name: p.department.name, slug: p.department.slug, code: p.department.code } : null,
        heroMedia: p.heroMedia,
        courses: (p.courses || []).map((c) => ({
          courseId: c.courseId,
          isRequired: c.isRequired,
          term: c.term,
          title: c.course.title,
          code: c.course.code,
          credits: c.course.credits,
          summary: c.course.summary,
        })),
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        canonicalUrl: p.canonicalUrl,
      }));

    return {
      items,
      total: items.length,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: Math.ceil(items.length / (query.limit || 20)) || 1,
    };
  }

  async getPublicProgrammeBySlug(tenantId: string, slug: string): Promise<PublicProgrammeDto | null> {
    const p = await this.getProgrammeBySlug(tenantId, slug);
    if (!p || p.status !== 'PUBLISHED' || !p.isActive) return null;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      description: p.description,
      programmeType: p.programmeType,
      duration: p.duration,
      entryRequirements: p.entryRequirements,
      qualificationsAwarded: p.qualificationsAwarded,
      curriculum: p.curriculum,
      displayTuition: p.displayTuition,
      tuitionFee: p.displayTuition ? p.tuitionFee : null,
      tuitionCurrency: p.displayTuition ? p.tuitionCurrency : null,
      tuitionPeriod: p.displayTuition ? p.tuitionPeriod : null,
      tuitionDescription: p.displayTuition ? p.tuitionDescription : null,
      isFeatured: p.isFeatured,
      level: p.level ? { id: p.level.id, name: p.level.name, slug: p.level.slug, levelType: p.level.levelType } : null,
      department: p.department ? { id: p.department.id, name: p.department.name, slug: p.department.slug, code: p.department.code } : null,
      heroMedia: p.heroMedia,
      courses: (p.courses || []).map((c) => ({
        courseId: c.courseId,
        isRequired: c.isRequired,
        term: c.term,
        title: c.course.title,
        code: c.course.code,
        credits: c.course.credits,
        summary: c.course.summary,
      })),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      canonicalUrl: p.canonicalUrl,
    };
  }

  // --- Courses ---
  async listCourses(tenantId: string, levelId?: string, departmentId?: string): Promise<CourseDto[]> {
    let list = this.courses.filter((c) => c.tenantId === tenantId);
    if (levelId) list = list.filter((c) => c.levelId === levelId);
    if (departmentId) list = list.filter((c) => c.departmentId === departmentId);
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getCourseById(tenantId: string, id: string): Promise<CourseDto | null> {
    return this.courses.find((c) => c.tenantId === tenantId && c.id === id) || null;
  }

  async getCourseBySlug(tenantId: string, slug: string): Promise<CourseDto | null> {
    return this.courses.find((c) => c.tenantId === tenantId && c.slug === slug) || null;
  }

  async createCourse(tenantId: string, data: CreateCourseDto): Promise<CourseDto> {
    const level = data.levelId ? this.levels.find((l) => l.id === data.levelId) : null;
    const dept = data.departmentId ? this.departments.find((d) => d.id === data.departmentId) : null;

    const course: CourseDto = {
      id: `crs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      code: data.code,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      description: data.description,
      credits: data.credits,
      hours: data.hours,
      levelId: data.levelId,
      departmentId: data.departmentId,
      syllabus: data.syllabus,
      status: data.status || 'DRAFT',
      orderIndex: data.orderIndex ?? 0,
      level: level ? { id: level.id, name: level.name, slug: level.slug } : null,
      department: dept ? { id: dept.id, name: dept.name, slug: dept.slug } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.courses.push(course);
    return course;
  }

  async updateCourse(tenantId: string, id: string, data: UpdateCourseDto): Promise<CourseDto> {
    const idx = this.courses.findIndex((c) => c.tenantId === tenantId && c.id === id);
    if (idx === -1) throw new Error('Course not found');
    const existing = this.courses[idx];
    const level = data.levelId !== undefined ? (data.levelId ? this.levels.find((l) => l.id === data.levelId) || null : null) : existing.level;
    const dept = data.departmentId !== undefined ? (data.departmentId ? this.departments.find((d) => d.id === data.departmentId) || null : null) : existing.department;

    const updated: CourseDto = {
      ...existing,
      ...data,
      level,
      department: dept,
      updatedAt: new Date().toISOString(),
    };
    this.courses[idx] = updated;
    return updated;
  }

  async deleteCourse(tenantId: string, id: string): Promise<void> {
    this.courses = this.courses.filter((c) => !(c.tenantId === tenantId && c.id === id));
    this.programmeCourses = this.programmeCourses.filter((pc) => pc.courseId !== id);
  }

  async assignCoursesToProgramme(
    programmeId: string,
    courseIds: string[],
    isRequired = true,
    term?: string | null
  ): Promise<void> {
    for (let i = 0; i < courseIds.length; i++) {
      const courseId = courseIds[i];
      const existingIdx = this.programmeCourses.findIndex((pc) => pc.programmeId === programmeId && pc.courseId === courseId);
      if (existingIdx >= 0) {
        this.programmeCourses[existingIdx] = { programmeId, courseId, isRequired, term, orderIndex: i };
      } else {
        this.programmeCourses.push({ programmeId, courseId, isRequired, term, orderIndex: i });
      }

      // Update programme object courses
      const p = this.programmes.find((pr) => pr.id === programmeId);
      const c = this.courses.find((cr) => cr.id === courseId);
      if (p && c) {
        p.courses = p.courses || [];
        const existingPC = p.courses.find((item) => item.courseId === courseId);
        if (existingPC) {
          existingPC.isRequired = isRequired;
          existingPC.term = term;
          existingPC.orderIndex = i;
        } else {
          p.courses.push({
            programmeId,
            courseId,
            isRequired,
            term,
            orderIndex: i,
            course: c,
          });
        }
      }
    }
  }

  async removeCourseFromProgramme(programmeId: string, courseId: string): Promise<void> {
    this.programmeCourses = this.programmeCourses.filter((pc) => !(pc.programmeId === programmeId && pc.courseId === courseId));
    const p = this.programmes.find((pr) => pr.id === programmeId);
    if (p && p.courses) {
      p.courses = p.courses.filter((c) => c.courseId !== courseId);
    }
  }
}
