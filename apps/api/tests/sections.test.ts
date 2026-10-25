import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryCmsRepository } from '../src/repositories/cmsRepository.js';
import { InMemorySectionRepository } from '../src/repositories/sectionRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { SectionService } from '../src/services/sectionService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 8 Reusable CMS Sections, Layout Composition, and Tenant Isolation Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let sectionRepo: InMemorySectionRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let sectionService: SectionService;
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
  let tokenViewerA: string;
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
    sectionRepo = new InMemorySectionRepository([], cmsRepo.sections);
    cmsRepo.setSectionRepository(sectionRepo);
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    cmsService = new CmsService(cmsRepo, auditRepo);
    sectionService = new SectionService(sectionRepo, auditRepo);

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
      sectionRepository: sectionRepo,
      emailService,
      authService,
      userAdminService,
      cmsService,
      sectionService,
      envConfig: testEnvConfig,
    });

    // 1. Roles Setup
    const roleAdmin = await authRepo.createRole({
      name: 'CMS_ADMIN',
      displayName: 'CMS Administrator',
      description: 'Full CMS permissions',
      isSystem: true,
      tenantId: tenantA.id,
    });
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_PAGES_PUBLISH);

    const roleViewer = await authRepo.createRole({
      name: 'CMS_VIEWER',
      displayName: 'CMS Viewer',
      description: 'Read only access to CMS',
      isSystem: true,
      tenantId: tenantA.id,
    });
    await authRepo.assignPermissionToRole(roleViewer.id, PERMISSIONS.CMS_PAGES_READ);

    const roleAdminB = await authRepo.createRole({
      name: 'CMS_ADMIN_B',
      displayName: 'Greenwood CMS Admin',
      description: 'CMS admin for Tenant B',
      isSystem: true,
      tenantId: tenantB.id,
    });
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.CMS_PAGES_WRITE);

    // 2. Users & Memberships Setup
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

    const userViewerA = await authRepo.createUser({
      email: 'viewer@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Viewer',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userViewerA.id, { emailVerifiedAt: new Date() });
    const memViewerA = await authRepo.createMembership({
      userId: userViewerA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memViewerA.id, roleViewer.id);

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
    await authRepo.assignRoleToMembership(memAdminB.id, roleAdminB.id);

    // 3. Issue Authentic Session Tokens via AuthService
    const sessionAdminA = await authService.signIn({ email: 'admin@oxford.edu', password: defaultPassword });
    tokenAdminA = sessionAdminA.rawSessionToken;

    const sessionViewerA = await authService.signIn({ email: 'viewer@oxford.edu', password: defaultPassword });
    tokenViewerA = sessionViewerA.rawSessionToken;

    const sessionAdminB = await authService.signIn({ email: 'admin@greenwood.edu', password: defaultPassword });
    tokenAdminB = sessionAdminB.rawSessionToken;
  });

  describe('1. Reusable Section CRUD Operations', () => {
    it('creates a reusable CTA_BANNER section successfully with audit logging', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Spring Admissions CTA',
          slug: 'spring-admissions-cta',
          description: 'Call to action for spring cohort enrollment',
          sectionType: 'CTA_BANNER',
          category: 'Admissions',
          isGlobal: true,
          config: {
            headline: 'Apply for the Spring 2027 Cohort',
            subheadline: 'Limited places remaining across academic programmes.',
            primaryButtonText: 'Apply Online',
            primaryButtonUrl: '/admissions',
            theme: 'primary',
            alignment: 'center',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.slug).toBe('spring-admissions-cta');
      expect(res.body.data.sectionType).toBe('CTA_BANNER');

      // Verify Audit Log
      const auditRes = await auditRepo.findAuditLogs({ page: 1, limit: 10 });
      const createdLog = auditRes.items.find((l) => l.action === 'cms:section:create');
      expect(createdLog).toBeDefined();
      expect(createdLog?.entityId).toBe(res.body.data.id);
    });

    it('rejects creation if slug already exists in the same tenant', async () => {
      await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Duplicate CTA',
          slug: 'duplicate-cta',
          sectionType: 'CTA_BANNER',
          config: {
            headline: 'Original Banner',
            primaryButtonText: 'Click',
            primaryButtonUrl: '/link',
          },
        });

      const res = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Another Section Same Slug',
          slug: 'duplicate-cta',
          sectionType: 'CTA_BANNER',
          config: {
            headline: 'Duplicate Banner',
            primaryButtonText: 'Click',
            primaryButtonUrl: '/link',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('validates configuration schemas and rejects invalid payloads', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Invalid Accordion Section',
          slug: 'invalid-accordion',
          sectionType: 'ACCORDION',
          config: {
            // Missing title or invalid items
            items: 'not-an-array',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('lists reusable sections with query filtering by category and search keyword', async () => {
      // Seed 2 sections
      await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'STEM Faculty Highlights',
          slug: 'stem-highlights',
          sectionType: 'FEATURE_GRID',
          category: 'Academics',
          config: { title: 'STEM', items: [{ title: 'Robotics', description: 'Lab' }] },
        });

      await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Financial Aid FAQ',
          slug: 'financial-aid-faq',
          sectionType: 'ACCORDION',
          category: 'Admissions',
          config: {
            title: 'Financial Aid Questions',
            items: [{ title: 'Q1', content: 'A1' }],
          },
        });

      // Filter by category: Academics
      const resCategory = await request(app)
        .get('/api/v1/tenant/cms/sections?category=Academics')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(resCategory.status).toBe(200);
      expect(resCategory.body.data.items.length).toBe(1);
      expect(resCategory.body.data.items[0].slug).toBe('stem-highlights');

      // Filter by search keyword
      const resSearch = await request(app)
        .get('/api/v1/tenant/cms/sections?search=financial')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.items.length).toBe(1);
      expect(resSearch.body.data.items[0].slug).toBe('financial-aid-faq');
    });

    it('updates a reusable section and updates its config', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Campus Stats',
          slug: 'campus-stats',
          sectionType: 'STATS_COUNTER',
          category: 'General',
          config: {
            title: 'Initial Title',
            items: [{ value: '95%', label: 'Pass Rate' }],
          },
        });

      const sectionId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Updated Campus Stats',
          config: {
            title: 'Updated Statistics Title',
            items: [{ value: '99%', label: 'Pass Rate' }],
          },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Updated Campus Stats');
      expect(updateRes.body.data.config.title).toBe('Updated Statistics Title');
      expect(updateRes.body.data.config.items[0].value).toBe('99%');
    });

    it('deletes a reusable section successfully', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Temporary Section',
          slug: 'temp-section',
          sectionType: 'TEXT_CONTENT',
          config: { body: 'Temporary note' },
        });

      const sectionId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('2. Security, RBAC & Multi-Tenant Isolation', () => {
    it('prevents unauthenticated access to reusable sections admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(401);
    });

    it('denies creation if user lacks CMS_PAGES_WRITE permission', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .send({
          name: 'Unauthorized Section',
          slug: 'unauth-sec',
          sectionType: 'CTA_BANNER',
          config: { headline: 'Test', primaryButtonText: 'Test', primaryButtonUrl: '/test' },
        });

      expect(res.status).toBe(403);
    });

    it('enforces strict tenant isolation: Tenant B admin cannot read or mutate Tenant A sections', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Oxford Exclusive Section',
          slug: 'oxford-exclusive',
          sectionType: 'HERO',
          config: { headline: 'Exclusive to Oxford' },
        });

      const sectionId = createRes.body.data.id;

      // Tenant B admin attempts to read Oxford section
      const readRes = await request(app)
        .get(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`);

      expect(readRes.status).toBe(404);

      // Tenant B admin attempts to update Oxford section
      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({ name: 'Hacked Section' });

      expect(updateRes.status).toBe(404);

      // Tenant B admin attempts to delete Oxford section
      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/sections/${sectionId}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`);

      expect(deleteRes.status).toBe(404);
    });

    it('permits identical slugs across different tenants without collision', async () => {
      const resA = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Common Campus CTA',
          slug: 'campus-cta',
          sectionType: 'CTA_BANNER',
          config: { headline: 'Oxford CTA', primaryButtonText: 'Apply', primaryButtonUrl: '/apply' },
        });

      const resB = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminB}`)
        .send({
          name: 'Greenwood Campus CTA',
          slug: 'campus-cta',
          sectionType: 'CTA_BANNER',
          config: { headline: 'Greenwood CTA', primaryButtonText: 'Apply', primaryButtonUrl: '/apply' },
        });

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      expect(resA.body.data.id).not.toBe(resB.body.data.id);
    });
  });

  describe('3. CO-PE Live Section Synchronization and Page Placement (FR-CMS-004)', () => {
    it('synchronizes master reusable section edits immediately to all embedding pages and public SSR', async () => {
      // 1. Create master reusable section
      const sectionRes = await request(app)
        .post('/api/v1/tenant/cms/sections')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Centralized Tour Banner',
          slug: 'central-tour-banner',
          sectionType: 'CTA_BANNER',
          category: 'Admissions',
          config: {
            headline: 'Original Headline: Visit Us in October',
            subheadline: 'Book a campus tour now.',
            primaryButtonText: 'Book Tour',
            primaryButtonUrl: '/contact',
            theme: 'primary',
            alignment: 'center',
          },
        });

      const masterSectionId = sectionRes.body.data.id;

      // 2. Create Page embedding the reusable section
      const pageRes = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          title: 'Admissions Welcome',
          slug: 'admissions-welcome',
          summary: 'Admissions landing page with reusable banner',
          sections: [
            {
              sectionType: 'HERO',
              sortOrder: 0,
              isVisible: true,
              config: { headline: 'Welcome to Admissions' },
            },
            {
              sectionType: 'CTA_BANNER',
              sortOrder: 1,
              isVisible: true,
              reusableSectionId: masterSectionId,
              config: { headline: 'Stale snapshot' }, // Even if an old snapshot was provided, live resolution overrides
            },
          ],
        });

      expect(pageRes.status).toBe(201);
      const pageId = pageRes.body.data.id;

      // Publish the page
      await request(app)
        .post(`/api/v1/tenant/cms/pages/${pageId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({});

      // 3. Check Placements endpoint
      const placementsRes = await request(app)
        .get(`/api/v1/tenant/cms/sections/${masterSectionId}/placements`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(placementsRes.status).toBe(200);
      expect(placementsRes.body.data.length).toBe(1);
      expect(placementsRes.body.data[0].pageSlug).toBe('admissions-welcome');

      // 4. Verify initial public SSR page returns live section config
      const publicRes1 = await request(app)
        .get('/api/v1/tenant/public/pages/admissions-welcome')
        .set('Host', 'oxford.localhost');

      expect(publicRes1.status).toBe(200);
      const publicBanner1 = publicRes1.body.data.sections.find(
        (s: any) => s.reusableSectionId === masterSectionId
      );
      expect(publicBanner1).toBeDefined();
      expect(publicBanner1.config.headline).toBe('Original Headline: Visit Us in October');

      // 5. Update the Master Reusable Section
      const updateSectionRes = await request(app)
        .put(`/api/v1/tenant/cms/sections/${masterSectionId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          name: 'Updated Centralized Tour Banner',
          config: {
            headline: 'LIVE UPDATED: Visit Us in November for Open Week!',
            subheadline: 'Exclusive tours and faculty sessions.',
            primaryButtonText: 'Register Now',
            primaryButtonUrl: '/open-week',
            theme: 'primary',
            alignment: 'center',
          },
        });

      expect(updateSectionRes.status).toBe(200);

      // 6. Assert public page immediately yields the updated headline without re-publishing page
      const publicRes2 = await request(app)
        .get('/api/v1/tenant/public/pages/admissions-welcome')
        .set('Host', 'oxford.localhost');

      expect(publicRes2.status).toBe(200);
      const publicBanner2 = publicRes2.body.data.sections.find(
        (s: any) => s.reusableSectionId === masterSectionId
      );
      expect(publicBanner2).toBeDefined();
      expect(publicBanner2.config.headline).toBe('LIVE UPDATED: Visit Us in November for Open Week!');
      expect(publicBanner2.config.primaryButtonText).toBe('Register Now');
    });
  });
});
