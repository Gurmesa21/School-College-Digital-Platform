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
import { IAcademicRepository } from '../repositories/academicRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export interface AcademicAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class AcademicService {
  constructor(
    private readonly academicRepository: IAcademicRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  // --------------------------------------------------------------------------
  // Academic Levels
  // --------------------------------------------------------------------------
  async listLevels(tenantId: string, onlyActive = false): Promise<AcademicLevelDto[]> {
    return this.academicRepository.listLevels(tenantId, onlyActive);
  }

  async getLevelById(tenantId: string, id: string): Promise<AcademicLevelDto | null> {
    return this.academicRepository.getLevelById(tenantId, id);
  }

  async createLevel(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateAcademicLevelDto,
    context?: AcademicAuditContext
  ): Promise<AcademicLevelDto> {
    const existing = await this.academicRepository.getLevelBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: Academic level with slug '${data.slug}' already exists in this institution.`);
    }

    const created = await this.academicRepository.createLevel(tenantId, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:level:create',
      entityType: 'ACADEMIC_LEVEL',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: created.name, slug: created.slug, levelType: created.levelType },
    });

    return created;
  }

  async updateLevel(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateAcademicLevelDto,
    context?: AcademicAuditContext
  ): Promise<AcademicLevelDto> {
    const existing = await this.academicRepository.getLevelById(tenantId, id);
    if (!existing) {
      throw new Error(`LEVEL_NOT_FOUND: Academic level '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.academicRepository.getLevelBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: Academic level with slug '${data.slug}' already exists.`);
      }
    }

    const updated = await this.academicRepository.updateLevel(tenantId, id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:level:update',
      entityType: 'ACADEMIC_LEVEL',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: updated.name, slug: updated.slug },
    });

    return updated;
  }

  async deleteLevel(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AcademicAuditContext
  ): Promise<void> {
    const existing = await this.academicRepository.getLevelById(tenantId, id);
    if (!existing) {
      throw new Error(`LEVEL_NOT_FOUND: Academic level '${id}' not found in this institution.`);
    }

    await this.academicRepository.deleteLevel(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:level:delete',
      entityType: 'ACADEMIC_LEVEL',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: existing.name, slug: existing.slug },
    });
  }

  // --------------------------------------------------------------------------
  // Academic Departments / Faculties
  // --------------------------------------------------------------------------
  async listDepartments(tenantId: string, onlyActive = false): Promise<AcademicDepartmentDto[]> {
    return this.academicRepository.listDepartments(tenantId, onlyActive);
  }

  async getDepartmentById(tenantId: string, id: string): Promise<AcademicDepartmentDto | null> {
    return this.academicRepository.getDepartmentById(tenantId, id);
  }

  async createDepartment(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateAcademicDepartmentDto,
    context?: AcademicAuditContext
  ): Promise<AcademicDepartmentDto> {
    const existing = await this.academicRepository.getDepartmentBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: Academic department with slug '${data.slug}' already exists.`);
    }

    if (data.parentId) {
      const parent = await this.academicRepository.getDepartmentById(tenantId, data.parentId);
      if (!parent) {
        throw new Error(`PARENT_DEPARTMENT_NOT_FOUND: Parent department '${data.parentId}' does not exist.`);
      }
    }

    const created = await this.academicRepository.createDepartment(tenantId, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:department:create',
      entityType: 'ACADEMIC_DEPARTMENT',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: created.name, slug: created.slug, code: created.code },
    });

    return created;
  }

  async updateDepartment(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateAcademicDepartmentDto,
    context?: AcademicAuditContext
  ): Promise<AcademicDepartmentDto> {
    const existing = await this.academicRepository.getDepartmentById(tenantId, id);
    if (!existing) {
      throw new Error(`DEPARTMENT_NOT_FOUND: Academic department '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.academicRepository.getDepartmentBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: Academic department with slug '${data.slug}' already exists.`);
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new Error(`INVALID_RELATION: Department cannot be its own parent.`);
      }
      const parent = await this.academicRepository.getDepartmentById(tenantId, data.parentId);
      if (!parent) {
        throw new Error(`PARENT_DEPARTMENT_NOT_FOUND: Parent department '${data.parentId}' does not exist.`);
      }
    }

    const updated = await this.academicRepository.updateDepartment(tenantId, id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:department:update',
      entityType: 'ACADEMIC_DEPARTMENT',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: updated.name, slug: updated.slug },
    });

    return updated;
  }

  async deleteDepartment(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AcademicAuditContext
  ): Promise<void> {
    const existing = await this.academicRepository.getDepartmentById(tenantId, id);
    if (!existing) {
      throw new Error(`DEPARTMENT_NOT_FOUND: Academic department '${id}' not found in this institution.`);
    }

    await this.academicRepository.deleteDepartment(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:department:delete',
      entityType: 'ACADEMIC_DEPARTMENT',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { name: existing.name, slug: existing.slug },
    });
  }

  // --------------------------------------------------------------------------
  // Programmes
  // --------------------------------------------------------------------------
  async listProgrammes(tenantId: string, query?: ProgrammeQueryDto): Promise<PaginatedData<ProgrammeDto>> {
    return this.academicRepository.listProgrammes(tenantId, query);
  }

  async getProgrammeById(tenantId: string, id: string): Promise<ProgrammeDto | null> {
    return this.academicRepository.getProgrammeById(tenantId, id);
  }

  async getProgrammeBySlug(tenantId: string, slug: string): Promise<ProgrammeDto | null> {
    return this.academicRepository.getProgrammeBySlug(tenantId, slug);
  }

  async createProgramme(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateProgrammeDto,
    context?: AcademicAuditContext
  ): Promise<ProgrammeDto> {
    const existing = await this.academicRepository.getProgrammeBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: Academic programme with slug '${data.slug}' already exists in this institution.`);
    }

    // Verify foreign keys belong to the same tenant
    if (data.levelId) {
      const level = await this.academicRepository.getLevelById(tenantId, data.levelId);
      if (!level) throw new Error(`INVALID_LEVEL: Academic level '${data.levelId}' does not belong to this institution.`);
    }
    if (data.departmentId) {
      const dept = await this.academicRepository.getDepartmentById(tenantId, data.departmentId);
      if (!dept) throw new Error(`INVALID_DEPARTMENT: Academic department '${data.departmentId}' does not belong to this institution.`);
    }

    const created = await this.academicRepository.createProgramme(tenantId, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:programme:create',
      entityType: 'PROGRAMME',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: created.title, slug: created.slug, status: created.status },
    });

    return created;
  }

  async updateProgramme(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateProgrammeDto,
    context?: AcademicAuditContext
  ): Promise<ProgrammeDto> {
    const existing = await this.academicRepository.getProgrammeById(tenantId, id);
    if (!existing) {
      throw new Error(`PROGRAMME_NOT_FOUND: Academic programme '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.academicRepository.getProgrammeBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: Academic programme with slug '${data.slug}' already exists.`);
      }
    }

    if (data.levelId) {
      const level = await this.academicRepository.getLevelById(tenantId, data.levelId);
      if (!level) throw new Error(`INVALID_LEVEL: Academic level '${data.levelId}' does not belong to this institution.`);
    }
    if (data.departmentId) {
      const dept = await this.academicRepository.getDepartmentById(tenantId, data.departmentId);
      if (!dept) throw new Error(`INVALID_DEPARTMENT: Academic department '${data.departmentId}' does not belong to this institution.`);
    }

    const updated = await this.academicRepository.updateProgramme(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:programme:update',
      entityType: 'PROGRAMME',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async setProgrammeStatus(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    context?: AcademicAuditContext
  ): Promise<ProgrammeDto> {
    const existing = await this.academicRepository.getProgrammeById(tenantId, id);
    if (!existing) {
      throw new Error(`PROGRAMME_NOT_FOUND: Academic programme '${id}' not found.`);
    }

    const updated = await this.academicRepository.updateProgramme(tenantId, id, actor.id, { status });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: `academics:programme:${status.toLowerCase()}`,
      entityType: 'PROGRAMME',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug, fromStatus: existing.status, toStatus: status },
    });

    return updated;
  }

  async deleteProgramme(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AcademicAuditContext
  ): Promise<void> {
    const existing = await this.academicRepository.getProgrammeById(tenantId, id);
    if (!existing) {
      throw new Error(`PROGRAMME_NOT_FOUND: Academic programme '${id}' not found in this institution.`);
    }

    await this.academicRepository.deleteProgramme(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:programme:delete',
      entityType: 'PROGRAMME',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: existing.title, slug: existing.slug },
    });
  }

  // --------------------------------------------------------------------------
  // Public Retrieval (FR-ACAD-001, FR-ACAD-002, FR-CMS-003, FR-CMS-006)
  // --------------------------------------------------------------------------
  async listPublicProgrammes(tenantId: string, query?: ProgrammeQueryDto): Promise<PaginatedData<PublicProgrammeDto>> {
    return this.academicRepository.listPublicProgrammes(tenantId, query);
  }

  async getPublicProgrammeBySlug(tenantId: string, slug: string): Promise<PublicProgrammeDto | null> {
    return this.academicRepository.getPublicProgrammeBySlug(tenantId, slug);
  }

  // --------------------------------------------------------------------------
  // Courses / Subjects
  // --------------------------------------------------------------------------
  async listCourses(tenantId: string, levelId?: string, departmentId?: string): Promise<CourseDto[]> {
    return this.academicRepository.listCourses(tenantId, levelId, departmentId);
  }

  async getCourseById(tenantId: string, id: string): Promise<CourseDto | null> {
    return this.academicRepository.getCourseById(tenantId, id);
  }

  async createCourse(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateCourseDto,
    context?: AcademicAuditContext
  ): Promise<CourseDto> {
    const existing = await this.academicRepository.getCourseBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: Course with slug '${data.slug}' already exists in this institution.`);
    }

    if (data.levelId) {
      const level = await this.academicRepository.getLevelById(tenantId, data.levelId);
      if (!level) throw new Error(`INVALID_LEVEL: Academic level '${data.levelId}' does not belong to this institution.`);
    }
    if (data.departmentId) {
      const dept = await this.academicRepository.getDepartmentById(tenantId, data.departmentId);
      if (!dept) throw new Error(`INVALID_DEPARTMENT: Academic department '${data.departmentId}' does not belong to this institution.`);
    }

    const created = await this.academicRepository.createCourse(tenantId, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:course:create',
      entityType: 'COURSE',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: created.title, slug: created.slug, code: created.code },
    });

    return created;
  }

  async updateCourse(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateCourseDto,
    context?: AcademicAuditContext
  ): Promise<CourseDto> {
    const existing = await this.academicRepository.getCourseById(tenantId, id);
    if (!existing) {
      throw new Error(`COURSE_NOT_FOUND: Course '${id}' not found in this institution.`);
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.academicRepository.getCourseBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: Course with slug '${data.slug}' already exists.`);
      }
    }

    const updated = await this.academicRepository.updateCourse(tenantId, id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:course:update',
      entityType: 'COURSE',
      entityId: updated.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: updated.title, slug: updated.slug },
    });

    return updated;
  }

  async deleteCourse(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: AcademicAuditContext
  ): Promise<void> {
    const existing = await this.academicRepository.getCourseById(tenantId, id);
    if (!existing) {
      throw new Error(`COURSE_NOT_FOUND: Course '${id}' not found in this institution.`);
    }

    await this.academicRepository.deleteCourse(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:course:delete',
      entityType: 'COURSE',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { title: existing.title, slug: existing.slug },
    });
  }

  async assignCoursesToProgramme(
    tenantId: string,
    programmeId: string,
    courseIds: string[],
    actor: { id: string; email: string },
    isRequired = true,
    term?: string | null,
    context?: AcademicAuditContext
  ): Promise<void> {
    const programme = await this.academicRepository.getProgrammeById(tenantId, programmeId);
    if (!programme) {
      throw new Error(`PROGRAMME_NOT_FOUND: Academic programme '${programmeId}' not found.`);
    }

    // Verify each course belongs to the tenant
    for (const cId of courseIds) {
      const c = await this.academicRepository.getCourseById(tenantId, cId);
      if (!c) {
        throw new Error(`COURSE_NOT_FOUND: Course '${cId}' does not belong to this institution.`);
      }
    }

    await this.academicRepository.assignCoursesToProgramme(programmeId, courseIds, isRequired, term);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:programme:courses_assign',
      entityType: 'PROGRAMME',
      entityId: programmeId,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { programmeTitle: programme.title, courseCount: courseIds.length },
    });
  }

  async removeCourseFromProgramme(
    tenantId: string,
    programmeId: string,
    courseId: string,
    actor: { id: string; email: string },
    context?: AcademicAuditContext
  ): Promise<void> {
    const programme = await this.academicRepository.getProgrammeById(tenantId, programmeId);
    if (!programme) {
      throw new Error(`PROGRAMME_NOT_FOUND: Academic programme '${programmeId}' not found.`);
    }

    await this.academicRepository.removeCourseFromProgramme(programmeId, courseId);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'academics:programme:course_remove',
      entityType: 'PROGRAMME',
      entityId: programmeId,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { programmeTitle: programme.title, removedCourseId: courseId },
    });
  }
}
