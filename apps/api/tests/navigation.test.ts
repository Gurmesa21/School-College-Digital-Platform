import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryCmsRepository } from '../src/repositories/cmsRepository.js';
import { InMemoryNavigationRepository } from '../src/repositories/navigationRepository.js';
import { InMemoryMediaRepository } from '../src/repositories/mediaRepository.js';
import { InMemoryTaxonomyRepository } from '../src/repositories/taxonomyRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { NavigationService } from '../src/services/navigationService.js';
import { MediaService } from '../src/services/mediaService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Navigation Menus and Hierarchy Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let navRepo: InMemoryNavigationRepository;
  let mediaRepo: InMemoryMediaRepository;
  let taxRepo: InMemoryTaxonomyRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let navService: NavigationService;
  let mediaService: MediaService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

  const tenantA: ResolvedTenant = {
    id: 'tenant-oxford-id',
    slug: 'oxford',
    name: 'Oxford International School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'UTC',
    defaultLocale: 'en',
    contactEmail: 'admin@oxford.school.example',
    matchedHostname: 'oxford.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const tenantB: ResolvedTenant = {
    id: 'tenant-greenwood-id',
    slug: 'greenwood',
    name: 'Greenwood Secondary School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'secondary.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  let tokenAdminA: string;
  let tokenStaffA: string;
  let tokenAdminB: string;

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantA, domains: ['oxford.localhost'] },
      { tenant: tenantB, domains: ['secondary.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    cmsRepo = new InMemoryCmsRepository();
    navRepo = new InMemoryNavigationRepository();
    mediaRepo = new InMemoryMediaRepository();
    taxRepo = new InMemoryTaxonomyRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    cmsService = new CmsService(cmsRepo, auditRepo);
    navService = new NavigationService(navRepo, auditRepo);
    mediaService = new MediaService(mediaRepo, auditRepo);

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
      cmsRepository: cmsRepo,
      navigationRepository: navRepo,
      mediaRepository: mediaRepo,
      taxonomyRepository: taxRepo,
      emailService,
      authService,
      userAdminService,
      cmsService,
      navigationService: navService,
      mediaService,
      envConfig: testEnvConfig,
    });

    // 1. Roles Setup
    const roleAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_NAVIGATION_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_NAVIGATION_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.AUDIT_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff / Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.CMS_NAVIGATION_READ);
    // Staff lacks CMS_NAVIGATION_WRITE!

    // 2. Users and Memberships
    // Admin A
    const userAdminA = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminA.id, { emailVerifiedAt: new Date() });
    const memAdminA = await authRepo.createMembership({
      userId: userAdminA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminA.id, roleAdmin.id);

    // Staff A
    const userStaffA = await authRepo.createUser({
      email: 'staff@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Staff',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userStaffA.id, { emailVerifiedAt: new Date() });
    const memStaffA = await authRepo.createMembership({
      userId: userStaffA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaffA.id, roleStaff.id);

    // Admin B
    const userAdminB = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Greenwood',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminB.id, { emailVerifiedAt: new Date() });
    const memAdminB = await authRepo.createMembership({
      userId: userAdminB.id,
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminB.id, roleAdmin.id);

    // Establish sessions
    const sessionAdminA = await authService.signIn(
      { email: 'admin@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest Agent' }
    );
    tokenAdminA = sessionAdminA.rawSessionToken;

    const sessionStaffA = await authService.signIn(
      { email: 'staff@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest Agent' }
    );
    tokenStaffA = sessionStaffA.rawSessionToken;

    const sessionAdminB = await authService.signIn(
      { email: 'admin@greenwood.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest Agent' }
    );
    tokenAdminB = sessionAdminB.rawSessionToken;
  });

  describe('1. Navigation Menu & Item Administration', () => {
    it('creates or updates a navigation menu and adds items', async () => {
      // 1. Create or update HEADER menu
      const resMenu = await request(app)
        .put('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ title: 'Main Oxford Header', isPublished: true });

      expect(resMenu.status).toBe(200);
      expect(resMenu.body.success).toBe(true);
      expect(resMenu.body.data.location).toBe('HEADER');
      expect(resMenu.body.data.title).toBe('Main Oxford Header');

      // 2. Add menu item "Home"
      const resItem1 = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Home', url: '/', target: '_self', order: 0 });

      expect(resItem1.status).toBe(201);
      expect(resItem1.body.data.label).toBe('Home');
      expect(resItem1.body.data.url).toBe('/');

      // 3. Add menu item "Admissions"
      const resItem2 = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Admissions', url: '/admissions', target: '_self', order: 1 });

      expect(resItem2.status).toBe(201);
      expect(resItem2.body.data.label).toBe('Admissions');

      // 4. List menus
      const resList = await request(app)
        .get('/api/v1/tenant/cms/navigation')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data.length).toBe(1);
      expect(resList.body.data[0].items.length).toBe(2);
    });

    it('supports hierarchical nested menu items (parent-child dropdowns)', async () => {
      const resMenu = await request(app)
        .put('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ title: 'Header with Dropdowns', isPublished: true });

      const resParent = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Academics', url: '/academics', target: '_self', order: 0 });

      const parentId = resParent.body.data.id;

      // Add child under Academics
      const resChild = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Primary Curriculum', url: '/academics/primary', parentId, order: 0 });

      expect(resChild.status).toBe(201);
      expect(resChild.body.data.parentId).toBe(parentId);

      // Verify hierarchy returned in menu query
      const resGet = await request(app)
        .get('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.items.length).toBe(1);
      expect(resGet.body.data.items[0].label).toBe('Academics');
      expect(resGet.body.data.items[0].children.length).toBe(1);
      expect(resGet.body.data.items[0].children[0].label).toBe('Primary Curriculum');
    });

    it('updates a menu item label, target, and visibility', async () => {
      const resItem = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Portal', url: '/portal', target: '_self', isVisible: true });

      const itemId = resItem.body.data.id;

      const resUpdate = await request(app)
        .put(`/api/v1/tenant/cms/navigation/items/${itemId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Family Portal', target: '_blank', isVisible: false });

      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.data.label).toBe('Family Portal');
      expect(resUpdate.body.data.target).toBe('_blank');
      expect(resUpdate.body.data.isVisible).toBe(false);
    });

    it('reorders navigation items', async () => {
      const res1 = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Item 1', url: '/1', order: 0 });

      const res2 = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Item 2', url: '/2', order: 1 });

      const id1 = res1.body.data.id;
      const id2 = res2.body.data.id;

      // Swap orders
      const resReorder = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/reorder')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          items: [
            { id: id1, order: 1 },
            { id: id2, order: 0 },
          ],
        });

      expect(resReorder.status).toBe(200);

      const resMenu = await request(app)
        .get('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(resMenu.body.data.items[0].id).toBe(id2);
      expect(resMenu.body.data.items[1].id).toBe(id1);
    });

    it('deletes a navigation menu item', async () => {
      const resItem = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Temporary Link', url: '/temp' });

      const itemId = resItem.body.data.id;

      const resDel = await request(app)
        .delete(`/api/v1/tenant/cms/navigation/items/${itemId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(resDel.status).toBe(200);

      const resGet = await request(app)
        .get('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      const found = resGet.body.data.items.find((i: any) => i.id === itemId);
      expect(found).toBeUndefined();
    });
  });

  describe('2. Public Navigation Delivery', () => {
    it('serves published navigation menus and visible items to anonymous visitors', async () => {
      await request(app)
        .put('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ title: 'Public Header', isPublished: true });

      await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Public Home', url: '/', isVisible: true, order: 0 });

      await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Internal Staff Link', url: '/internal', isVisible: false, order: 1 });

      // Public request without authentication cookies
      const resPublic = await request(app)
        .get('/api/v1/tenant/public/navigation/HEADER')
        .set('Host', 'oxford.localhost');

      expect(resPublic.status).toBe(200);
      expect(resPublic.body.success).toBe(true);
      expect(resPublic.body.data.items.length).toBe(1);
      expect(resPublic.body.data.items[0].label).toBe('Public Home');
    });

    it('returns 404 when requesting an unpublished menu publicly', async () => {
      await request(app)
        .put('/api/v1/tenant/cms/navigation/FOOTER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ title: 'Unpublished Footer', isPublished: false });

      const resPublic = await request(app)
        .get('/api/v1/tenant/public/navigation/FOOTER')
        .set('Host', 'oxford.localhost');

      expect(resPublic.status).toBe(404);
    });
  });

  describe('3. Security, RBAC & Multi-Tenant Isolation', () => {
    it('rejects unauthenticated requests to administration endpoints with 401', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/cms/navigation')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(401);
    });

    it('denies staff without cms:navigation:write from modifying menus with 403', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenStaffA}`)
        .send({ label: 'Hacked Link', url: '/hack' });

      expect(res.status).toBe(403);
    });

    it('strictly prevents Tenant B admin from modifying Tenant A navigation (BR-001)', async () => {
      // 1. Create item in Tenant A
      const resItemA = await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Oxford Only', url: '/oxford-only' });

      const itemAId = resItemA.body.data.id;

      // 2. Tenant B admin tries to delete Tenant A item
      const resCrossDel = await request(app)
        .delete(`/api/v1/tenant/cms/navigation/items/${itemAId}`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`);

      expect(resCrossDel.status).toBe(404);

      // 3. Verify item still exists in Tenant A
      const resCheck = await request(app)
        .get('/api/v1/tenant/cms/navigation/HEADER')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      const found = resCheck.body.data.items.find((i: any) => i.id === itemAId);
      expect(found).toBeDefined();
    });

    it('records immutable audit events for navigation changes', async () => {
      await request(app)
        .post('/api/v1/tenant/cms/navigation/HEADER/items')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ label: 'Audited Link', url: '/audit-test' });

      const logs = await auditRepo.findAuditLogs({
        tenantId: tenantA.id,
        page: 1,
        limit: 10,
        action: 'NAVIGATION_ITEM_CREATED',
      });

      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].action).toBe('NAVIGATION_ITEM_CREATED');
      expect(logs.items[0].actorEmail).toBe('admin@oxford.edu');
    });
  });
});
