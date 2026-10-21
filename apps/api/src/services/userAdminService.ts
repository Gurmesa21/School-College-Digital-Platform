import {
  AuthUser,
  CreateInvitationDto,
  AcceptInvitationDto,
  UpdateMembershipRolesDto,
  UpdateMembershipStatusDto,
  PaginationQueryDto,
  PaginatedData,
  TenantMemberDto,
  TenantInvitationDto,
  InvitationStatus,
  normalizeEmail,
  IEmailService,
} from '@school/shared';
import { IAuthRepository } from '../repositories/authRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { TokenService } from './tokenService.js';
import { PasswordService } from './passwordService.js';

export interface CreateInvitationResult {
  invitation: TenantInvitationDto;
  rawToken: string;
}

export class UserAdminService {
  private authRepo: IAuthRepository;
  private auditRepo: IAuditRepository;
  private emailService: IEmailService;
  private invitationTtlMs: number;

  constructor(
    authRepo: IAuthRepository,
    auditRepo: IAuditRepository,
    emailService: IEmailService,
    invitationTtlDays = 7
  ) {
    this.authRepo = authRepo;
    this.auditRepo = auditRepo;
    this.emailService = emailService;
    this.invitationTtlMs = invitationTtlDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Lists users and memberships for the current tenant with pagination and safe filtering
   */
  async listTenantMembers(
    tenantId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedData<TenantMemberDto>> {
    return this.authRepo.findMembershipsByTenant(tenantId, query);
  }

  /**
   * Retrieves single member by membership ID, strictly scoped to current tenant
   */
  async getTenantMember(tenantId: string, membershipId: string): Promise<TenantMemberDto | null> {
    const member = await this.authRepo.findMembershipById(membershipId);
    if (!member) return null;

    // Strict tenant isolation guard
    const authMembership = await this.authRepo.findMembership(member.userId, tenantId);
    if (!authMembership || authMembership.id !== membershipId) {
      return null;
    }

    return member;
  }

  /**
   * Creates an invitation for a new or existing user identity
   */
  async createInvitation(
    tenantId: string,
    inviter: AuthUser,
    dto: CreateInvitationDto,
    meta: { tenantName: string; requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<CreateInvitationResult> {
    const email = normalizeEmail(dto.email);

    // 1. Role validation: Tenant admins cannot assign platform-only or disallowed roles
    for (const roleId of dto.roleIds) {
      const role = await this.authRepo.findRoleById(roleId);
      if (!role) {
        const error: any = new Error(`Role with ID '${roleId}' does not exist.`);
        error.code = 'INVALID_ROLE';
        error.statusCode = 400;
        throw error;
      }
      if (role.name === 'SUPER_ADMIN' || (role.tenantId && role.tenantId !== tenantId)) {
        const error: any = new Error('Cannot assign platform administrator or foreign tenant roles.');
        error.code = 'DISALLOWED_ROLE_ASSIGNMENT';
        error.statusCode = 403;
        throw error;
      }
    }

    // 2. Prevent duplicate active memberships
    const existingUser = await this.authRepo.findUserByEmail(email);
    if (existingUser) {
      const existingMembership = await this.authRepo.findMembership(existingUser.id, tenantId);
      if (existingMembership && existingMembership.status === 'ACTIVE') {
        const error: any = new Error('User already holds an active membership in this institution.');
        error.code = 'ALREADY_A_MEMBER';
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Prevent duplicate active pending invitations
    const pendingInvitation = await this.authRepo.findPendingInvitationByEmail(tenantId, email);
    if (pendingInvitation) {
      const error: any = new Error('An active invitation is already pending for this email address.');
      error.code = 'INVITATION_ALREADY_PENDING';
      error.statusCode = 409;
      throw error;
    }

    // 4. Generate high-entropy token and hash
    const rawToken = TokenService.generateRandomToken(32);
    const tokenHash = TokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.invitationTtlMs);

    const record = await this.authRepo.createInvitation({
      tenantId,
      email,
      inviterUserId: inviter.id,
      roleIds: dto.roleIds,
      tokenHash,
      expiresAt,
    });

    // 5. Dispatch invitation email via adapter
    await this.emailService.sendInvitationEmail(
      email,
      rawToken,
      meta.tenantName,
      inviter.firstName ? `${inviter.firstName} ${inviter.lastName || ''}`.trim() : inviter.email
    );

    // 6. Record audit event
    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: inviter.id,
      actorEmail: inviter.email,
      actorType: inviter.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      action: 'INVITATION_CREATED',
      entityType: 'INVITATION',
      entityId: record.id,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        inviteeEmail: email,
        assignedRoleIds: dto.roleIds,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      invitation: {
        id: record.id,
        email: record.email,
        status: record.status as InvitationStatus,
        roleIds: record.roleIds,
        expiresAt: record.expiresAt.toISOString(),
        sentAt: record.sentAt.toISOString(),
        acceptedAt: null,
        revokedAt: null,
        inviterEmail: inviter.email,
      },
      rawToken,
    };
  }

  /**
   * Lists invitations for the specified tenant
   */
  async listInvitations(
    tenantId: string,
    params: { page: number; limit: number; status?: InvitationStatus }
  ): Promise<PaginatedData<TenantInvitationDto>> {
    return this.authRepo.findInvitationsByTenant(tenantId, params);
  }

  /**
   * Resends a pending invitation
   */
  async resendInvitation(
    tenantId: string,
    invitationId: string,
    inviter: AuthUser,
    meta: { tenantName: string; requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const inv = await this.authRepo.findInvitationById(invitationId);
    if (!inv || inv.tenantId !== tenantId) {
      const error: any = new Error('Invitation not found.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (inv.status !== 'PENDING' || inv.expiresAt <= new Date()) {
      const error: any = new Error('Cannot resend an invitation that is not pending or has expired.');
      error.code = 'INVITATION_NOT_PENDING';
      error.statusCode = 400;
      throw error;
    }

    // Generate fresh token
    const newRawToken = TokenService.generateRandomToken(32);
    const newTokenHash = TokenService.hashToken(newRawToken);

    // Update in repository (revoke old, issue new or update hash)
    await this.authRepo.markInvitationRevoked(inv.id);
    const newExpiresAt = new Date(Date.now() + this.invitationTtlMs);

    const reissued = await this.authRepo.createInvitation({
      tenantId,
      email: inv.email,
      inviterUserId: inviter.id,
      roleIds: inv.roleIds,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    await this.emailService.sendInvitationEmail(
      inv.email,
      newRawToken,
      meta.tenantName,
      inviter.firstName || inviter.email
    );

    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: inviter.id,
      actorEmail: inviter.email,
      actorType: inviter.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      action: 'INVITATION_RESENT',
      entityType: 'INVITATION',
      entityId: reissued.id,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { previousInvitationId: inv.id, email: inv.email },
    });
  }

  /**
   * Revokes a pending invitation
   */
  async revokeInvitation(
    tenantId: string,
    invitationId: string,
    actor: AuthUser,
    meta: { requestId?: string; ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    const inv = await this.authRepo.findInvitationById(invitationId);
    if (!inv || inv.tenantId !== tenantId) {
      const error: any = new Error('Invitation not found.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (inv.status !== 'PENDING') {
      const error: any = new Error('Only pending invitations can be revoked.');
      error.code = 'INVITATION_NOT_PENDING';
      error.statusCode = 400;
      throw error;
    }

    await this.authRepo.markInvitationRevoked(inv.id);

    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: actor.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      action: 'INVITATION_REVOKED',
      entityType: 'INVITATION',
      entityId: inv.id,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { inviteeEmail: inv.email },
    });
  }

  /**
   * Accepts an invitation via valid, expiring, single-use token
   */
  async acceptInvitation(
    dto: AcceptInvitationDto,
    meta: { requestId?: string; ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ message: string; email: string }> {
    const tokenHash = TokenService.hashToken(dto.token);
    const invitation = await this.authRepo.findInvitationByTokenHash(tokenHash);

    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt <= new Date()
    ) {
      const error: any = new Error('Invitation token is invalid, expired, or has already been consumed.');
      error.code = 'INVALID_INVITATION_TOKEN';
      error.statusCode = 400;
      throw error;
    }

    const email = normalizeEmail(invitation.email);
    let user = await this.authRepo.findUserByEmail(email);

    if (!user) {
      if (!dto.password || dto.password.length < 8) {
        const error: any = new Error('A password of at least 8 characters is required to establish your account.');
        error.code = 'PASSWORD_REQUIRED';
        error.statusCode = 400;
        throw error;
      }

      const passwordHash = await PasswordService.hashPassword(dto.password);
      user = await this.authRepo.createUser({
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'ACTIVE',
      });
      await this.authRepo.updateUser(user.id, {
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      });
    } else {
      if (user.status === 'PENDING_VERIFICATION') {
        await this.authRepo.updateUser(user.id, {
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
        });
      }
    }

    // Check or establish membership
    const existingMembership = await this.authRepo.findMembership(user.id, invitation.tenantId);
    let membershipId: string;

    if (existingMembership) {
      if (existingMembership.status === 'ACTIVE') {
        // Mark invitation accepted to avoid reuse
        await this.authRepo.markInvitationAccepted(invitation.id);
        const error: any = new Error('User already holds an active membership in this institution.');
        error.code = 'ALREADY_A_MEMBER';
        error.statusCode = 409;
        throw error;
      }
      // Reactivate membership
      await this.authRepo.updateMembershipStatus(existingMembership.id, 'ACTIVE');
      membershipId = existingMembership.id;
    } else {
      const created = await this.authRepo.createMembership({
        userId: user.id,
        tenantId: invitation.tenantId,
        status: 'ACTIVE',
      });
      membershipId = created.id;
    }

    // Assign intended roles
    for (const roleId of invitation.roleIds) {
      await this.authRepo.assignRoleToMembership(membershipId, roleId);
    }

    // Mark invitation accepted (single use)
    await this.authRepo.markInvitationAccepted(invitation.id);

    // Audit log
    await this.auditRepo.createAuditLog({
      tenantId: invitation.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'USER',
      action: 'INVITATION_ACCEPTED',
      entityType: 'MEMBERSHIP',
      entityId: membershipId,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { invitationId: invitation.id, assignedRoleIds: invitation.roleIds },
    });

    return {
      message: 'Invitation successfully accepted. You may now sign in to access institutional administration.',
      email,
    };
  }

  /**
   * Assigns or updates tenant-scoped roles for an existing membership
   */
  async updateMembershipRoles(
    tenantId: string,
    membershipId: string,
    dto: UpdateMembershipRolesDto,
    actor: AuthUser,
    meta: { requestId?: string; ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    const member = await this.getTenantMember(tenantId, membershipId);
    if (!member) {
      const error: any = new Error('Membership not found in this institution.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Validate that all specified roles belong to this tenant or are non-platform system roles
    for (const roleId of dto.roleIds) {
      const role = await this.authRepo.findRoleById(roleId);
      if (!role) {
        const error: any = new Error(`Role '${roleId}' does not exist.`);
        error.code = 'INVALID_ROLE';
        error.statusCode = 400;
        throw error;
      }
      if (role.name === 'SUPER_ADMIN' || (role.tenantId && role.tenantId !== tenantId)) {
        const error: any = new Error('Cannot assign platform administrator or foreign tenant roles.');
        error.code = 'DISALLOWED_ROLE_ASSIGNMENT';
        error.statusCode = 403;
        throw error;
      }
    }

    await this.authRepo.updateMembershipRoles(membershipId, dto.roleIds);

    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: actor.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      action: 'ROLES_ASSIGNED',
      entityType: 'MEMBERSHIP',
      entityId: membershipId,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { targetUserId: member.userId, newRoleIds: dto.roleIds },
    });
  }

  /**
   * Deactivates or reactivates a tenant membership
   */
  async updateMembershipStatus(
    tenantId: string,
    membershipId: string,
    dto: UpdateMembershipStatusDto,
    actor: AuthUser,
    meta: { requestId?: string; ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    const member = await this.getTenantMember(tenantId, membershipId);
    if (!member) {
      const error: any = new Error('Membership not found in this institution.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Safety guard: Cannot deactivate own membership
    if (member.userId === actor.id && dto.status !== 'ACTIVE') {
      const error: any = new Error('Administrators cannot deactivate their own tenant membership.');
      error.code = 'SELF_DEACTIVATION_DENIED';
      error.statusCode = 400;
      throw error;
    }

    await this.authRepo.updateMembershipStatus(membershipId, dto.status);

    const isDeactivation = dto.status !== 'ACTIVE';
    const action = isDeactivation ? 'MEMBERSHIP_DEACTIVATED' : 'MEMBERSHIP_REACTIVATED';

    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: actor.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      action,
      entityType: 'MEMBERSHIP',
      entityId: membershipId,
      outcome: 'SUCCESS',
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { targetUserId: member.userId, newStatus: dto.status, reason: dto.reason || null },
    });
  }
}
