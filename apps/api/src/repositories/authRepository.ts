import {
  User,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  TenantInvitation,
  Tenant,
  Role,
  UserStatus,
  MembershipStatus,
  InvitationStatus,
  prisma,
} from '@school/db';
import {
  AuthMembership,
  PermissionCode,
  normalizeEmail,
  TenantMemberDto,
  TenantInvitationDto,
  PaginatedData,
} from '@school/shared';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  isSuperAdmin?: boolean;
}

export interface CreateSessionData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateEmailVerificationTokenData {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateInvitationData {
  tenantId: string;
  email: string;
  inviterUserId: string;
  roleIds: string[];
  tokenHash: string;
  expiresAt: Date;
}

export interface IAuthRepository {
  // Users
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, data: Partial<{ firstName: string | null; lastName: string | null; status: UserStatus; emailVerifiedAt: Date | null }>): Promise<User>;
  updateUserPassword(id: string, newPasswordHash: string): Promise<void>;

  // Sessions
  createSession(data: CreateSessionData): Promise<Session>;
  findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(data: CreatePasswordResetTokenData): Promise<PasswordResetToken>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<(PasswordResetToken & { user: User }) | null>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  // Email Verification Tokens
  createEmailVerificationToken(data: CreateEmailVerificationTokenData): Promise<EmailVerificationToken>;
  findEmailVerificationTokenByHash(tokenHash: string): Promise<(EmailVerificationToken & { user: User }) | null>;
  markEmailVerificationTokenUsed(id: string): Promise<void>;

  // Tenant Memberships & RBAC
  findMembership(userId: string, tenantId: string): Promise<AuthMembership | null>;
  findMembershipById(membershipId: string): Promise<TenantMemberDto | null>;
  createMembership(data: { userId: string; tenantId: string; status?: MembershipStatus }): Promise<{ id: string; userId: string; tenantId: string; status: MembershipStatus }>;
  assignRoleToMembership(membershipId: string, roleId: string): Promise<void>;
  updateMembershipRoles(membershipId: string, roleIds: string[]): Promise<void>;
  updateMembershipStatus(membershipId: string, status: MembershipStatus): Promise<void>;
  findMembershipsByTenant(
    tenantId: string,
    params: { page: number; limit: number; search?: string; status?: string; role?: string }
  ): Promise<PaginatedData<TenantMemberDto>>;
  getUserPermissions(userId: string, tenantId: string): Promise<PermissionCode[]>;
  createRole(data: { name: string; displayName: string; description?: string; tenantId?: string | null; isSystem?: boolean }): Promise<{ id: string; name: string }>;
  findRoleByName(name: string, tenantId?: string | null): Promise<Role | null>;
  findRoleById(id: string): Promise<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null } | null>;
  findRolesByTenant(tenantId: string): Promise<Array<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null }>>;
  assignPermissionToRole(roleId: string, permissionCode: string): Promise<void>;

  // Tenant Invitations (Day 4)
  createInvitation(data: CreateInvitationData): Promise<TenantInvitation>;
  findInvitationById(id: string): Promise<TenantInvitation | null>;
  findInvitationByTokenHash(tokenHash: string): Promise<(TenantInvitation & { inviter: User; tenant: Tenant }) | null>;
  findPendingInvitationByEmail(tenantId: string, email: string): Promise<TenantInvitation | null>;
  findInvitationsByTenant(
    tenantId: string,
    params: { page: number; limit: number; status?: InvitationStatus }
  ): Promise<PaginatedData<TenantInvitationDto>>;
  markInvitationAccepted(id: string): Promise<void>;
  markInvitationRevoked(id: string): Promise<void>;
}

/**
 * Production Prisma Implementation of IAuthRepository
 */
