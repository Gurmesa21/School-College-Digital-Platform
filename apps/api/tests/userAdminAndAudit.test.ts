import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Tenant User Administration and Audit Logging Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

  // Test Tenants
  const tenantA: ResolvedTenant = {
    id: 'tenant-greenwood-id',
    slug: 'greenwood',
    name: 'Greenwood Secondary School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'greenwood.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const tenantB: ResolvedTenant = {
    id: 'tenant-summit-id',
    slug: 'summit',
    name: 'Summit TVET Institute',
    institutionType: 'TVET_TRAINING_CENTRE',
    status: 'ACTIVE',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@summit.edu.example',
    matchedHostname: 'summit.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  let roleAdminAId: string;
  let roleStaffAId: string;
  let roleSuperAdminId: string;

  let memAId: string;
  let memBId: string;
  let memMultiAId: string;
  let memMultiBId: string;

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantA, domains: ['greenwood.localhost'] },
      { tenant: tenantB, domains: ['summit.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    emailService = new InMemoryEmailService();
    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);

    const testEnvConfig = loadConfig({
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PORT: '4000',
      API_PREFIX: '/api/v1',
      CORS_ORIGIN: 'http://localhost:3000',
      ALLOW_DEV_TENANT_OVERRIDE: 'false',
      TRUST_PROXY: 'false',
    });

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      emailService,
      authService,
      userAdminService,
      envConfig: testEnvConfig,
    });

    // 1. Setup Roles
    const roleAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    roleAdminAId = roleAdmin.id;
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.TENANT_PROFILE_READ);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.TENANT_PROFILE_UPDATE);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.USERS_READ);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.USERS_INVITE);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.USERS_MANAGE);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.ROLES_READ);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.ROLES_ASSIGN);
    await authRepo.assignPermissionToRole(roleAdminAId, PERMISSIONS.AUDIT_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff Member',
      isSystem: true,
    });
    roleStaffAId = roleStaff.id;
    await authRepo.assignPermissionToRole(roleStaffAId, PERMISSIONS.TENANT_PROFILE_READ);

    const roleSuperAdmin = await authRepo.createRole({
      name: 'SUPER_ADMIN',
      displayName: 'Platform Super Administrator',
      isSystem: true,
    });
    roleSuperAdminId = roleSuperAdmin.id;
    await authRepo.assignPermissionToRole(roleSuperAdminId, PERMISSIONS.PLATFORM_ACCESS);
    await authRepo.assignPermissionToRole(roleSuperAdminId, PERMISSIONS.PLATFORM_TENANTS_MANAGE);

    // 2. Setup Users
    // User 1: Greenwood Admin
    const userA = await authRepo.createUser({
      email: 'admin@greenwood.school.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Admin',
      status: 'ACTIVE',
    });
    const memA = await authRepo.createMembership({
      userId: userA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    memAId = memA.id;
    await authRepo.assignRoleToMembership(memA.id, roleAdminAId);

    // User 2: Greenwood Staff
    const userStaff = await authRepo.createUser({
      email: 'staff@greenwood.school.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Staff',
      status: 'ACTIVE',
    });
    const memStaff = await authRepo.createMembership({
      userId: userStaff.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaff.id, roleStaffAId);

    // User 3: Summit Admin (Tenant B)
    const userB = await authRepo.createUser({
      email: 'admin@summit.edu.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Summit',
      lastName: 'Admin',
      status: 'ACTIVE',
    });
    const memB = await authRepo.createMembership({
      userId: userB.id,
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
    memBId = memB.id;
    await authRepo.assignRoleToMembership(memB.id, roleAdminAId);

    // User 4: Multi-tenant User (Member of both Tenant A and Tenant B)
    const userMulti = await authRepo.createUser({
      email: 'multitenant@example.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Multi',
      lastName: 'Member',
      status: 'ACTIVE',
    });
    const memMultiA = await authRepo.createMembership({
      userId: userMulti.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    memMultiAId = memMultiA.id;
    await authRepo.assignRoleToMembership(memMultiA.id, roleStaffAId);

    const memMultiB = await authRepo.createMembership({
      userId: userMulti.id,
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
    memMultiBId = memMultiB.id;
    await authRepo.assignRoleToMembership(memMultiB.id, roleStaffAId);

    // User 5: Platform Super Admin
    await authRepo.createUser({
      email: 'superadmin@platform.example',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      isSuperAdmin: true,
    });
  });

  describe('1. Tenant Invitations and Role Constraints', () => {
    it('allows authorized tenant administrator to create an invitation and audits event', async () => {
      // Sign in as Greenwood Admin
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const inviteRes = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'newteacher@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      expect(inviteRes.status).toBe(201);
      expect(inviteRes.body.success).toBe(true);
      expect(inviteRes.body.data.email).toBe('newteacher@greenwood.school.example');
      expect(inviteRes.body.data.status).toBe('PENDING');
      expect(inviteRes.body.data.rawToken).toBeUndefined(); // Never expose raw token in API response

      // Email service dispatched invitation
      const sentEmail = emailService.getLastDispatchedEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.type).toBe('INVITATION');
      expect(sentEmail?.toEmail).toBe('newteacher@greenwood.school.example');
      expect(sentEmail?.token).toBeDefined();

      // Audit log was recorded
      const auditLogs = await auditRepo.findAuditLogs({ tenantId: tenantA.id, page: 1, limit: 10 });
      const createLog = auditLogs.items.find((l) => l.action === 'INVITATION_CREATED');
      expect(createLog).toBeDefined();
      expect(createLog?.outcome).toBe('SUCCESS');
      expect(createLog?.metadata?.inviteeEmail).toBe('newteacher@greenwood.school.example');
    });

    it('denies invitation creation to unauthorized staff with 403', async () => {
      // Sign in as Greenwood Staff (lacks USERS_INVITE)
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'staff@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'candidate@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('strictly forbids tenant administrator from inviting a user with SUPER_ADMIN role', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'rogue@greenwood.school.example',
          roleIds: [roleSuperAdminId],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DISALLOWED_ROLE_ASSIGNMENT');
    });

    it('rejects duplicate pending invitations for the same email', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // First invitation
      await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'duplicate@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      // Second invitation for same email
      const dupRes = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'duplicate@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('INVITATION_ALREADY_PENDING');
    });

    it('allows valid invitation acceptance once, establishing user and active membership', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'invited_teacher@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      const rawToken = emailService.getLastDispatchedEmail()!.token;

      // Accept invitation
      const acceptRes = await request(app)
        .post('/api/v1/auth/invitations/accept')
        .send({
          token: rawToken,
          password: 'NewUserPassword2026!',
          firstName: 'Invited',
          lastName: 'Teacher',
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);

      // Now newly invited user can sign in
      const newLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'invited_teacher@greenwood.school.example',
          password: 'NewUserPassword2026!',
        });
      expect(newLogin.status).toBe(200);

      // And can access Greenwood as staff
      const staffCookie = newLogin.headers['set-cookie'];
      const tenantRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', staffCookie);
      expect(tenantRes.status).toBe(200);

      // Second acceptance attempt must fail (single-use constraint)
      const secondAccept = await request(app)
        .post('/api/v1/auth/invitations/accept')
        .send({
          token: rawToken,
          password: 'NewUserPassword2026!',
        });
      expect(secondAccept.status).toBe(400);
      expect(secondAccept.body.error.code).toBe('INVALID_INVITATION_TOKEN');
    });

    it('revokes an invitation and prevents subsequent acceptance', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const inviteRes = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          email: 'to_be_revoked@greenwood.school.example',
          roleIds: [roleStaffAId],
        });

      const invId = inviteRes.body.data.id;
      const rawToken = emailService.getLastDispatchedEmail()!.token;

      // Revoke
      const revokeRes = await request(app)
        .post(`/api/v1/tenant/admin/invitations/${invId}/revoke`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(revokeRes.status).toBe(200);

      // Attempt accept revoked token
      const acceptRes = await request(app)
        .post('/api/v1/auth/invitations/accept')
        .send({
          token: rawToken,
          password: 'SomePassword123!',
        });

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.error.code).toBe('INVALID_INVITATION_TOKEN');
    });
  });

  describe('2. Tenant Membership Lifecycle and Deactivation', () => {
    it('lists institutional members with pagination for current tenant', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/tenant/admin/users?page=1&limit=10')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.total).toBeDefined();

      // Check member schema
      const member = res.body.data.items[0];
      expect(member.membershipId).toBeDefined();
      expect(member.email).toBeDefined();
      expect(member.roles).toBeDefined();
      expect(member.passwordHash).toBeUndefined(); // Sensitive fields never returned
    });

    it('updates tenant-scoped roles on a membership and records audit log', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Promote staff to tenant admin
      const res = await request(app)
        .patch(`/api/v1/tenant/admin/users/${memMultiAId}/roles`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({
          roleIds: [roleAdminAId],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify audit log
      const logs = await auditRepo.findAuditLogs({ tenantId: tenantA.id, action: 'ROLES_ASSIGNED', page: 1, limit: 5 });
      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].entityId).toBe(memMultiAId);
    });

    it('immediately denies access to tenant operations when membership is deactivated', async () => {
      // 1. Sign in as Multi-tenant user (member of A and B)
      const multiLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'multitenant@example.com',
          password: defaultPassword,
        });
      const multiCookie = multiLogin.headers['set-cookie'];

      // Verify initially allowed on Tenant A
      const initialA = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', multiCookie);
      expect(initialA.status).toBe(200);

      // 2. Greenwood Admin deactivates multi-tenant user's membership on Tenant A
      const adminLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const adminCookie = adminLogin.headers['set-cookie'];

      const deactRes = await request(app)
        .patch(`/api/v1/tenant/admin/users/${memMultiAId}/status`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', adminCookie)
        .send({
          status: 'INACTIVE',
          reason: 'Transferred department',
        });
      expect(deactRes.status).toBe(200);

      // 3. Multi-tenant user's request to Tenant A must now immediately fail with 403
      const blockedA = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', multiCookie);

      expect(blockedA.status).toBe(403);
      expect(blockedA.body.error.code).toBe('MEMBERSHIP_INACTIVE');

      // 4. CRITICAL: Multi-tenant user's membership in Tenant B is STILL ACTIVE and must succeed!
      const successB = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'summit.localhost')
        .set('Cookie', multiCookie);

      expect(successB.status).toBe(200);
      expect(successB.body.data.tenantName).toBe('Summit TVET Institute');
    });

    it('prevents tenant administrator from deactivating their own membership', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .patch(`/api/v1/tenant/admin/users/${memAId}/status`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_DEACTIVATION_DENIED');
    });
  });

  describe('3. Strict Tenant Isolation', () => {
    it('prevents Tenant A admin from inspecting or modifying Tenant B members', async () => {
      // Sign in as Greenwood Admin (Tenant A)
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Attempt to inspect Tenant B's member via Tenant A host
      const readRes = await request(app)
        .get(`/api/v1/tenant/admin/users/${memBId}`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(readRes.status).toBe(404);
      expect(readRes.body.error.code).toBe('MEMBER_NOT_FOUND');

      // Attempt to deactivate Tenant B's member via Tenant A host
      const deactRes = await request(app)
        .patch(`/api/v1/tenant/admin/users/${memBId}/status`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({ status: 'INACTIVE' });

      expect(deactRes.status).toBe(404);
    });

    it('prevents Tenant A admin from accessing Tenant B administration via host spoofing', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Target Summit TVET (Tenant B) host with Greenwood Admin credentials
      const res = await request(app)
        .get('/api/v1/tenant/admin/users')
        .set('Host', 'summit.localhost')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
    });
  });

  describe('4. Audit Logging and Restricted Audit History', () => {
    it('allows authorized tenant admin to view tenant-scoped audit logs in descending order', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Perform an auditable action
      await request(app)
        .patch(`/api/v1/tenant/admin/users/${memMultiAId}/status`)
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie)
        .send({ status: 'SUSPENDED', reason: 'Audit verification' });

      // Retrieve audit history
      const auditRes = await request(app)
        .get('/api/v1/tenant/admin/audit?page=1&limit=10')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(auditRes.body.data.items.length).toBeGreaterThan(0);

      // Verify all returned logs belong to Greenwood (Tenant A)
      for (const log of auditRes.body.data.items) {
        expect(log.tenantId).toBe(tenantA.id);
      }
    });

    it('denies audit history access to staff without AUDIT_READ permission', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'staff@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/tenant/admin/audit')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('ensures audit logs cannot be updated or deleted through APIs', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const deleteRes = await request(app)
        .delete('/api/v1/tenant/admin/audit')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect([404, 405]).toContain(deleteRes.status);

      const putRes = await request(app)
        .put('/api/v1/tenant/admin/audit')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect([404, 405]).toContain(putRes.status);
    });

    it('allows Platform Super Admin to view platform-wide audit history while denying ordinary tenant admins', async () => {
      // 1. Greenwood Admin attempts to access platform audit -> 403
      const adminLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const adminCookie = adminLogin.headers['set-cookie'];

      const deniedRes = await request(app)
        .get('/api/v1/platform/audit')
        .set('Cookie', adminCookie);
      expect(deniedRes.status).toBe(403);
      expect(deniedRes.body.error.code).toBe('PLATFORM_SUPER_ADMIN_REQUIRED');

      // 2. Platform Super Admin accesses platform audit -> 200
      const superLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'superadmin@platform.example',
          password: defaultPassword,
        });
      const superCookie = superLogin.headers['set-cookie'];

      const allowedRes = await request(app)
        .get('/api/v1/platform/audit?page=1&limit=25')
        .set('Cookie', superCookie);

      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.success).toBe(true);
      expect(allowedRes.body.data.items).toBeDefined();
    });
  });
});
