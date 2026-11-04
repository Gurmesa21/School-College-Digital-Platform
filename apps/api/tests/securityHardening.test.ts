import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import zlib from 'zlib';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryCmsRepository } from '../src/repositories/cmsRepository.js';
import { InMemoryMediaRepository } from '../src/repositories/mediaRepository.js';
import { InMemoryFormRepository } from '../src/repositories/formRepository.js';
import { InMemoryAnalyticsRepository } from '../src/repositories/analyticsRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { MediaService } from '../src/services/mediaService.js';
import { FormService } from '../src/services/formService.js';
import { AnalyticsService } from '../src/services/analyticsService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 18 Suite — Security Hardening & Tenant Isolation Tests (NFR-SEC-001, BR-001, NFR-PRIV-001)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let mediaRepo: InMemoryMediaRepository;
  let formRepo: InMemoryFormRepository;
  let analyticsRepo: InMemoryAnalyticsRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let mediaService: MediaService;
  let formService: FormService;
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

  const defaultPassword = 'SecurityPassword123!';
  let defaultPasswordHash: string;

  let oxfordAdminCookie: string[] = [];
  let greenwoodAdminCookie: string[] = [];

  beforeEach(async () => {
    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost'] },
      { tenant: tenantGreenwood, domains: ['greenwood.localhost'] },
    ]);
    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    cmsRepo = new InMemoryCmsRepository();
    mediaRepo = new InMemoryMediaRepository();
    formRepo = new InMemoryFormRepository();
    analyticsRepo = new InMemoryAnalyticsRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService);
    cmsService = new CmsService(cmsRepo, auditRepo);
    mediaService = new MediaService(mediaRepo, auditRepo);
    formService = new FormService(formRepo, auditRepo, emailService, tenantRepo);
    analyticsService = new AnalyticsService(analyticsRepo, auditRepo);

    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    // 1. Roles & Permissions
    const oxfordAdminRole = await authRepo.createRole({
      name: 'OXFORD_ADMIN',
      displayName: 'Oxford Administrator',
      isSystem: true,
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.CMS_PAGES_WRITE);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.CMS_PAGES_PUBLISH);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.MEDIA_READ);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.MEDIA_WRITE);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.MEDIA_DELETE);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.ANALYTICS_VIEW);
    await authRepo.assignPermissionToRole(oxfordAdminRole.id, PERMISSIONS.USERS_INVITE);

    const greenwoodAdminRole = await authRepo.createRole({
      name: 'GREENWOOD_ADMIN',
      displayName: 'Greenwood Administrator',
      isSystem: true,
      tenantId: tenantGreenwood.id,
    });
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.CMS_PAGES_READ);
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.CMS_PAGES_WRITE);
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.CMS_PAGES_PUBLISH);
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.MEDIA_READ);
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.MEDIA_WRITE);
    await authRepo.assignPermissionToRole(greenwoodAdminRole.id, PERMISSIONS.MEDIA_DELETE);

    // 2. Seed Oxford Admin
    const oxfordAdminUser = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Admin',
      status: 'ACTIVE',
      isSuperAdmin: false,
    });
    const oxfordMem = await authRepo.createMembership({
      userId: oxfordAdminUser.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(oxfordMem.id, oxfordAdminRole.id);

    // 3. Seed Greenwood Admin
    const greenwoodAdminUser = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Admin',
      status: 'ACTIVE',
      isSuperAdmin: false,
    });
    const greenwoodMem = await authRepo.createMembership({
      userId: greenwoodAdminUser.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(greenwoodMem.id, greenwoodAdminRole.id);

    const envConfig = loadConfig();
    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      cmsRepository: cmsRepo,
      mediaRepository: mediaRepo,
      formRepository: formRepo,
      analyticsRepository: analyticsRepo,
      emailService,
      authService,
      userAdminService,
      cmsService,
      mediaService,
      formService,
      analyticsService,
      envConfig,
    });

    // Sign in Oxford Admin
    const resOxford = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({ email: 'admin@oxford.edu', password: defaultPassword });
    expect(resOxford.status).toBe(200);
    oxfordAdminCookie = (resOxford.headers['set-cookie'] || []) as unknown as string[];

    // Sign in Greenwood Admin
    const resGreenwood = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({ email: 'admin@greenwood.edu', password: defaultPassword });
    expect(resGreenwood.status).toBe(200);
    greenwoodAdminCookie = (resGreenwood.headers['set-cookie'] || []) as unknown as string[];
  });

  describe('1. Security Response Headers & Fingerprint Removal (NFR-SEC-001)', () => {
    it('sets hardened HTTP response headers on public and administrative endpoints', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
      expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets hardened headers on tenant-scoped API routes', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/navigation')
        .set('Host', 'oxford.localhost')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('2. Request Payload Size Bounding (DoS Defense)', () => {
    it('rejects JSON payloads exceeding 1MB with HTTP 413 Payload Too Large', async () => {
      // Create a payload larger than 1MB
      const largeString = 'X'.repeat(1024 * 1024 + 100);
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ path: '/test', bigData: largeString }));

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(res.body.error.message).toContain('1MB');
    });

    it('accepts standard JSON payloads within 1MB', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .set('Content-Type', 'application/json')
        .send({
          eventType: 'PAGE_VIEW',
          path: '/security-test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects compressed request payloads via inflate:false mitigation (GHSA-27r3-jxmh-p828)', async () => {
      // Craft a compressed gzip payload with trailing bytes designed to trigger GHSA-27r3-jxmh-p828
      const rawJson = JSON.stringify({ eventType: 'PAGE_VIEW', path: '/decompression-probe' });
      const compressed = zlib.gzipSync(Buffer.from(rawJson));
      const payloadWithTrailingBytes = Buffer.concat([compressed, Buffer.from('MALICIOUS_TRAILING_BYTES')]);

      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'gzip')
        .send(payloadWithTrailingBytes);

      // Body-parser with inflate: false rejects Content-Encoding: gzip with HTTP 415 (Unsupported Media Type)
      // and safely closes stream without CPU hang or unhandled exception
      expect(res.status).toBe(415);
    });

    it('rejects oversized collection arrays exceeding schema .max bounds with HTTP 400 (GHSA-mrhx-c7xc-m3w5 mitigation)', async () => {
      // Create invitation payload with 25 roles exceeding the schema max of 20
      const oversizedRoles = Array.from({ length: 25 }, (_, i) => `role-id-${i + 1}`);

      const res = await request(app)
        .post('/api/v1/tenant/admin/invitations')
        .set('Host', 'oxford.localhost')
        .set('Origin', 'http://oxford.localhost')
        .set('Cookie', oxfordAdminCookie)
        .send({
          email: 'oversized-test@oxford.edu',
          roleIds: oversizedRoles,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error)).toContain('Maximum 20 roles');
    });
  });

  describe('3. Multi-Tenant IDOR and Boundary Isolation (BR-001, NFR-SEC-001)', () => {
    it('prevents Oxford Admin from accessing Greenwood endpoints via host header (403)', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/cms/pages')
        .set('Host', 'greenwood.localhost')
        .set('Cookie', oxfordAdminCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
    });

    it('prevents IDOR: Oxford Admin cannot read or update Greenwood CMS pages by ID (404)', async () => {
      // 1. Seed a page under Greenwood tenant
      const greenwoodPage = await cmsRepo.createPage(tenantGreenwood.id, null, {
        title: 'Greenwood Secret Page',
        slug: 'greenwood-secret',
        sections: [],
      });

      // 2. Oxford Admin attempts to read Greenwood page using Oxford's context
      const getRes = await request(app)
        .get(`/api/v1/tenant/cms/pages/${greenwoodPage.id}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('PAGE_NOT_FOUND');

      // 3. Oxford Admin attempts to update Greenwood page
      const putRes = await request(app)
        .put(`/api/v1/tenant/cms/pages/${greenwoodPage.id}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie)
        .send({ title: 'Tampered Title' });

      expect(putRes.status).toBe(404);
      expect(putRes.body.error.code).toBe('PAGE_NOT_FOUND');
    });

    it('prevents IDOR: Oxford Admin cannot read or delete Greenwood media assets by ID (404)', async () => {
      // Seed Greenwood media asset
      const greenwoodMedia = await mediaRepo.createMedia(tenantGreenwood.id, null, {
        title: 'Greenwood Internal Doc',
        storageKey: `private/tenants/${tenantGreenwood.id}/documents/internal.pdf`,
        storagePolicy: 'PRIVATE',
        storageProvider: 'local',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        isPublic: false,
      });

      const getRes = await request(app)
        .get(`/api/v1/tenant/cms/media/${greenwoodMedia.id}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('MEDIA_NOT_FOUND');
    });
  });

  describe('4. CSRF Origin Guarding (NFR-SEC-001)', () => {
    it('rejects cookie-authenticated mutating requests from untrusted origins with 403', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie)
        .set('Origin', 'https://attacker-localhost.com')
        .send({
          title: 'Malicious Page',
          slug: 'malicious',
          status: 'DRAFT',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ORIGIN_FORBIDDEN');
    });

    it('rejects origin header with malicious subdomain suffix', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie)
        .set('Origin', 'https://oxford.localhost.evil.com')
        .send({
          title: 'Malicious Page 2',
          slug: 'malicious-2',
          status: 'DRAFT',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ORIGIN_FORBIDDEN');
    });

    it('allows cookie-authenticated mutating requests from legitimate origin', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/pages')
        .set('Host', 'oxford.localhost')
        .set('Cookie', oxfordAdminCookie)
        .set('Origin', 'http://oxford.localhost')
        .send({
          title: 'Legitimate Page',
          slug: 'legitimate-page',
          status: 'DRAFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Signed Media Download URL Hardening', () => {
    it('verifies valid signed download token successfully', async () => {
      const provider = mediaService.getStorageProvider();
      const signedUrl = await (provider as any).getSignedDownloadUrl({
        tenantId: tenantOxford.id,
        storageKey: `public/tenants/${tenantOxford.id}/media/doc.pdf`,
        expiresInSeconds: 300,
      });

      expect(signedUrl).toContain('download-signed?');
      expect(signedUrl).toContain(`tenantId=${tenantOxford.id}`);
      expect(signedUrl).toContain('sig=');
    });

    it('rejects expired signed download token with 403', async () => {
      const provider = mediaService.getStorageProvider();
      // Generate URL that already expired 10 seconds ago
      const expiredAt = Math.floor(Date.now() / 1000) - 10;
      const payload = `${tenantOxford.id}:public/tenants/${tenantOxford.id}/media/doc.pdf:${expiredAt}:`;
      const crypto = await import('crypto');
      const sig = crypto.createHmac('sha256', (provider as any).signingSecret).update(payload).digest('hex');

      const res = await request(app)
        .get(`/api/v1/tenant/cms/media/download-signed?tenantId=${tenantOxford.id}&key=public/tenants/${tenantOxford.id}/media/doc.pdf&expires=${expiredAt}&sig=${sig}`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EXPIRED_OR_INVALID_SIGNATURE');
    });

    it('rejects malformed signature length without crashing (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/cms/media/download-signed?tenantId=${tenantOxford.id}&key=test.pdf&expires=9999999999&sig=short`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EXPIRED_OR_INVALID_SIGNATURE');
    });

    it('rejects cross-tenant signed URL usage when tenant resolved via host does not match (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/cms/media/download-signed?tenantId=${tenantGreenwood.id}&key=greenwood-doc.pdf&expires=9999999999&sig=dummy`)
        .set('Host', 'oxford.localhost'); // Host is Oxford, but query tenantId is Greenwood

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CROSS_TENANT_ACCESS_DENIED');
    });

    it('rejects path traversal in storageKey parameter (400)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/cms/media/download-signed?tenantId=${tenantOxford.id}&key=../../etc/passwd&expires=9999999999&sig=dummy`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STORAGE_KEY');
    });
  });

  describe('6. Analytics Value-Level PII Sanitization (NFR-PRIV-001)', () => {
    it('redacts email addresses, phone numbers, and bearer tokens inside metadata values', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'SEARCH',
          path: '/search',
          metadata: {
            searchTerm: 'contact teacher john.doe@example.com at +1-555-867-5309',
            queryDetails: 'credentials Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake from 192.168.1.100',
            safeCategory: 'admissions',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify the recorded event in analytics repository has sanitized values
      const events = (analyticsRepo as any).events;
      const lastEvent = events[events.length - 1];
      expect(lastEvent).toBeDefined();
      expect(lastEvent.metadata.searchTerm).toContain('[REDACTED_EMAIL]');
      expect(lastEvent.metadata.searchTerm).toContain('[REDACTED_PHONE]');
      expect(lastEvent.metadata.searchTerm).not.toContain('john.doe@example.com');
      expect(lastEvent.metadata.searchTerm).not.toContain('+1-555-867-5309');
      expect(lastEvent.metadata.queryDetails).toContain('[REDACTED_TOKEN]');
      expect(lastEvent.metadata.queryDetails).toContain('[REDACTED_IP]');
      expect(lastEvent.metadata.safeCategory).toBe('admissions');
    });

    it('rejects metadata containing forbidden personal keys with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/analytics/event')
        .set('Host', 'oxford.localhost')
        .send({
          eventType: 'PAGE_VIEW',
          path: '/contact',
          metadata: {
            userEmail: 'student@example.com',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_EVENT_PAYLOAD');
    });
  });
});
