import {
  StaffProfileDto,
  PublicStaffProfileDto,
  CreateStaffProfileDto,
  UpdateStaffProfileDto,
  StaffProfileQueryDto,
  PaginatedData,
} from '@school/shared';
import { IStaffRepository } from '../repositories/staffRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { IAcademicRepository } from '../repositories/academicRepository.js';
import { IMediaRepository } from '../repositories/mediaRepository.js';

export interface StaffAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class StaffService {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly auditRepository: IAuditRepository,
    private readonly academicRepository?: IAcademicRepository,
    private readonly mediaRepository?: IMediaRepository
  ) {}

  // --------------------------------------------------------------------------
  // Administrative Operations
  // --------------------------------------------------------------------------

  async listStaff(tenantId: string, query?: StaffProfileQueryDto): Promise<PaginatedData<StaffProfileDto>> {
    return this.staffRepository.listStaff(tenantId, query);
  }

  async getStaffById(tenantId: string, id: string): Promise<StaffProfileDto | null> {
    return this.staffRepository.getStaffById(tenantId, id);
  }

  async getStaffBySlug(tenantId: string, slug: string): Promise<StaffProfileDto | null> {
    return this.staffRepository.getStaffBySlug(tenantId, slug);
  }

  async createStaff(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateStaffProfileDto,
    context?: StaffAuditContext
  ): Promise<StaffProfileDto> {
    // 1. Slug uniqueness in tenant boundary
    const existing = await this.staffRepository.getStaffBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`SLUG_ALREADY_EXISTS: Staff profile with slug '${data.slug}' already exists in this institution.`);
    }

    // 2. Department tenant ownership validation
    if (data.departmentId && this.academicRepository) {
      const dept = await this.academicRepository.getDepartmentById(tenantId, data.departmentId);
      if (!dept) {
        throw new Error(`INVALID_DEPARTMENT: Academic department '${data.departmentId}' does not belong to this institution.`);
      }
    }

    // 3. Media asset tenant ownership validation
    if (data.profileMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.profileMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Media asset '${data.profileMediaId}' does not belong to this institution.`);
      }
    }

    // 4. Persistence
    const created = await this.staffRepository.createStaff(tenantId, actor.id, data);

    // 5. Immutable Audit logging
    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'staff:profile:create',
      entityType: 'STAFF_PROFILE',
      entityId: created.id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { fullName: created.fullName, slug: created.slug, status: created.status, roleTitle: created.roleTitle },
    });

    return created;
  }

  async updateStaff(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    data: UpdateStaffProfileDto,
    context?: StaffAuditContext
  ): Promise<StaffProfileDto> {
    const existing = await this.staffRepository.getStaffById(tenantId, id);
    if (!existing) {
      throw new Error(`STAFF_NOT_FOUND: Staff profile '${id}' not found in this institution.`);
    }

    // Check slug conflict if slug is modified
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.staffRepository.getStaffBySlug(tenantId, data.slug);
      if (conflict && conflict.id !== id) {
        throw new Error(`SLUG_ALREADY_EXISTS: Staff profile with slug '${data.slug}' already exists in this institution.`);
      }
    }

    // Validate department reference
    if (data.departmentId && this.academicRepository) {
      const dept = await this.academicRepository.getDepartmentById(tenantId, data.departmentId);
      if (!dept) {
        throw new Error(`INVALID_DEPARTMENT: Academic department '${data.departmentId}' does not belong to this institution.`);
      }
    }

    // Validate media reference
    if (data.profileMediaId && this.mediaRepository) {
      const media = await this.mediaRepository.getMediaById(tenantId, data.profileMediaId);
      if (!media) {
        throw new Error(`INVALID_MEDIA: Media asset '${data.profileMediaId}' does not belong to this institution.`);
      }
    }

    const updated = await this.staffRepository.updateStaff(tenantId, id, actor.id, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'staff:profile:update',
      entityType: 'STAFF_PROFILE',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { fullName: updated.fullName, slug: updated.slug, status: updated.status },
    });

    return updated;
  }

  async setStaffStatus(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    context?: StaffAuditContext
  ): Promise<StaffProfileDto> {
    const existing = await this.staffRepository.getStaffById(tenantId, id);
    if (!existing) {
      throw new Error(`STAFF_NOT_FOUND: Staff profile '${id}' not found in this institution.`);
    }

    const updated = await this.staffRepository.updateStaff(tenantId, id, actor.id, { status });

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'staff:profile:status',
      entityType: 'STAFF_PROFILE',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { previousStatus: existing.status, newStatus: status, slug: existing.slug },
    });

    return updated;
  }

  async deleteStaff(
    tenantId: string,
    id: string,
    actor: { id: string; email: string },
    context?: StaffAuditContext
  ): Promise<void> {
    const existing = await this.staffRepository.getStaffById(tenantId, id);
    if (!existing) {
      throw new Error(`STAFF_NOT_FOUND: Staff profile '${id}' not found in this institution.`);
    }

    await this.staffRepository.deleteStaff(tenantId, id);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'staff:profile:delete',
      entityType: 'STAFF_PROFILE',
      entityId: id,
      outcome: 'SUCCESS',
      requestId: context?.requestId || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: { fullName: existing.fullName, slug: existing.slug },
    });
  }

  // --------------------------------------------------------------------------
  // Public Retrieval (with Strict Privacy Redaction & Fail-closed Draft Isolation)
  // --------------------------------------------------------------------------

  async listPublicStaff(
    tenantId: string,
    query?: StaffProfileQueryDto
  ): Promise<PaginatedData<PublicStaffProfileDto>> {
    return this.staffRepository.listPublicStaff(tenantId, query);
  }

  async getPublicStaffBySlug(tenantId: string, slug: string): Promise<PublicStaffProfileDto | null> {
    return this.staffRepository.getPublicStaffBySlug(tenantId, slug);
  }
}
