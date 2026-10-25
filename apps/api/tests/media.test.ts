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

describe('Media Library, Access-Controlled Storage, and Taxonomy Suite', () => {
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
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_DELETE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.TAXONOMY_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.TAXONOMY_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.AUDIT_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff / Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.MEDIA_READ);
    // Staff lacks MEDIA_DELETE & TAXONOMY_WRITE!

    // 2. Users and Memberships
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

    // Sessions
    const sessionAdminA = await authService.signIn(
      { email: 'admin@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminA = sessionAdminA.rawSessionToken;

    const sessionStaffA = await authService.signIn(
      { email: 'staff@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenStaffA = sessionStaffA.rawSessionToken;

    const sessionAdminB = await authService.signIn(
      { email: 'admin@greenwood.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminB = sessionAdminB.rawSessionToken;
  });

  describe('1. Media Upload and Accessibility Validation (WCAG 2.2 AA / FR-MEDIA-002)', () => {
    it('uploads a meaningful image with valid alternative text', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Campus Robotics Lab',
          altText: 'High school students assembling an autonomous rover in robotics laboratory',
          caption: 'Robotics team preparing for regional competition.',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileSizeBytes: 120400,
          storageKey: 'tenants/tenant-oxford-id/media/robotics.jpg',
          isPublic: true,
          isDecorative: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Campus Robotics Lab');
      expect(res.body.data.altText).toBe('High school students assembling an autonomous rover in robotics laboratory');
    });

    it('rejects a non-decorative image when alt text is missing or blank (WCAG 2.2 AA)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Campus Garden',
          altText: '   ', // Blank whitespace
          category: 'IMAGE',
          mimeType: 'image/png',
          fileSizeBytes: 54000,
          storageKey: 'tenants/tenant-oxford-id/media/garden.png',
          isDecorative: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Alternative text is required');
    });

    it('allows decorative images without alt text when isDecorative is true', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Decorative Background Flourish',
          category: 'IMAGE',
          mimeType: 'image/svg+xml',
          fileSizeBytes: 4200,
          storageKey: 'tenants/tenant-oxford-id/media/flourish.svg',
          isDecorative: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDecorative).toBe(true);
      expect(res.body.data.altText).toBeNull();
    });

    it('rejects unsupported MIME types with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Executable Script',
          mimeType: 'application/x-msdownload',
          fileSizeBytes: 1000,
          storageKey: 'tenants/tenant-oxford-id/media/virus.exe',
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Unsupported MIME type');
    });
  });

  describe('2. Access-Controlled Document Storage (FR-MEDIA-003)', () => {
    it('serves public media via public delivery router and sets caching headers', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Public Prospectus Brochure',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileSizeBytes: 890000,
          storageKey: 'tenants/tenant-oxford-id/media/public-prospectus.pdf',
          publicUrl: '/api/v1/tenant/public/media/public-prospectus.pdf',
          isPublic: true,
        });

      const mediaId = uploadRes.body.data.id;

      // Anonymous visitor request
      const resPublic = await request(app)
        .get(`/api/v1/tenant/public/media/${mediaId}`)
        .set('Host', 'oxford.localhost');

      expect(resPublic.status).toBe(200);
      expect(resPublic.headers['content-type']).toBe('application/pdf');
      expect(resPublic.headers['cache-control']).toContain('public');
    });

    it('strictly forbids anonymous access to private documents, returning 404', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Confidential Teacher Assessment',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileSizeBytes: 200000,
          storageKey: 'tenants/tenant-oxford-id/media/confidential.pdf',
          isPublic: false, // PRIVATE!
        });

      const mediaId = uploadRes.body.data.id;

      // Anonymous public attempt
      const resPublic = await request(app)
        .get(`/api/v1/tenant/public/media/${mediaId}`)
        .set('Host', 'oxford.localhost');

      expect(resPublic.status).toBe(404);
      expect(resPublic.body.error.code).toBe('MEDIA_NOT_FOUND');
    });

    it('allows authorized institutional members to download private documents', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Internal Audit Document',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileSizeBytes: 150000,
          storageKey: 'tenants/tenant-oxford-id/media/internal-audit.pdf',
          isPublic: false,
        });

      const mediaId = uploadRes.body.data.id;

      // Authenticated staff member requests via secure download route
      const resSecure = await request(app)
        .get(`/api/v1/tenant/cms/media/${mediaId}/file`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenStaffA}`);

      expect(resSecure.status).toBe(200);
      expect(resSecure.headers['content-type']).toBe('application/pdf');
      expect(resSecure.headers['cache-control']).toContain('private');
    });
  });

  describe('3. Multi-Tenant Isolation & Content Taxonomy', () => {
    it('strictly prevents Tenant B admin from modifying or deleting Tenant A media', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Oxford High School Photo',
          altText: 'Students walking in courtyard',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileSizeBytes: 65000,
          storageKey: 'tenants/tenant-oxford-id/media/courtyard.jpg',
          isPublic: true,
        });

      const mediaId = uploadRes.body.data.id;

      // Tenant B tries to delete Tenant A media
      const resDelete = await request(app)
        .delete(`/api/v1/tenant/cms/media/${mediaId}`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`);

      expect(resDelete.status).toBe(404);
    });

    it('manages content taxonomy categories and prevents duplicate slugs per tenant', async () => {
      // 1. Create Category
      const resCat = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          name: 'Athletics & Sports',
          slug: 'athletics-sports',
          type: 'GENERAL',
          description: 'Institutional sports teams and events',
        });

      expect(resCat.status).toBe(201);
      expect(resCat.body.data.slug).toBe('athletics-sports');

      // 2. Reject duplicate slug within same tenant
      const resDup = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          name: 'Another Sports',
          slug: 'athletics-sports',
        });

      expect(resDup.status).toBe(409);
      expect(resDup.body.error.code).toBe('CATEGORY_SLUG_ALREADY_EXISTS');

      // 3. Allow same slug in Tenant B
      const resCatB = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`)
        .send({
          name: 'Greenwood Sports',
          slug: 'athletics-sports',
        });

      expect(resCatB.status).toBe(201);
    });

    it('records immutable audit events for media lifecycle operations', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Audited Logo',
          category: 'LOGO',
          mimeType: 'image/png',
          fileSizeBytes: 24000,
          storageKey: 'tenants/tenant-oxford-id/media/audit-logo.png',
          isDecorative: true,
        });

      const mediaId = uploadRes.body.data.id;

      await request(app)
        .delete(`/api/v1/tenant/cms/media/${mediaId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      const logs = await auditRepo.findAuditLogs({
        tenantId: tenantA.id,
        page: 1,
        limit: 10,
        action: 'MEDIA_DELETED',
      });

      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].action).toBe('MEDIA_DELETED');
      expect(logs.items[0].entityId).toBe(mediaId);
    });
  });
});
