import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryMediaRepository } from '../src/repositories/mediaRepository.js';
import { InMemoryNewsRepository } from '../src/repositories/newsRepository.js';
import { InMemoryAnnouncementRepository } from '../src/repositories/announcementRepository.js';
import { InMemoryEventRepository } from '../src/repositories/eventRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { NewsService } from '../src/services/newsService.js';
import { AnnouncementService } from '../src/services/announcementService.js';
import { EventService } from '../src/services/eventService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 12 Suite — News, Notices & Event Calendar (FR-COM-001, FR-COM-002, FR-EVT-001, FR-EVT-002)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let mediaRepo: InMemoryMediaRepository;
  let newsRepo: InMemoryNewsRepository;
  let announcementRepo: InMemoryAnnouncementRepository;
  let eventRepo: InMemoryEventRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let newsService: NewsService;
  let announcementService: AnnouncementService;
  let eventService: EventService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

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
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'secondary.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  let tokenAdminOxford: string;
  let tokenViewerOxford: string;
  let tokenPublisherOxford: string;
  let tokenAdminGreenwood: string;

  let oxfordMediaId: string;
  let greenwoodMediaId: string;

  beforeAll(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);
  });

  beforeEach(async () => {
    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost'] },
      { tenant: tenantGreenwood, domains: ['secondary.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    mediaRepo = new InMemoryMediaRepository();
    newsRepo = new InMemoryNewsRepository();
    announcementRepo = new InMemoryAnnouncementRepository();
    eventRepo = new InMemoryEventRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    newsService = new NewsService(newsRepo, auditRepo, mediaRepo);
    announcementService = new AnnouncementService(announcementRepo, auditRepo);
    eventService = new EventService(eventRepo, auditRepo, mediaRepo);

    // Seed Media
    const oxMedia = await mediaRepo.createMedia(tenantOxford.id, 'uploader-1', {
      title: 'Oxford Campus Quad',
      altText: 'Students walking in the sunlit Oxford courtyard',
      category: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSizeBytes: 150000,
      storageKey: 'oxford/quad.jpg',
      publicUrl: '/media/oxford/quad.jpg',
      isPublic: true,
    });
    oxfordMediaId = oxMedia.id;

    const gwMedia = await mediaRepo.createMedia(tenantGreenwood.id, 'uploader-2', {
      title: 'Greenwood Gate',
      altText: 'Main entrance of Greenwood',
      category: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSizeBytes: 120000,
      storageKey: 'gw/gate.jpg',
      publicUrl: '/media/gw/gate.jpg',
      isPublic: true,
    });
    greenwoodMediaId = gwMedia.id;

    // 1. Oxford Admin (ALL permissions)
    const adminUserA = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipAdminA = await authRepo.createMembership({
      userId: adminUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const roleAdminA = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'TENANT_ADMIN',
      displayName: 'Tenant Admin',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.NEWS_READ);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.NEWS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.NEWS_PUBLISH);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.ANNOUNCEMENTS_READ);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.ANNOUNCEMENTS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.ANNOUNCEMENTS_PUBLISH);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.EVENTS_READ);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.EVENTS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminA.id, PERMISSIONS.EVENTS_PUBLISH);
    await authRepo.assignRoleToMembership(membershipAdminA.id, roleAdminA.id);

    // 2. Oxford Viewer (READ ONLY)
    const viewerUserA = await authRepo.createUser({
      email: 'viewer@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Viewer',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipViewerA = await authRepo.createMembership({
      userId: viewerUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const roleViewerA = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'VIEWER',
      displayName: 'Viewer',
      isSystem: false,
    });
    await authRepo.assignPermissionToRole(roleViewerA.id, PERMISSIONS.NEWS_READ);
    await authRepo.assignPermissionToRole(roleViewerA.id, PERMISSIONS.ANNOUNCEMENTS_READ);
    await authRepo.assignPermissionToRole(roleViewerA.id, PERMISSIONS.EVENTS_READ);
    await authRepo.assignRoleToMembership(membershipViewerA.id, roleViewerA.id);

    // 3. Oxford Publisher (READ + PUBLISH, NO WRITE)
    const publisherUserA = await authRepo.createUser({
      email: 'publisher@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Publisher',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipPubA = await authRepo.createMembership({
      userId: publisherUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const rolePubA = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'PUBLISHER',
      displayName: 'Publisher',
      isSystem: false,
    });
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.NEWS_READ);
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.NEWS_PUBLISH);
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.ANNOUNCEMENTS_READ);
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.ANNOUNCEMENTS_PUBLISH);
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.EVENTS_READ);
    await authRepo.assignPermissionToRole(rolePubA.id, PERMISSIONS.EVENTS_PUBLISH);
    await authRepo.assignRoleToMembership(membershipPubA.id, rolePubA.id);

    // 4. Greenwood Admin (Tenant B)
    const adminUserB = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipAdminB = await authRepo.createMembership({
      userId: adminUserB.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    const roleAdminB = await authRepo.createRole({
      tenantId: tenantGreenwood.id,
      name: 'TENANT_ADMIN',
      displayName: 'Tenant Admin',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.NEWS_READ);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.NEWS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.NEWS_PUBLISH);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.ANNOUNCEMENTS_READ);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.ANNOUNCEMENTS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.ANNOUNCEMENTS_PUBLISH);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.EVENTS_READ);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.EVENTS_WRITE);
    await authRepo.assignPermissionToRole(roleAdminB.id, PERMISSIONS.EVENTS_PUBLISH);
    await authRepo.assignRoleToMembership(membershipAdminB.id, roleAdminB.id);

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      mediaRepository: mediaRepo,
      newsRepository: newsRepo,
      announcementRepository: announcementRepo,
      eventRepository: eventRepo,
      newsService,
      announcementService,
      eventService,
      emailService,
      authService,
      userAdminService,
      newsService,
      announcementService,
      eventService,
      envConfig: loadConfig(),
    });

    const s1 = await authService.signIn({ email: 'admin@oxford.edu', password: defaultPassword });
    tokenAdminOxford = s1.rawSessionToken;

    const s2 = await authService.signIn({ email: 'viewer@oxford.edu', password: defaultPassword });
    tokenViewerOxford = s2.rawSessionToken;

    const s3 = await authService.signIn({ email: 'publisher@oxford.edu', password: defaultPassword });
    tokenPublisherOxford = s3.rawSessionToken;

    const s4 = await authService.signIn({ email: 'admin@greenwood.edu', password: defaultPassword });
    tokenAdminGreenwood = s4.rawSessionToken;
  });

  // ==========================================================================
  // FR-COM-001: Editorial News
  // ==========================================================================
  describe('FR-COM-001: Editorial News Lifecycle & Isolation', () => {
    it('creates a draft news article with author, tags, and media attachment', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Robotics Team Qualifies for National Finals',
          slug: 'robotics-team-qualifies-national-finals',
          summary: 'Our secondary robotics engineers triumphed in regional autonomous navigation trials.',
          body: 'Full long-form story: The Oxford Robotics Team showcased exceptional engineering rigour this weekend...',
          authorName: 'Faculty Mentor Sarah',
          featuredMediaId: oxfordMediaId,
          tags: ['Robotics', 'STEM', 'Achievements'],
          status: 'DRAFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('robotics-team-qualifies-national-finals');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.featuredMediaId).toBe(oxfordMediaId);
      expect(res.body.data.tags).toContain('Robotics');

      // Verify audit log
      const logData = await auditRepo.findAuditLogs({ tenantId: tenantOxford.id, page: 1, limit: 100 });
      expect(logData.items.some((l) => l.action === 'news:article:create')).toBe(true);
    });

    it('rejects slug collision within the same tenant boundary', async () => {
      // First article
      await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Campus Garden Harvest',
          slug: 'campus-garden-harvest',
          body: 'Content for first article...',
        });

      // Duplicate slug
      const res = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Another Garden Article',
          slug: 'campus-garden-harvest',
          body: 'Content for second article with conflicting slug...',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SLUG_CONFLICT');
    });

    it('allows identical slugs across different tenants (tenant isolation)', async () => {
      // Oxford
      const resA = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Autumn Welcome',
          slug: 'autumn-welcome',
          body: 'Welcome to Oxford autumn semester...',
        });
      expect(resA.status).toBe(201);

      // Greenwood
      const resB = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminGreenwood}`)
        .send({
          title: 'Autumn Welcome',
          slug: 'autumn-welcome',
          body: 'Welcome to Greenwood autumn semester...',
        });
      expect(resB.status).toBe(201);
    });

    it('rejects cross-tenant media attachment', async () => {
      // Oxford admin trying to link Greenwood's media
      const res = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Unauthorized Media Association',
          slug: 'unauthorized-media-association',
          body: 'Testing foreign key validation...',
          featuredMediaId: greenwoodMediaId, // Greenwood's media
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('INVALID_MEDIA');
    });

    it('enforces publication lifecycle and draft isolation from public endpoints', async () => {
      // 1. Create draft article
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Confidential Internal Transition',
          slug: 'confidential-internal-transition',
          body: 'Internal unapproved story text that must remain hidden from anonymous visitors.',
          status: 'DRAFT',
        });
      const articleId = createRes.body.data.id;

      // 2. Anonymous visitor tries to read draft via public endpoint -> 404
      const pubDraftRes = await request(app)
        .get('/api/v1/tenant/public/news/confidential-internal-transition')
        .set('Host', 'oxford.localhost');
      expect(pubDraftRes.status).toBe(404);

      // 3. Publish the article
      const pubActionRes = await request(app)
        .post(`/api/v1/tenant/cms/news/${articleId}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`);
      expect(pubActionRes.status).toBe(200);
      expect(pubActionRes.body.data.status).toBe('PUBLISHED');

      // 4. Anonymous visitor can now read published article
      const pubViewRes = await request(app)
        .get('/api/v1/tenant/public/news/confidential-internal-transition')
        .set('Host', 'oxford.localhost');
      expect(pubViewRes.status).toBe(200);
      expect(pubViewRes.body.data.slug).toBe('confidential-internal-transition');
      expect(pubViewRes.body.data.title).toBe('Confidential Internal Transition');

      // 5. Public archive timeline
      const archiveRes = await request(app)
        .get('/api/v1/tenant/public/news/archive')
        .set('Host', 'oxford.localhost');
      expect(archiveRes.status).toBe(200);
      expect(Array.isArray(archiveRes.body.data)).toBe(true);
    });

    it('enforces RBAC permissions for news publishing and writing', async () => {
      // Viewer cannot create news
      const writeFail = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenViewerOxford}`)
        .send({
          title: 'Forbidden Draft',
          slug: 'forbidden-draft',
          body: 'Viewer should not be able to write...',
        });
      expect(writeFail.status).toBe(403);

      // Create an article with Admin
      const created = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'To Be Published',
          slug: 'to-be-published',
          body: 'Story content ready for review...',
          status: 'DRAFT',
        });
      const id = created.body.data.id;

      // Viewer cannot publish news
      const pubFail = await request(app)
        .post(`/api/v1/tenant/cms/news/${id}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenViewerOxford}`);
      expect(pubFail.status).toBe(403);

      // Publisher CAN publish news
      const pubSuccess = await request(app)
        .post(`/api/v1/tenant/cms/news/${id}/publish`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenPublisherOxford}`);
      expect(pubSuccess.status).toBe(200);
    });
  });

  // ==========================================================================
  // FR-COM-002: Operational Announcements
  // ==========================================================================
  describe('FR-COM-002: Operational Announcements & Dynamic Expiry', () => {
    it('creates announcement with priority, audience, and display window', async () => {
      const startsAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Severe Storm Alert: Campus Shelter In Place',
          content: 'High winds expected between 2 PM and 5 PM. All physical education classes moved indoors.',
          priority: 'EMERGENCY',
          audience: 'GENERAL',
          isPinned: true,
          startsAt,
          expiresAt,
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority).toBe('EMERGENCY');
      expect(res.body.data.isPinned).toBe(true);
    });

    it('rejects invalid display window where expiry is before start time', async () => {
      const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); // Expire before start!

      const res = await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Illogical Time Notice',
          content: 'This announcement has inverted display dates.',
          startsAt,
          expiresAt,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('dynamically excludes expired, future, and draft notices from public active placement', async () => {
      const now = Date.now();

      // 1. Active announcement (starts in past, expires in future, published)
      await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Active Library Notice',
          content: 'Open late until 9 PM.',
          priority: 'NORMAL',
          startsAt: new Date(now - 10000).toISOString(),
          expiresAt: new Date(now + 100000).toISOString(),
          status: 'PUBLISHED',
        });

      // 2. Future announcement (starts in future, published)
      await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Future Scheduled Maintenance',
          content: 'Power grid inspection next weekend.',
          priority: 'LOW',
          startsAt: new Date(now + 100000).toISOString(),
          expiresAt: new Date(now + 200000).toISOString(),
          status: 'PUBLISHED',
        });

      // 3. Expired announcement (expired in past, published)
      await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Expired Book Sale',
          content: 'Ended yesterday.',
          priority: 'NORMAL',
          startsAt: new Date(now - 200000).toISOString(),
          expiresAt: new Date(now - 50000).toISOString(), // EXPIRED!
          status: 'PUBLISHED',
        });

      // 4. Draft announcement (not published)
      await request(app)
        .post('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Unpublished Internal Draft',
          content: 'Secret staff memo.',
          status: 'DRAFT',
        });

      // Query public active announcements
      const pubRes = await request(app)
        .get('/api/v1/tenant/public/announcements')
        .set('Host', 'oxford.localhost');

      expect(pubRes.status).toBe(200);
      const items = pubRes.body.data;
      const titles = items.map((i: any) => i.title);

      // Only the active notice should appear
      expect(titles).toContain('Active Library Notice');
      expect(titles).not.toContain('Future Scheduled Maintenance');
      expect(titles).not.toContain('Expired Book Sale');
      expect(titles).not.toContain('Unpublished Internal Draft');

      // But expired notice is NOT deleted from admin records!
      const adminRes = await request(app)
        .get('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`);
      expect(adminRes.body.data.items.some((i: any) => i.title === 'Expired Book Sale')).toBe(true);
    });
  });

  // ==========================================================================
  // FR-EVT-001 & FR-EVT-002: Events Calendar & iCalendar Export
  // ==========================================================================
  describe('FR-EVT-001 & FR-EVT-002: Events Calendar & Timezone Handling', () => {
    it('creates an event with explicit timezone, capacity, and cover media', async () => {
      const startsAt = new Date(Date.now() + 86400000).toISOString();
      const endsAt = new Date(Date.now() + 86400000 + 7200000).toISOString();

      const res = await request(app)
        .post('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Annual Founders Day Gala',
          slug: 'annual-founders-day-gala',
          description: 'A celebration of our founding benefactors and alumni community.',
          startsAt,
          endsAt,
          timezone: 'Europe/London',
          location: 'Oxford Great Hall',
          category: 'COMMUNITY',
          coverMediaId: oxfordMediaId,
          capacity: 400,
          isRegistrationOpen: true,
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timezone).toBe('Europe/London');
      expect(res.body.data.capacity).toBe(400);
      expect(res.body.data.coverMediaId).toBe(oxfordMediaId);
    });

    it('rejects event where end date is before start date', async () => {
      const startsAt = new Date(Date.now() + 86400000).toISOString();
      const endsAt = new Date(Date.now() + 3600000).toISOString(); // Ends before start

      const res = await request(app)
        .post('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Inverted Event Dates',
          slug: 'inverted-event-dates',
          startsAt,
          endsAt,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('distinguishes between upcoming and past events without deleting historical records', async () => {
      const now = Date.now();

      // 1. Upcoming event
      await request(app)
        .post('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Forthcoming Science Olympiad',
          slug: 'forthcoming-science-olympiad',
          startsAt: new Date(now + 100000).toISOString(),
          endsAt: new Date(now + 200000).toISOString(),
          status: 'PUBLISHED',
        });

      // 2. Past event
      await request(app)
        .post('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Last Year Graduation 2025',
          slug: 'last-year-graduation-2025',
          startsAt: new Date(now - 300000).toISOString(),
          endsAt: new Date(now - 200000).toISOString(),
          status: 'PUBLISHED',
        });

      // Query upcoming
      const upcomingRes = await request(app)
        .get('/api/v1/tenant/public/events?timeframe=upcoming')
        .set('Host', 'oxford.localhost');
      expect(upcomingRes.status).toBe(200);
      const upcomingTitles = upcomingRes.body.data.items.map((i: any) => i.title);
      expect(upcomingTitles).toContain('Forthcoming Science Olympiad');
      expect(upcomingTitles).not.toContain('Last Year Graduation 2025');

      // Query past
      const pastRes = await request(app)
        .get('/api/v1/tenant/public/events?timeframe=past')
        .set('Host', 'oxford.localhost');
      expect(pastRes.status).toBe(200);
      const pastTitles = pastRes.body.data.items.map((i: any) => i.title);
      expect(pastTitles).toContain('Last Year Graduation 2025');
      expect(pastTitles).not.toContain('Forthcoming Science Olympiad');
    });

    it('generates standard RFC 5545 iCalendar (.ics) export (FR-EVT-002)', async () => {
      const startsAt = '2026-11-15T10:00:00.000Z';
      const endsAt = '2026-11-15T12:00:00.000Z';

      await request(app)
        .post('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Winter Chamber Music Recital',
          slug: 'winter-chamber-music-recital',
          description: 'A performance by the senior chamber orchestra in the Chapel.',
          startsAt,
          endsAt,
          location: 'Oxford Chapel',
          status: 'PUBLISHED',
        });

      const icsRes = await request(app)
        .get('/api/v1/tenant/public/events/winter-chamber-music-recital/ics')
        .set('Host', 'oxford.localhost');

      expect(icsRes.status).toBe(200);
      expect(icsRes.headers['content-type']).toContain('text/calendar');
      expect(icsRes.text).toContain('BEGIN:VCALENDAR');
      expect(icsRes.text).toContain('SUMMARY:Winter Chamber Music Recital');
      expect(icsRes.text).toContain('LOCATION:Oxford Chapel');
      expect(icsRes.text).toContain('END:VCALENDAR');
    });
  });

  // ==========================================================================
  // Cross-Tenant Security & Unauthenticated Checks
  // ==========================================================================
  describe('Cross-Tenant Security Boundary & Unauthenticated Requests', () => {
    it('rejects unauthenticated requests to protected administrative endpoints', async () => {
      const resNews = await request(app)
        .get('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost');
      expect(resNews.status).toBe(401);

      const resAnn = await request(app)
        .get('/api/v1/tenant/cms/announcements')
        .set('Host', 'oxford.localhost');
      expect(resAnn.status).toBe(401);

      const resEvt = await request(app)
        .get('/api/v1/tenant/cms/events')
        .set('Host', 'oxford.localhost');
      expect(resEvt.status).toBe(401);
    });

    it('prevents Tenant B admin from updating or deleting Tenant A content', async () => {
      // Create news in Oxford
      const created = await request(app)
        .post('/api/v1/tenant/cms/news')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          title: 'Oxford Sovereign Article',
          slug: 'oxford-sovereign-article',
          body: 'Content strictly owned by Oxford...',
        });
      const id = created.body.data.id;

      // Greenwood admin attempts to update Oxford article on Greenwood's host
      const hackRes = await request(app)
        .put(`/api/v1/tenant/cms/news/${id}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminGreenwood}`)
        .send({
          title: 'Hacked Article Title',
        });
      expect(hackRes.status).toBe(404);

      // Greenwood admin attempts to delete Oxford article
      const hackDelete = await request(app)
        .delete(`/api/v1/tenant/cms/news/${id}`)
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminGreenwood}`);
      expect(hackDelete.status).toBe(404);
    });
  });
});
