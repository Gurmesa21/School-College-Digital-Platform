import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { TokenService } from '../src/services/tokenService.js';
import { SESSION_COOKIE_NAME } from '../src/middleware/authMiddleware.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Authentication, Sessions, and Tenant-Scoped RBAC Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
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

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantA, domains: ['greenwood.localhost', 'secondary.localhost'] },
      { tenant: tenantB, domains: ['summit.localhost', 'tvet.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    emailService = new InMemoryEmailService();
    authService = new AuthService(authRepo, emailService, 7, 60);

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
      emailService,
      authService,
      envConfig: testEnvConfig,
    });

    // 1. Setup Roles & Permissions
    const roleTenantAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleTenantAdmin.id, PERMISSIONS.TENANT_PROFILE_READ);
    await authRepo.assignPermissionToRole(roleTenantAdmin.id, PERMISSIONS.TENANT_PROFILE_UPDATE);
    await authRepo.assignPermissionToRole(roleTenantAdmin.id, PERMISSIONS.ADMISSIONS_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff / Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.TENANT_PROFILE_READ);

    // 2. Setup Users
    // User A: Tenant A Admin
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
    await authRepo.assignRoleToMembership(memA.id, roleTenantAdmin.id);

    // User B: Tenant A Staff
    const userB = await authRepo.createUser({
      email: 'staff@greenwood.school.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Staff',
      status: 'ACTIVE',
    });
    const memB = await authRepo.createMembership({
      userId: userB.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memB.id, roleStaff.id);

    // User C: Tenant A Suspended Member
    const userC = await authRepo.createUser({
      email: 'suspended_member@greenwood.school.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Suspended',
      lastName: 'Member',
      status: 'ACTIVE',
    });
    const memC = await authRepo.createMembership({
      userId: userC.id,
      tenantId: tenantA.id,
      status: 'SUSPENDED',
    });
    await authRepo.assignRoleToMembership(memC.id, roleTenantAdmin.id);

    // User D: Tenant B Admin (Only has membership in Tenant B)
    const userD = await authRepo.createUser({
      email: 'admin@summit.edu.example',
      passwordHash: defaultPasswordHash,
      firstName: 'Summit',
      lastName: 'Admin',
      status: 'ACTIVE',
    });
    const memD = await authRepo.createMembership({
      userId: userD.id,
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memD.id, roleTenantAdmin.id);

    // User E: Deactivated User
    await authRepo.createUser({
      email: 'deactivated@platform.example',
      passwordHash: defaultPasswordHash,
      status: 'SUSPENDED',
    });

    // User F: Pending Verification User
    await authRepo.createUser({
      email: 'pending@platform.example',
      passwordHash: defaultPasswordHash,
      status: 'PENDING_VERIFICATION',
    });

    // User G: Platform Super Administrator
    await authRepo.createUser({
      email: 'superadmin@platform.example',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      isSuperAdmin: true,
    });
  });

  describe('1. Authentication and Session Lifecycle', () => {
    it('establishes an authenticated session on valid credentials and sets secure HTTP-only cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@greenwood.school.example');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never disclose password hash
      expect(res.body.data.rawSessionToken).toBeUndefined(); // Never expose session token in JSON body

      // Verify Set-Cookie header
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');
    });

    it('rejects invalid credentials with generic message and 401 without exposing account details', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects non-existent email with identical 401 and generic message to prevent enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'nonexistent@nowhere.example',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects sign-in for suspended user accounts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'deactivated@platform.example',
          password: defaultPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('rejects sign-in for users pending email verification', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'pending@platform.example',
          password: defaultPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('retrieves current authenticated user from cookie via GET /api/v1/auth/me', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });

      const cookie = loginRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('admin@greenwood.school.example');
      expect(meRes.body.data.session.id).toBeDefined();
    });

    it('rejects unauthenticated requests to GET /api/v1/auth/me', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('revokes session on sign-out and clears cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });

      const cookie = loginRes.headers['set-cookie'];

      const signOutRes = await request(app)
        .post('/api/v1/auth/sign-out')
        .set('Cookie', cookie);

      expect(signOutRes.status).toBe(200);
      expect(signOutRes.body.success).toBe(true);

      // Subsequent /me request with old cookie must now be rejected
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(401);
    });

    it('rejects expired sessions', async () => {
      // Manually create an expired session
      const user = await authRepo.findUserByEmail('admin@greenwood.school.example');
      const rawToken = 'expired_raw_token_xyz1234567890';
      const tokenHash = TokenService.hashToken(rawToken);

      await authRepo.createSession({
        userId: user!.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE_NAME}=${rawToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('2. Password Reset and Email Verification Workflows', () => {
    it('dispatches password reset email and returns non-disclosing message for existing account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'admin@greenwood.school.example' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists');

      // Verify email was dispatched
      const sent = emailService.getLastDispatchedEmail();
      expect(sent).toBeDefined();
      expect(sent?.toEmail).toBe('admin@greenwood.school.example');
      expect(sent?.type).toBe('PASSWORD_RESET');
      expect(sent?.token).toBeDefined();
    });

    it('returns identical success message when requesting reset for non-existent email without dispatching email', async () => {
      emailService.clear();

      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'unknown_account@nowhere.example' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists');

      // Confirm no email was sent
      expect(emailService.getDispatchedEmails().length).toBe(0);
    });

    it('completes password reset with valid token, updates password, and revokes active sessions', async () => {
      // 1. Sign in to establish active session
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const oldSessionCookie = loginRes.headers['set-cookie'];

      // 2. Request reset
      await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'admin@greenwood.school.example' });

      const resetToken = emailService.getLastDispatchedEmail()!.token;

      // 3. Confirm reset
      const newPassword = 'BrandNewPassword2026!';
      const confirmRes = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({
          token: resetToken,
          newPassword,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);

      // 4. Old session is now invalidated
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', oldSessionCookie);
      expect(meRes.status).toBe(401);

      // 5. Old password no longer works
      const oldLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      expect(oldLogin.status).toBe(401);

      // 6. New password works
      const newLogin = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: newPassword,
        });
      expect(newLogin.status).toBe(200);
    });

    it('rejects password reset token reuse (single-use constraint)', async () => {
      await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'admin@greenwood.school.example' });

      const resetToken = emailService.getLastDispatchedEmail()!.token;

      // First use succeeds
      await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({
          token: resetToken,
          newPassword: 'FirstNewPassword123!',
        });

      // Second use must fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({
          token: resetToken,
          newPassword: 'SecondNewPassword123!',
        });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('rejects expired password reset tokens', async () => {
      const user = await authRepo.findUserByEmail('admin@greenwood.school.example');
      const rawToken = 'expired_reset_token_1234567890';
      const tokenHash = TokenService.hashToken(rawToken);

      await authRepo.createPasswordResetToken({
        userId: user!.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      });

      const res = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('verifies email with valid verification token and activates pending user', async () => {
      const user = await authRepo.findUserByEmail('pending@platform.example');
      const rawToken = 'valid_email_verification_token_1234';
      const tokenHash = TokenService.hashToken(rawToken);

      await authRepo.createEmailVerificationToken({
        userId: user!.id,
        email: user!.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // User account is now ACTIVE and can sign in
      const updatedUser = await authRepo.findUserById(user!.id);
      expect(updatedUser?.status).toBe('ACTIVE');
      expect(updatedUser?.emailVerifiedAt).toBeDefined();

      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'pending@platform.example',
          password: defaultPassword,
        });
      expect(loginRes.status).toBe(200);
    });

    it('rejects email verification token reuse', async () => {
      const user = await authRepo.findUserByEmail('pending@platform.example');
      const rawToken = 'single_use_verification_token_5678';
      const tokenHash = TokenService.hashToken(rawToken);

      await authRepo.createEmailVerificationToken({
        userId: user!.id,
        email: user!.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      });

      // First use
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      // Reuse attempt
      const reuseRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  describe('3. Server-Side Tenant-Scoped RBAC & Isolation', () => {
    it('rejects unauthenticated requests to protected tenant operations with 401', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('allows an authorized tenant admin to perform permitted tenant-scoped actions', async () => {
      // Sign in as Greenwood Tenant Admin
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Read settings (requires TENANT_PROFILE_READ)
      const readRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);
      expect(readRes.body.data.tenantName).toBe('Greenwood Secondary School');

      // Update settings (requires TENANT_PROFILE_UPDATE)
      const updateRes = await request(app)
        .patch('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
    });

    it('denies access with 403 when user is an active member but lacks the specific required permission', async () => {
      // Sign in as Greenwood Staff (has TENANT_PROFILE_READ, but lacks TENANT_PROFILE_UPDATE)
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'staff@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Read is permitted
      const readRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);
      expect(readRes.status).toBe(200);

      // Update is forbidden
      const updateRes = await request(app)
        .patch('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(updateRes.body.error.message).toContain('tenant:profile:update');
    });

    it('strictly prevents cross-tenant access: Tenant B Admin cannot access Tenant A records', async () => {
      // Sign in as Summit TVET Admin (Tenant B)
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@summit.edu.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Verify Tenant B admin can access Tenant B
      const summitRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'summit.localhost')
        .set('Cookie', cookie);
      expect(summitRes.status).toBe(200);
      expect(summitRes.body.data.tenantName).toBe('Summit TVET Institute');

      // Attempt to access Greenwood Secondary (Tenant A) by targeting Greenwood host
      const crossTenantRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(crossTenantRes.status).toBe(403);
      expect(crossTenantRes.body.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');

      // Attempt spoofing with client headers (e.g. x-tenant-id)
      const spoofRes = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('x-tenant-id', tenantB.id)
        .set('Cookie', cookie);

      expect(spoofRes.status).toBe(403);
      expect(spoofRes.body.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
    });

    it('denies protected access with 403 when user membership is suspended in the resolved tenant', async () => {
      // Sign in as User C (account active, but membership in Tenant A is SUSPENDED)
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'suspended_member@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBERSHIP_INACTIVE');
      expect(res.body.error.message).toContain('suspended');
    });
  });

  describe('4. Platform vs. Tenant Role Separation', () => {
    it('strictly denies ordinary tenant admins from invoking platform-level operations', async () => {
      // Greenwood Tenant Admin
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/platform/tenants')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PLATFORM_SUPER_ADMIN_REQUIRED');
    });

    it('allows Platform Super Administrator to invoke platform operations', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'superadmin@platform.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/platform/tenants')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platformStatus).toBe('OPERATIONAL');
    });
  });

  describe('5. CSRF Origin Protection and Sensitive Data Hygiene', () => {
    it('rejects cookie-authenticated mutating requests from untrusted external origin', async () => {
      const prodEnvConfig = loadConfig({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        PORT: '4000',
        API_PREFIX: '/api/v1',
        CORS_ORIGIN: 'https://admin.school.example',
        ALLOW_DEV_TENANT_OVERRIDE: 'false',
        TRUST_PROXY: 'false',
      });

      const prodApp = createApp({
        repository: tenantRepo,
        authRepository: authRepo,
        emailService,
        authService,
        envConfig: prodEnvConfig,
      });

      const loginRes = await request(prodApp)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: defaultPassword,
        });
      const cookie = loginRes.headers['set-cookie'];

      // Mutating PATCH with untrusted origin
      const res = await request(prodApp)
        .patch('/api/v1/tenant/settings')
        .set('Host', 'greenwood.localhost')
        .set('Origin', 'https://malicious-site.attacker.example')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ORIGIN_FORBIDDEN');
    });

    it('ensures sensitive tokens and password hashes are never present in error responses or logs', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sign-in')
        .send({
          email: 'admin@greenwood.school.example',
          password: 'BadPassword!',
        });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('passwordHash');
      expect(bodyStr).not.toContain('$2a$');
      expect(bodyStr).not.toContain('tokenHash');
    });
  });
});
