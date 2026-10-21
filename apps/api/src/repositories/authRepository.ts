import {
  User,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  UserStatus,
  MembershipStatus,
  prisma,
} from '@school/db';
import {
  AuthMembership,
  PermissionCode,
  normalizeEmail,
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

export interface IAuthRepository {
  // Users
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, data: Partial<{ status: UserStatus; emailVerifiedAt: Date | null }>): Promise<User>;
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
  createMembership(data: { userId: string; tenantId: string; status?: MembershipStatus }): Promise<{ id: string; userId: string; tenantId: string; status: MembershipStatus }>;
  assignRoleToMembership(membershipId: string, roleId: string): Promise<void>;
  getUserPermissions(userId: string, tenantId: string): Promise<PermissionCode[]>;
  createRole(data: { name: string; displayName: string; description?: string; tenantId?: string | null; isSystem?: boolean }): Promise<{ id: string; name: string }>;
  assignPermissionToRole(roleId: string, permissionCode: string): Promise<void>;
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

  async updateUser(id: string, data: Partial<{ status: UserStatus; emailVerifiedAt: Date | null }>): Promise<User> {
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

  private memberships = new Map<string, {
    id: string;
    userId: string;
    tenantId: string;
    status: MembershipStatus;
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

  async updateUser(id: string, data: Partial<{ status: UserStatus; emailVerifiedAt: Date | null }>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found.`);

    const updated: User = {
      ...existing,
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
    const key = `${userId}:${tenantId}`;
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

  async createMembership(data: { userId: string; tenantId: string; status?: MembershipStatus }): Promise<{ id: string; userId: string; tenantId: string; status: MembershipStatus }> {
    const id = this.newId('membership');
    const record = {
      id,
      userId: data.userId,
      tenantId: data.tenantId,
      status: data.status || ('ACTIVE' as MembershipStatus),
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

  async assignPermissionToRole(roleId: string, permissionCode: string): Promise<void> {
    let perms = this.rolePermissions.get(roleId);
    if (!perms) {
      perms = new Set<string>();
      this.rolePermissions.set(roleId, perms);
    }
    perms.add(permissionCode);
  }
}
