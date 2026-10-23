import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryCmsRepository } from '../src/repositories/cmsRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('CMS Content Model, Page Lifecycle, and Security Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

  // Test Tenants
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
    emailService = new InMemoryEmailService();
    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    cmsService = new CmsService(cmsRepo, auditRepo);

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
      emailService,
      authService,
      userAdminService,
      cmsService,
      envConfig: testEnvConfig,
    });

    // 1. Roles Setup
    const roleAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_PUBLISH);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.AUDIT_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff / Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.CMS_PAGES_WRITE);
    // Note: Staff intentionally lacks CMS_PAGES_PUBLISH!

    // 2. Users and Memberships
    // Admin A (Oxford)
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
    const sessionAdminA = await authService.signIn({ email: 'admin@oxford.edu', password: defaultPassword });
    tokenAdminA = sessionAdminA.rawSessionToken;

    // Staff A (Oxford)
    const userStaffA = await authRepo.createUser({
      email: 'teacher@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Teacher',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userStaffA.id, { emailVerifiedAt: new Date() });
    const memStaffA = await authRepo.createMembership({
      userId: userStaffA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaffA.id, roleStaff.id);
    const sessionStaffA = await authService.signIn({ email: 'teacher@oxford.edu', password: defaultPassword });
    tokenStaffA = sessionStaffA.rawSessionToken;

    // Admin B (Greenwood)
    const userAdminB = await authRepo.createUser({
      email: 'admin@greenwood.school.example',
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
    const sessionAdminB = await authService.signIn({ email: 'admin@greenwood.school.example', password: defaultPassword });
    tokenAdminB = sessionAdminB.rawSessionToken;
  });

  describe('1. Page Draft Creation and Input Validation', () => {
    it('creates a page draft with allowlisted sections and defaults to DRAFT status', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Admissions Overview',
          slug: 'admissions-overview',
          summary: 'Complete guide to admissions for the 2026/2027 academic year.',
          seoTitle: 'Admissions Overview | Oxford International',
          seoDescription: 'Learn how to apply to Oxford International School.',
          canonicalUrl: 'http://oxford.localhost:3000/admissions-overview',
          sections: [
            {
              sectionType: 'HERO',
              sortOrder: 0,
              isVisible: true,
              config: {
                headline: 'Join Our Community of Learners',
                subheadline: 'Applications now open for Years 1 through 12.',
                ctaText: 'Apply Online',
                ctaLink: '/admissions/apply',
              },
            },
            {
              sectionType: 'TEXT_CONTENT',
              sortOrder: 1,
              isVisible: true,
              config: {
                body: 'We welcome applications from motivated students worldwide.',
                alignment: 'left',
              },
            },
            {
              sectionType: 'FEATURE_GRID',
              sortOrder: 2,
              isVisible: true,
              config: {
                title: 'Application Steps',
                items: [
                  { title: 'Step 1: Submit Form', description: 'Complete the online application form.' },
                  { title: 'Step 2: Assessment', description: 'Attend an entrance interview or assessment.' },
                ],
              },
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Admissions Overview');
      expect(res.body.data.slug).toBe('admissions-overview');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.sections).toHaveLength(3);
      expect(res.body.data.sections[0].sectionType).toBe('HERO');
      expect(res.body.data.sections[0].config.headline).toBe('Join Our Community of Learners');

      // Verify draft is NOT returned via public content endpoint
      const pubRes = await request(app)
        .get('/api/v1/tenant/public/pages/admissions-overview')
        .set('Host', 'oxford.localhost');
      expect(pubRes.status).toBe(404);
      expect(pubRes.body.error.code).toBe('PAGE_NOT_FOUND');
    });

    it('rejects duplicate slugs within the same tenant with 409 SLUG_ALREADY_EXISTS', async () => {
      // 1. Create first page
      await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Campus Tour',
          slug: 'campus-tour',
          sections: [],
        });

      // 2. Attempt duplicate slug
      const dupRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Another Campus Tour',
          slug: 'campus-tour',
          sections: [],
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('allows identical slugs across different tenants without collision (BR-013)', async () => {
      // Oxford creates "campus-tour"
      const resA = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Oxford Campus Tour',
          slug: 'campus-tour',
          sections: [],
        });
      expect(resA.status).toBe(201);

      // Greenwood creates "campus-tour"
      const resB = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({
          title: 'Greenwood Campus Tour',
          slug: 'campus-tour',
          sections: [],
        });
      expect(resB.status).toBe(201);
      expect(resB.body.data.slug).toBe('campus-tour');
    });

    it('rejects invalid section configurations (missing headline, missing alt text)', async () => {
      const badHeroRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Broken Page',
          slug: 'broken-page',
          sections: [
            {
              sectionType: 'HERO',
              config: {}, // missing headline
            },
          ],
        });
      expect(badHeroRes.status).toBe(500); // Throws during config validation

      const badImageRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Broken Image Page',
          slug: 'broken-image-page',
          sections: [
            {
              sectionType: 'IMAGE_MEDIA',
              config: {
                imageUrl: 'https://example.com/photo.jpg',
                // missing altText required by WCAG 2.2 AA
              },
            },
          ],
        });
      expect(badImageRes.status).toBe(500);
    });

    it('rejects invalid slug formats (uppercase, spaces, special chars)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Invalid Slug Page',
          slug: 'INVALID SLUG!@#',
          sections: [],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Page Updating and Optimistic Concurrency', () => {
    it('updates an existing draft and increments its version', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Academics',
          slug: 'academics',
          sections: [],
        });
      const pageId = createRes.body.data.id;
      expect(createRes.body.data.version).toBe(1);

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Academics & Curricula',
          version: 1,
          sections: [
            {
              sectionType: 'TEXT_CONTENT',
              sortOrder: 0,
              isVisible: true,
              config: { body: 'Updated academic offerings.', alignment: 'left' },
            },
          ],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.title).toBe('Academics & Curricula');
      expect(updateRes.body.data.version).toBe(2);
      expect(updateRes.body.data.sections).toHaveLength(1);
    });

    it('rejects concurrent edits when supplied version is outdated (409 CONCURRENCY_CONFLICT)', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Facilities',
          slug: 'facilities',
          sections: [],
        });
      const pageId = createRes.body.data.id;

      // Editor 1 updates (moves version to 2)
      await request(app)
        .put(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ title: 'Facilities Update 1', version: 1 });

      // Editor 2 tries to update with stale version 1
      const staleRes = await request(app)
        .put(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ title: 'Facilities Update 2 (Stale)', version: 1 });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe('CONCURRENCY_CONFLICT');
    });
  });

  describe('3. Permission-Controlled Publishing & Public Routing', () => {
    it('allows an authorized editor with cms:pages:publish to publish a page', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'About Our Mission',
          slug: 'about-mission',
          summary: 'Our founding principles and commitment to educational excellence.',
          sections: [
            {
              sectionType: 'HERO',
              sortOrder: 0,
              isVisible: true,
              config: { headline: 'Shaping Bright Futures', subheadline: 'Excellence since 1995.' },
            },
          ],
        });
      const pageId = createRes.body.data.id;

      // Publish page
      const pubRes = await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('PUBLISHED');
      expect(pubRes.body.data.publishedAt).toBeDefined();

      // Verify the public content endpoint now returns the published content!
      const publicRes = await request(app)
        .get('/api/v1/tenant/public/pages/about-mission')
        .set('Host', 'oxford.localhost');

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.success).toBe(true);
      expect(publicRes.body.data.title).toBe('About Our Mission');
      expect(publicRes.body.data.slug).toBe('about-mission');
      expect(publicRes.body.data.sections).toHaveLength(1);
      expect(publicRes.body.data.sections[0].config.headline).toBe('Shaping Bright Futures');

      // Verify private fields are NOT leaked in public response
      expect(publicRes.body.data.authorId).toBeUndefined();
      expect(publicRes.body.data.lastEditorId).toBeUndefined();
      expect(publicRes.body.data.version).toBeUndefined();
      expect(publicRes.body.data.tenantId).toBeUndefined();
    });

    it('denies staff without cms:pages:publish permission from publishing (403)', async () => {
      // Staff creates draft (permitted with cms:pages:write)
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenStaffA}`)
        .send({
          title: 'Staff Authored Draft',
          slug: 'staff-authored-draft',
          sections: [],
        });
      expect(createRes.status).toBe(201);
      const pageId = createRes.body.data.id;

      // Staff attempts to publish (forbidden)
      const pubRes = await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenStaffA}`)
        .send({});

      expect(pubRes.status).toBe(403);
      expect(pubRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('does not serve future-scheduled pages to public visitors early (BR-002, FR-CMS-006)', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Future Gala Announcement',
          slug: 'future-gala',
          sections: [
            {
              sectionType: 'TEXT_CONTENT',
              sortOrder: 0,
              isVisible: true,
              config: { body: 'Join us next month for our gala.', alignment: 'center' },
            },
          ],
        });
      const pageId = createRes.body.data.id;

      // Publish with future date (tomorrow)
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const pubRes = await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ scheduledPublishAt: futureDate });

      expect(pubRes.status).toBe(200);

      // Public visitor requests page -> 404 because publish date is in the future
      const publicRes = await request(app)
        .get('/api/v1/tenant/public/pages/future-gala')
        .set('Host', 'oxford.localhost');

      expect(publicRes.status).toBe(404);
      expect(publicRes.body.error.code).toBe('PAGE_NOT_FOUND');
    });

    it('archives a published page and immediately removes it from public routing', async () => {
      // 1. Create and publish
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Spring Term Schedule',
          slug: 'spring-term-schedule',
          sections: [],
        });
      const pageId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      // Verified public
      const beforeArchive = await request(app)
        .get('/api/v1/tenant/public/pages/spring-term-schedule')
        .set('Host', 'oxford.localhost');
      expect(beforeArchive.status).toBe(200);

      // 2. Archive page
      const archiveRes = await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/archive`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe('ARCHIVED');
      expect(archiveRes.body.data.archivedAt).toBeDefined();

      // 3. Public request now returns 404
      const afterArchive = await request(app)
        .get('/api/v1/tenant/public/pages/spring-term-schedule')
        .set('Host', 'oxford.localhost');
      expect(afterArchive.status).toBe(404);
      expect(afterArchive.body.error.code).toBe('PAGE_NOT_FOUND');
    });
  });

  describe('4. Strict Cross-Tenant Isolation & Security', () => {
    it('strictly prevents Tenant B Admin from viewing or updating Tenant A pages', async () => {
      // Oxford creates a private page
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Oxford Confidential Strategy',
          slug: 'oxford-confidential-strategy',
          sections: [],
        });
      const pageId = createRes.body.data.id;

      // Greenwood admin attempts to read Oxford page via Greenwood domain
      const crossRead = await request(app)
        .get(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`);

      expect(crossRead.status).toBe(404); // Page belongs to Oxford, not found in Greenwood
      expect(crossRead.body.error.code).toBe('PAGE_NOT_FOUND');

      // Greenwood admin attempts to update Oxford page via Greenwood domain
      const crossUpdate = await request(app)
        .put(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({ title: 'Hacked Title' });

      expect(crossUpdate.status).toBe(404);
      expect(crossUpdate.body.error.code).toBe('PAGE_NOT_FOUND');

      // Greenwood admin attempts to access Oxford domain directly -> 403 (membership required)
      const directCross = await request(app)
        .get(`/api/v1/tenant/cms/pages/${pageId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`);

      expect(directCross.status).toBe(403);
      expect(directCross.body.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
    });

    it('safely rejects spoofed x-tenant-id headers and resolves strictly by Host', async () => {
      const spoofRes = await request(app)
        .get('/api/v1/tenant/cms/pages')
        .set('Host', 'unregistered.localhost')
        .set('x-tenant-id', 'tenant-oxford-id')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(spoofRes.status).toBe(404);
      expect(spoofRes.body.error.code).toBe('INSTITUTION_NOT_FOUND');
    });

    it('rejects unauthenticated requests to CMS admin endpoints with 401', async () => {
      const unauthRes = await request(app)
        .get('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost');

      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('records immutable audit events for page creation, publication, and archival', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Audited Page',
          slug: 'audited-page',
          sections: [],
        });
      const pageId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/archive`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      // Query audit logs for Oxford
      const auditRes = await request(app)
        .get('/api/v1/tenant/admin/audit')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(auditRes.status).toBe(200);
      const actions = auditRes.body.data.items.map((i: any) => i.action);
      expect(actions).toContain('PAGE_CREATED');
      expect(actions).toContain('PAGE_PUBLISHED');
      expect(actions).toContain('PAGE_ARCHIVED');
    });
  });
});