export class PrismaAuthRepository implements IAuthRepository {
  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findUserByEmail(rawEmail: string): Promise<User | null> {
    const email = normalizeEmail(rawEmail);
    if (!email) return null;
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status || 'ACTIVE',
        isSuperAdmin: data.isSuperAdmin || false,
      },
    });
  }

  async updateUser(
    id: string,
    data: Partial<{ firstName: string | null; lastName: string | null; status: UserStatus; emailVerifiedAt: Date | null }>
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });
  }

  async findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null> {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async revokeSession(id: string): Promise<void> {
    await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createPasswordResetToken(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<(PasswordResetToken & { user: User }) | null> {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async createEmailVerificationToken(data: CreateEmailVerificationTokenData): Promise<EmailVerificationToken> {
    return prisma.emailVerificationToken.create({
      data: {
        userId: data.userId,
        email: normalizeEmail(data.email),
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findEmailVerificationTokenByHash(tokenHash: string): Promise<(EmailVerificationToken & { user: User }) | null> {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async findMembership(userId: string, tenantId: string): Promise<AuthMembership | null> {
    const record = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      userId: record.userId,
      tenantId: record.tenantId,
      status: record.status as MembershipStatus,
      roles: record.roles.map((mr) => ({
        id: mr.role.id,
        name: mr.role.name,
        displayName: mr.role.displayName,
        permissions: mr.role.permissions.map((rp) => rp.permission.code as PermissionCode),
      })),
    };
  }

  async findMembershipById(membershipId: string): Promise<TenantMemberDto | null> {
    const record = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!record) return null;

    return {
      membershipId: record.id,
      userId: record.userId,
      email: record.user.email,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      status: record.status as MembershipStatus,
      joinedAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      roles: record.roles.map((mr) => ({
        id: mr.role.id,
        name: mr.role.name,
        displayName: mr.role.displayName,
      })),
    };
  }

  async createMembership(data: { userId: string; tenantId: string; status?: MembershipStatus }): Promise<{ id: string; userId: string; tenantId: string; status: MembershipStatus }> {
    const created = await prisma.membership.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        status: data.status || 'ACTIVE',
      },
    });
    return {
      id: created.id,
      userId: created.userId,
      tenantId: created.tenantId,
      status: created.status as MembershipStatus,
    };
  }

  async assignRoleToMembership(membershipId: string, roleId: string): Promise<void> {
    await prisma.membershipRole.upsert({
      where: { membershipId_roleId: { membershipId, roleId } },
      update: {},
      create: { membershipId, roleId },
    });
  }

  async updateMembershipRoles(membershipId: string, roleIds: string[]): Promise<void> {
    // Replace current role assignments with specified roleIds
    await prisma.$transaction([
      prisma.membershipRole.deleteMany({ where: { membershipId } }),
      prisma.membershipRole.createMany({
        data: roleIds.map((roleId) => ({ membershipId, roleId })),
      }),
    ]);
  }

  async updateMembershipStatus(membershipId: string, status: MembershipStatus): Promise<void> {
    await prisma.membership.update({
      where: { id: membershipId },
      data: { status },
    });
  }

  async findMembershipsByTenant(
    tenantId: string,
    params: { page: number; limit: number; search?: string; status?: string; role?: string }
  ): Promise<PaginatedData<TenantMemberDto>> {
    const { page, limit, search, status, role } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (role) {
      where.roles = {
        some: {
          role: {
            OR: [{ id: role }, { name: { equals: role, mode: 'insensitive' } }],
          },
        },
      };
    }

    const [total, records] = await Promise.all([
      prisma.membership.count({ where }),
      prisma.membership.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          roles: {
            include: { role: true },
          },
        },
      }),
    ]);

    const items: TenantMemberDto[] = records.map((r) => ({
      membershipId: r.id,
      userId: r.userId,
      email: r.user.email,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      status: r.status as MembershipStatus,
      joinedAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      roles: r.roles.map((mr) => ({
        id: mr.role.id,
        name: mr.role.name,
        displayName: mr.role.displayName,
      })),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<PermissionCode[]> {
    const membership = await this.findMembership(userId, tenantId);
    if (!membership || membership.status !== 'ACTIVE') {
      return [];
    }

    const permissionSet = new Set<PermissionCode>();
    for (const role of membership.roles) {
      for (const perm of role.permissions) {
        permissionSet.add(perm);
      }
    }
    return Array.from(permissionSet);
  }

  async createRole(data: { name: string; displayName: string; description?: string; tenantId?: string | null; isSystem?: boolean }): Promise<{ id: string; name: string }> {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        tenantId: data.tenantId ?? null,
        isSystem: data.isSystem ?? false,
      },
    });
    return { id: role.id, name: role.name };
  }

  async findRoleByName(name: string, tenantId?: string | null): Promise<Role | null> {
    return prisma.role.findFirst({
      where: {
        name,
        tenantId: tenantId ?? null,
      },
    });
  }

  async findRoleById(id: string): Promise<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null } | null> {
    return prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true, displayName: true, isSystem: true, tenantId: true },
    });
  }

  async findRolesByTenant(tenantId: string): Promise<Array<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null }>> {
    return prisma.role.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: null, isSystem: true, NOT: { name: 'SUPER_ADMIN' } },
        ],
      },
      select: { id: true, name: true, displayName: true, isSystem: true, tenantId: true },
      orderBy: { name: 'asc' },
    });
  }

  async assignPermissionToRole(roleId: string, permissionCode: string): Promise<void> {
    const perm = await prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!perm) {
      throw new Error(`Permission '${permissionCode}' not found.`);
    }
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: perm.id } },
      update: {},
      create: { roleId, permissionId: perm.id },
    });
  }

  // Tenant Invitations (Day 4)
  async createInvitation(data: CreateInvitationData): Promise<TenantInvitation> {
    return prisma.tenantInvitation.create({
      data: {
        tenantId: data.tenantId,
        email: normalizeEmail(data.email),
        inviterUserId: data.inviterUserId,
        roleIds: data.roleIds,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      },
    });
  }

  async findInvitationById(id: string): Promise<TenantInvitation | null> {
    return prisma.tenantInvitation.findUnique({ where: { id } });
  }

  async findInvitationByTokenHash(tokenHash: string): Promise<(TenantInvitation & { inviter: User; tenant: Tenant }) | null> {
    return prisma.tenantInvitation.findUnique({
      where: { tokenHash },
      include: { inviter: true, tenant: true },
    });
  }

  async findPendingInvitationByEmail(tenantId: string, email: string): Promise<TenantInvitation | null> {
    return prisma.tenantInvitation.findFirst({
      where: {
        tenantId,
        email: normalizeEmail(email),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findInvitationsByTenant(
    tenantId: string,
    params: { page: number; limit: number; status?: InvitationStatus }
  ): Promise<PaginatedData<TenantInvitationDto>> {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const [total, records] = await Promise.all([
      prisma.tenantInvitation.count({ where }),
      prisma.tenantInvitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { inviter: true },
      }),
    ]);

    const items: TenantInvitationDto[] = records.map((r) => ({
      id: r.id,
      email: r.email,
      status: r.status as InvitationStatus,
      roleIds: r.roleIds,
      expiresAt: r.expiresAt.toISOString(),
      sentAt: r.sentAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      inviterEmail: r.inviter.email,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markInvitationAccepted(id: string): Promise<void> {
    await prisma.tenantInvitation.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async markInvitationRevoked(id: string): Promise<void> {
    await prisma.tenantInvitation.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }
}

/**
 * Complete In-Memory Implementation for Automated Tests and Offline Execution
 */
export class InMemoryAuthRepository implements IAuthRepository {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, string>();
  private sessions = new Map<string, Session>();
  private sessionsByHash = new Map<string, string>();
  private passwordResetTokens = new Map<string, PasswordResetToken>();
  private resetTokensByHash = new Map<string, string>();
  private emailVerificationTokens = new Map<string, EmailVerificationToken>();
  private verificationTokensByHash = new Map<string, string>();

  private invitations = new Map<string, TenantInvitation>();
  private invitationsByHash = new Map<string, string>();

  private memberships = new Map<string, {
    id: string;
    userId: string;
    tenantId: string;
    status: MembershipStatus;
    createdAt: Date;
    updatedAt: Date;
  }>();
  private membershipRoles = new Map<string, Set<string>>(); // membershipId -> Set<roleId>
  private roles = new Map<string, {
    id: string;
    tenantId: string | null;
    name: string;
    displayName: string;
    description: string | null;
    isSystem: boolean;
  }>();
  private rolePermissions = new Map<string, Set<string>>(); // roleId -> Set<permissionCode>

  private idCounter = 1;
  private newId(prefix: string): string {
    return `${prefix}_${this.idCounter++}_${Date.now()}`;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findUserByEmail(rawEmail: string): Promise<User | null> {
    const email = normalizeEmail(rawEmail);
    const id = this.usersByEmail.get(email);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  async createUser(data: CreateUserData): Promise<User> {
    const email = normalizeEmail(data.email);
    if (this.usersByEmail.has(email)) {
      throw new Error(`User with email '${email}' already exists.`);
    }

    const id = this.newId('user');
    const now = new Date();
    const user: User = {
      id,
      email,
      passwordHash: data.passwordHash,
      status: data.status || 'ACTIVE',
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      emailVerifiedAt: null,
      isSuperAdmin: data.isSuperAdmin || false,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.usersByEmail.set(email, id);
    return user;
  }

  async updateUser(
    id: string,
    data: Partial<{ firstName: string | null; lastName: string | null; status: UserStatus; emailVerifiedAt: Date | null }>
  ): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found.`);

    const updated: User = {
      ...existing,
      firstName: data.firstName !== undefined ? data.firstName : existing.firstName,
      lastName: data.lastName !== undefined ? data.lastName : existing.lastName,
      status: data.status ?? existing.status,
      emailVerifiedAt: data.emailVerifiedAt !== undefined ? data.emailVerifiedAt : existing.emailVerifiedAt,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found.`);
    existing.passwordHash = newPasswordHash;
    existing.updatedAt = new Date();
    this.users.set(id, existing);
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    const id = this.newId('session');
    const now = new Date();
    const session: Session = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      userAgent: data.userAgent || null,
      ipAddress: data.ipAddress || null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    this.sessionsByHash.set(data.tokenHash, id);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null> {
    const id = this.sessionsByHash.get(tokenHash);
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    const user = this.users.get(session.userId);
    if (!user) return null;
    return { ...session, user };
  }

  async revokeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.revokedAt = new Date();
      session.updatedAt = new Date();
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = new Date();
        session.updatedAt = new Date();
      }
    }
  }

  async createPasswordResetToken(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    const id = this.newId('prt');
    const token: PasswordResetToken = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.passwordResetTokens.set(id, token);
    this.resetTokensByHash.set(data.tokenHash, id);
    return token;
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<(PasswordResetToken & { user: User }) | null> {
    const id = this.resetTokensByHash.get(tokenHash);
    if (!id) return null;
    const token = this.passwordResetTokens.get(id);
    if (!token) return null;
    const user = this.users.get(token.userId);
    if (!user) return null;
    return { ...token, user };
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    const token = this.passwordResetTokens.get(id);
    if (token) {
      token.usedAt = new Date();
    }
  }

  async createEmailVerificationToken(data: CreateEmailVerificationTokenData): Promise<EmailVerificationToken> {
    const id = this.newId('evt');
    const token: EmailVerificationToken = {
      id,
      userId: data.userId,
      email: normalizeEmail(data.email),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.emailVerificationTokens.set(id, token);
    this.verificationTokensByHash.set(data.tokenHash, id);
    return token;
  }

  async findEmailVerificationTokenByHash(tokenHash: string): Promise<(EmailVerificationToken & { user: User }) | null> {
    const id = this.verificationTokensByHash.get(tokenHash);
    if (!id) return null;
    const token = this.emailVerificationTokens.get(id);
    if (!token) return null;
    const user = this.users.get(token.userId);
    if (!user) return null;
    return { ...token, user };
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    const token = this.emailVerificationTokens.get(id);
    if (token) {
      token.usedAt = new Date();
    }
  }

  async findMembership(userId: string, tenantId: string): Promise<AuthMembership | null> {
    const membership = Array.from(this.memberships.values()).find(
      (m) => m.userId === userId && m.tenantId === tenantId
    );
    if (!membership) return null;

    const roleIds = this.membershipRoles.get(membership.id) || new Set<string>();
    const roles: Array<{
      id: string;
      name: string;
      displayName: string;
      permissions: PermissionCode[];
    }> = [];

    for (const rId of roleIds) {
      const role = this.roles.get(rId);
      if (role) {
        const perms = Array.from(this.rolePermissions.get(rId) || new Set<string>()) as PermissionCode[];
        roles.push({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          permissions: perms,
        });
      }
    }

    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      status: membership.status,
      roles,
    };
  }

  async findMembershipById(membershipId: string): Promise<TenantMemberDto | null> {
    const membership = this.memberships.get(membershipId);
    if (!membership) return null;

    const user = this.users.get(membership.userId);
    if (!user) return null;

    const roleIds = this.membershipRoles.get(membership.id) || new Set<string>();
    const roles: Array<{ id: string; name: string; displayName: string }> = [];
    for (const rId of roleIds) {
      const role = this.roles.get(rId);
      if (role) {
        roles.push({ id: role.id, name: role.name, displayName: role.displayName });
      }
    }

    return {
      membershipId: membership.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: membership.status,
      joinedAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
      roles,
    };
  }

  async createMembership(data: { userId: string; tenantId: string; status?: MembershipStatus }): Promise<{ id: string; userId: string; tenantId: string; status: MembershipStatus }> {
    const id = this.newId('membership');
    const now = new Date();
    const record = {
      id,
      userId: data.userId,
      tenantId: data.tenantId,
      status: data.status || ('ACTIVE' as MembershipStatus),
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.set(id, record);
    this.membershipRoles.set(id, new Set<string>());
    return record;
  }

  async assignRoleToMembership(membershipId: string, roleId: string): Promise<void> {
    let set = this.membershipRoles.get(membershipId);
    if (!set) {
      set = new Set<string>();
      this.membershipRoles.set(membershipId, set);
    }
    set.add(roleId);
  }

  async updateMembershipRoles(membershipId: string, roleIds: string[]): Promise<void> {
    const set = new Set<string>(roleIds);
    this.membershipRoles.set(membershipId, set);
  }

  async updateMembershipStatus(membershipId: string, status: MembershipStatus): Promise<void> {
    const record = this.memberships.get(membershipId);
    if (record) {
      record.status = status;
      record.updatedAt = new Date();
    }
  }

  async findMembershipsByTenant(
    tenantId: string,
    params: { page: number; limit: number; search?: string; status?: string; role?: string }
  ): Promise<PaginatedData<TenantMemberDto>> {
    const { page, limit, search, status, role } = params;

    let items: TenantMemberDto[] = [];
    for (const m of this.memberships.values()) {
      if (m.tenantId !== tenantId) continue;
      if (status && m.status !== status) continue;

      const user = this.users.get(m.userId);
      if (!user) continue;

      if (search) {
        const query = search.toLowerCase();
        const matches =
          user.email.toLowerCase().includes(query) ||
          (user.firstName && user.firstName.toLowerCase().includes(query)) ||
          (user.lastName && user.lastName.toLowerCase().includes(query));
        if (!matches) continue;
      }

      const roleIds = this.membershipRoles.get(m.id) || new Set<string>();
      const roles: Array<{ id: string; name: string; displayName: string }> = [];
      let hasRole = !role;

      for (const rId of roleIds) {
        const r = this.roles.get(rId);
        if (r) {
          roles.push({ id: r.id, name: r.name, displayName: r.displayName });
          if (role && (r.id === role || r.name.toLowerCase() === role.toLowerCase())) {
            hasRole = true;
          }
        }
      }

      if (!hasRole) continue;

      items.push({
        membershipId: m.id,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: m.status,
        joinedAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        roles,
      });
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paged = items.slice(startIndex, startIndex + limit);

    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<PermissionCode[]> {
    const membership = await this.findMembership(userId, tenantId);
    if (!membership || membership.status !== 'ACTIVE') {
      return [];
    }
    const perms = new Set<PermissionCode>();
    for (const role of membership.roles) {
      for (const p of role.permissions) {
        perms.add(p);
      }
    }
    return Array.from(perms);
  }

  async createRole(data: { name: string; displayName: string; description?: string; tenantId?: string | null; isSystem?: boolean }): Promise<{ id: string; name: string }> {
    const id = this.newId('role');
    this.roles.set(id, {
      id,
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      tenantId: data.tenantId ?? null,
      isSystem: data.isSystem ?? false,
    });
    this.rolePermissions.set(id, new Set<string>());
    return { id, name: data.name };
  }

  async findRoleByName(name: string, tenantId?: string | null): Promise<Role | null> {
    for (const r of this.roles.values()) {
      if (r.name.toLowerCase() === name.toLowerCase()) {
        if (tenantId === undefined || r.tenantId === (tenantId ?? null)) {
          return r as any;
        }
      }
    }
    return null;
  }

  async findRoleById(id: string): Promise<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null } | null> {
    const r = this.roles.get(id);
    if (!r) return null;
    return { id: r.id, name: r.name, displayName: r.displayName, isSystem: r.isSystem, tenantId: r.tenantId };
  }

  async findRolesByTenant(tenantId: string): Promise<Array<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null }>> {
    const list: Array<{ id: string; name: string; displayName: string; isSystem: boolean; tenantId: string | null }> = [];
    for (const r of this.roles.values()) {
      if (r.tenantId === tenantId || (r.tenantId === null && r.isSystem && r.name !== 'SUPER_ADMIN')) {
        list.push({ id: r.id, name: r.name, displayName: r.displayName, isSystem: r.isSystem, tenantId: r.tenantId });
      }
    }
    return list;
  }

  async assignPermissionToRole(roleId: string, permissionCode: string): Promise<void> {
    let perms = this.rolePermissions.get(roleId);
    if (!perms) {
      perms = new Set<string>();
      this.rolePermissions.set(roleId, perms);
    }
    perms.add(permissionCode);
  }

  // Tenant Invitations (Day 4)
  async createInvitation(data: CreateInvitationData): Promise<TenantInvitation> {
    const id = this.newId('invitation');
    const now = new Date();
    const inv: TenantInvitation = {
      id,
      tenantId: data.tenantId,
      email: normalizeEmail(data.email),
      inviterUserId: data.inviterUserId,
      roleIds: data.roleIds,
      tokenHash: data.tokenHash,
      status: 'PENDING',
      expiresAt: data.expiresAt,
      acceptedAt: null,
      revokedAt: null,
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.invitations.set(id, inv);
    this.invitationsByHash.set(data.tokenHash, id);
    return inv;
  }

  async findInvitationById(id: string): Promise<TenantInvitation | null> {
    return this.invitations.get(id) || null;
  }

  async findInvitationByTokenHash(tokenHash: string): Promise<(TenantInvitation & { inviter: User; tenant: Tenant }) | null> {
    const id = this.invitationsByHash.get(tokenHash);
    if (!id) return null;
    const inv = this.invitations.get(id);
    if (!inv) return null;
    const inviter = this.users.get(inv.inviterUserId);
    if (!inviter) return null;

    return {
      ...inv,
      inviter,
      tenant: { id: inv.tenantId, name: 'Test Tenant' } as any,
    };
  }

  async findPendingInvitationByEmail(tenantId: string, email: string): Promise<TenantInvitation | null> {
    const norm = normalizeEmail(email);
    for (const inv of this.invitations.values()) {
      if (inv.tenantId === tenantId && inv.email === norm && inv.status === 'PENDING' && inv.expiresAt > new Date()) {
        return inv;
      }
    }
    return null;
  }

  async findInvitationsByTenant(
    tenantId: string,
    params: { page: number; limit: number; status?: InvitationStatus }
  ): Promise<PaginatedData<TenantInvitationDto>> {
    const { page, limit, status } = params;

    let items: TenantInvitationDto[] = [];
    for (const inv of this.invitations.values()) {
      if (inv.tenantId !== tenantId) continue;
      if (status && inv.status !== status) continue;

      const inviter = this.users.get(inv.inviterUserId);

      items.push({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        roleIds: inv.roleIds,
        expiresAt: inv.expiresAt.toISOString(),
        sentAt: inv.sentAt.toISOString(),
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
        revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
        inviterEmail: inviter?.email,
      });
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paged = items.slice(startIndex, startIndex + limit);

    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markInvitationAccepted(id: string): Promise<void> {
    const inv = this.invitations.get(id);
    if (inv) {
      inv.status = 'ACCEPTED';
      inv.acceptedAt = new Date();
      inv.updatedAt = new Date();
    }
  }

  async markInvitationRevoked(id: string): Promise<void> {
    const inv = this.invitations.get(id);
    if (inv) {
      inv.status = 'REVOKED';
      inv.revokedAt = new Date();
      inv.updatedAt = new Date();
    }
  }
}
