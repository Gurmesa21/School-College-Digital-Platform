import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryAnalyticsRepository } from '../src/repositories/analyticsRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { AnalyticsService } from '../src/services/analyticsService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 17 Suite — Privacy-Aware Analytics & Admin Overviews (FR-ANL-001, BR-001, BR-009)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let analyticsRepo: InMemoryAnalyticsRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let analyticsService: AnalyticsService;

  let app: ReturnType<typeof createApp>;

  const tenantOxford: ResolvedTenant = {
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

  const tenantGreenwood: ResolvedTenant = {
    id: 'tenant-greenwood-id',
    slug: 'greenwood',
    name: 'Greenwood Secondary School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'UTC',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'greenwood.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const defaultPassword = 'StrongPassword123!';
  let defaultPasswordHash: string;

  let adminCookie: string | string[];
  let staffCookie: string | string[];
  let greenwoodAdminCookie: string | string[];

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost', 'oxford.local'] },
      { tenant: tenantGreenwood, domains: ['greenwood.localhost', 'greenwood.local'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    analyticsRepo = new InMemoryAnalyticsRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    analyticsService = new AnalyticsService(analyticsRepo, auditRepo);

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
      analyticsRepository: analyticsRepo,
      analyticsService,
      authService,
      userAdminService,
      emailService,
      envConfig: testEnvConfig,
    });

    // 1. Roles
    const adminRole = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(adminRole.id, PERMISSIONS.USERS_READ);
    await authRepo.assignPermissionToRole(adminRole.id, PERMISSIONS.AUDIT_READ);
    await authRepo.assignPermissionToRole(adminRole.id, PERMISSIONS.ANALYTICS_VIEW);

    const staffRole = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'General Staff',
      isSystem: true,
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(staffRole.id, PERMISSIONS.USERS_READ);
    // Note: STAFF does NOT have PERMISSIONS.ANALYTICS_VIEW

    const greenwoodAdminRole = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Greenwood Administrator',
      isSystem: true,
      tenantId: tenantGreenwood.id,
    });
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.ANALYTICS_VIEW);

    // 2. Users & Memberships
    // Oxford Admin
    const userAdmin = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Admin',
      status: 'ACTIVE',
    });
    const memAdmin = await authRepo.createMembership({
      userId: userAdmin.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdmin.id, adminRole.id);

    // Oxford Staff
    const userStaff = await authRepo.createUser({
      email: 'staff@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Staff',
      status: 'ACTIVE',
    });
    const memStaff = await authRepo.createMembership({
      userId: userStaff.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaff.id, staffRole.id);

    // Greenwood Admin
    const userGreenwood = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Admin',
      status: 'ACTIVE',
    });
    const memGreenwood = await authRepo.createMembership({
      userId: userGreenwood.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memGreenwood.id, greenwoodAdminRole.id);

    // 3. Sign in to obtain session cookies
    const adminSignInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'admin@oxford.edu',
        password: defaultPassword,
      });
    adminCookie = adminSignInRes.headers['set-cookie'];

    const staffSignInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'staff@oxford.edu',
        password: defaultPassword,
      });
    staffCookie = staffSignInRes.headers['set-cookie'];

    const greenwoodSignInRes = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({
        email: 'admin@greenwood.edu',
        password: defaultPassword,
      });
    greenwoodAdminCookie = greenwoodSignInRes.headers['set-cookie'];
  });

  describe('1. Public Anonymous Analytics Event Ingestion (FR-ANL-001, NFR-PRIV-001)', () => {
    it('records a valid PAGE_VIEW event anonymously with data minimization', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0')
        .send({
          eventType: 'PAGE_VIEW',
          path: '/academics/cambridge-igcse?ref=nav#curriculum',
          referrerDomain: 'https://www.google.com/search?q=oxford+school',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recorded).toBe(true);

      expect(analyticsRepo.events.length).toBe(1);
      const recorded = analyticsRepo.events[0];
      expect(recorded.tenantId).toBe(tenantOxford.id);
      expect(recorded.eventType).toBe('PAGE_VIEW');
      expect(recorded.path).toBe('/academics/cambridge-igcse'); // Cleaned path, query params stripped
      expect(recorded.referrerDomain).toBe('www.google.com'); // Stripped to domain only
      expect(recorded.deviceCategory).toBe('desktop');
    });

    it('records valid SEARCH, ENQUIRY_SUBMIT, and DOCUMENT_DOWNLOAD events', async () => {
      // SEARCH event
      const resSearch = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'SEARCH',
          entityType: 'SEARCH',
          entityId: 'PROGRAMME',
          path: '/search',
          metadata: { resultsCount: 3, type: 'PROGRAMME' },
        });
      expect(resSearch.status).toBe(201);

      // ENQUIRY_SUBMIT event
      const resEnquiry = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'ENQUIRY_SUBMIT',
          entityType: 'FORM',
          entityId: 'contact-us',
          path: '/forms/contact-us',
          metadata: { category: 'ADMISSIONS' },
        });
      expect(resEnquiry.status).toBe(201);

      // DOCUMENT_DOWNLOAD event
      const resDoc = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'DOCUMENT_DOWNLOAD',
          entityType: 'DOCUMENT',
          entityId: 'asset-prospectus-2026',
          path: '/documents/asset-prospectus-2026',
        });
      expect(resDoc.status).toBe(201);

      expect(analyticsRepo.events.length).toBe(3);
    });

    it('rejects malformed payloads missing mandatory eventType or path with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          // Missing eventType and path
          entityType: 'PAGE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_EVENT_PAYLOAD');
    });

    it('rejects invalid eventType not in approved taxonomy with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'MALICIOUS_CUSTOM_TRACKER',
          path: '/home',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects payload with personal identifiers in metadata to enforce privacy minimization', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'PAGE_VIEW',
          path: '/welcome',
          metadata: {
            visitorEmail: 'sensitive.parent@example.com', // Prohibited PII
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Analytics metadata must not contain personal identifiers');
    });

    it('rejects requests with unmapped hostname with 404', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'unmapped-institution.com')
        .send({
          eventType: 'PAGE_VIEW',
          path: '/welcome',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('2. Protected Administrative Overview & Aggregations (FR-ANL-001, BR-003)', () => {
    beforeEach(async () => {
      // Seed representative events across multiple days for Oxford
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;

      // 5 page views yesterday
      for (let i = 0; i < 5; i++) {
        await analyticsRepo.recordEvent({
          tenantId: tenantOxford.id,
          eventType: 'PAGE_VIEW',
          path: '/academics',
          deviceCategory: 'desktop',
          referrerDomain: 'google.com',
          createdAt: new Date(now.getTime() - oneDay),
        });
      }

      // 3 page views today on programme
      for (let i = 0; i < 3; i++) {
        await analyticsRepo.recordEvent({
          tenantId: tenantOxford.id,
          eventType: 'PAGE_VIEW',
          entityType: 'PROGRAMME',
          entityId: 'cambridge-igcse',
          path: '/academics/cambridge-igcse',
          deviceCategory: 'mobile',
          referrerDomain: 'bing.com',
          createdAt: now,
        });
      }

      // 2 searches
      for (let i = 0; i < 2; i++) {
        await analyticsRepo.recordEvent({
          tenantId: tenantOxford.id,
          eventType: 'SEARCH',
          path: '/search',
          createdAt: now,
        });
      }

      // 1 enquiry submit
      await analyticsRepo.recordEvent({
        tenantId: tenantOxford.id,
        eventType: 'ENQUIRY_SUBMIT',
        entityType: 'FORM',
        entityId: 'contact',
        path: '/forms/contact',
        createdAt: now,
      });

      // 1 document download
      await analyticsRepo.recordEvent({
        tenantId: tenantOxford.id,
        eventType: 'DOCUMENT_DOWNLOAD',
        entityType: 'DOCUMENT',
        entityId: 'prospectus-pdf',
        path: '/documents/prospectus-pdf',
        createdAt: now,
      });
    });

    it('rejects unauthenticated requests to analytics overview with 401', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(401);
    });

    it('rejects authenticated users lacking analytics:view permission with 403', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview')
        .set('Host', 'oxford.localhost')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('allows authorized tenant admin to view analytics overview and accurate metrics', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview?period=7d')
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.period.days).toBe(7);
      expect(data.metrics.totalPageViews).toBe(8); // 5 yesterday + 3 today
      expect(data.metrics.uniquePaths).toBe(2); // /academics and /academics/cambridge-igcse
      expect(data.metrics.totalSearches).toBe(2);
      expect(data.metrics.totalEnquiries).toBe(1);
      expect(data.metrics.totalDocumentDownloads).toBe(1);

      // Top pages
      expect(data.topPages.length).toBeGreaterThanOrEqual(2);
      expect(data.topPages[0].path).toBe('/academics');
      expect(data.topPages[0].views).toBe(5);

      // Device breakdown
      const desktop = data.deviceBreakdown.find((d: any) => d.category === 'desktop');
      const mobile = data.deviceBreakdown.find((d: any) => d.category === 'mobile');
      expect(desktop).toBeDefined();
      expect(mobile).toBeDefined();

      // Operational content inventory
      expect(data.contentInventory).toBeDefined();
      expect(typeof data.contentInventory.publishedPages).toBe('number');
      expect(typeof data.contentInventory.publishedProgrammes).toBe('number');

      // Enquiry delivery status summary
      expect(data.enquiryStatusSummary).toBeDefined();
      expect(typeof data.enquiryStatusSummary.delivered).toBe('number');
    });

    it('supports custom date range query up to 365 days', async () => {
      const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const end = new Date().toISOString().slice(0, 10);

      const res = await request(app)
        .get(`/api/v1/tenant/admin/analytics/overview?period=custom&startDate=${start}&endDate=${end}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period.days).toBeLessThanOrEqual(6);
    });

    it('rejects invalid custom date ranges where start date is after end date with 400', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview?period=custom&startDate=2026-12-01&endDate=2026-01-01')
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY');
    });
  });

  describe('3. Strict Multi-Tenant Isolation (BR-001, SEC-TEN-001)', () => {
    it('strictly isolates analytics: Greenwood admin sees 0 Oxford events', async () => {
      // 1. Record 10 events for Oxford
      for (let i = 0; i < 10; i++) {
        await analyticsRepo.recordEvent({
          tenantId: tenantOxford.id,
          eventType: 'PAGE_VIEW',
          path: '/oxford-unique-path',
        });
      }

      // 2. Query Greenwood analytics overview as Greenwood admin
      const resGreenwood = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', greenwoodAdminCookie);

      expect(resGreenwood.status).toBe(200);
      // Greenwood must see 0 page views from Oxford
      expect(resGreenwood.body.data.metrics.totalPageViews).toBe(0);
      expect(resGreenwood.body.data.topPages).toEqual([]);
    });

    it('prevents cross-tenant access via Host header spoofing', async () => {
      // Oxford admin attempts to query Greenwood's overview by setting Host to greenwood.localhost
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/overview')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', adminCookie); // Oxford admin cookie

      // Must be rejected with 403 TENANT_MEMBERSHIP_REQUIRED
      expect(res.status).toBe(403);
    });
  });

  describe('4. Data Export (SRS Section 13)', () => {
    it('exports analytics summary as CSV format', async () => {
      await analyticsRepo.recordEvent({
        tenantId: tenantOxford.id,
        eventType: 'PAGE_VIEW',
        path: '/',
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/export?period=7d&format=csv')
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Date,PageViews,Searches,Enquiries,DocumentDownloads');
    });

    it('exports analytics summary as JSON format', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/admin/analytics/export?period=7d&format=json')
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
    });
  });

  describe('5. Data Retention & Immutable Audit Log Separation (BR-009, BR-010)', () => {
    it('purges events older than configured retention window without touching audit logs', async () => {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;

      // 1. Add old event (120 days old)
      await analyticsRepo.recordEvent({
        tenantId: tenantOxford.id,
        eventType: 'PAGE_VIEW',
        path: '/old-path',
        createdAt: new Date(now.getTime() - 120 * oneDay),
      });

      // 2. Add recent event (10 days old)
      await analyticsRepo.recordEvent({
        tenantId: tenantOxford.id,
        eventType: 'PAGE_VIEW',
        path: '/recent-path',
        createdAt: new Date(now.getTime() - 10 * oneDay),
      });

      // 3. Add an immutable security AuditLog record
      await auditRepo.createAuditLog({
        tenantId: tenantOxford.id,
        action: 'user:login',
        entityType: 'AUTH',
        outcome: 'SUCCESS',
      });

      expect(analyticsRepo.events.length).toBe(2);

      // 4. Execute 90-day retention cleanup
      const resCleanup = await request(app)
        .post('/api/v1/tenant/admin/analytics/retention/cleanup')
        .set('Host', 'oxford.localhost')
        .set('Cookie', adminCookie)
        .send({ retentionDays: 90 });

      expect(resCleanup.status).toBe(200);
      expect(resCleanup.body.success).toBe(true);
      expect(resCleanup.body.data.purgedCount).toBe(1);

      // 5. Verify only old analytics event was purged; recent event remains
      expect(analyticsRepo.events.length).toBe(1);
      expect(analyticsRepo.events[0].path).toBe('/recent-path');

      // 6. Verify security AuditLog is completely preserved (BR-010)
      const auditLogs = await auditRepo.findAuditLogs({ page: 1, limit: 10, tenantId: tenantOxford.id });
      expect(auditLogs.items.length).toBeGreaterThanOrEqual(1);
      // And the cleanup itself was audited
      const cleanupAudit = auditLogs.items.find((a) => a.action === 'analytics:retention_cleanup');
      expect(cleanupAudit).toBeDefined();
    });
  });
});
