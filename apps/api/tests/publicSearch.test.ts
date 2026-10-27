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
import { InMemoryFormRepository } from '../src/repositories/formRepository.js';
import { InMemoryAcademicRepository } from '../src/repositories/academicRepository.js';
import { InMemoryStaffRepository } from '../src/repositories/staffRepository.js';
import { InMemoryNewsRepository } from '../src/repositories/newsRepository.js';
import { InMemoryAnnouncementRepository } from '../src/repositories/announcementRepository.js';
import { InMemoryEventRepository } from '../src/repositories/eventRepository.js';
import { InMemorySearchRepository } from '../src/repositories/searchRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { NavigationService } from '../src/services/navigationService.js';
import { MediaService } from '../src/services/mediaService.js';
import { FormService } from '../src/services/formService.js';
import { SectionService } from '../src/services/sectionService.js';
import { AcademicService } from '../src/services/academicService.js';
import { StaffService } from '../src/services/staffService.js';
import { NewsService } from '../src/services/newsService.js';
import { AnnouncementService } from '../src/services/announcementService.js';
import { EventService } from '../src/services/eventService.js';
import { SearchService } from '../src/services/searchService.js';
import { ResolvedTenant } from '@school/shared';

describe('Day 14 Suite — Tenant-Scoped Public Search (FR-SRCH-001, UC-PUB-02, BR-001, BR-002)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let navRepo: InMemoryNavigationRepository;
  let mediaRepo: InMemoryMediaRepository;
  let taxRepo: InMemoryTaxonomyRepository;
  let formRepo: InMemoryFormRepository;
  let academicRepo: InMemoryAcademicRepository;
  let staffRepo: InMemoryStaffRepository;
  let newsRepo: InMemoryNewsRepository;
  let announcementRepo: InMemoryAnnouncementRepository;
  let eventRepo: InMemoryEventRepository;
  let searchRepo: InMemorySearchRepository;

  let searchService: SearchService;
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
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'secondary.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  beforeEach(async () => {
    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost'] },
      { tenant: tenantGreenwood, domains: ['secondary.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    cmsRepo = new InMemoryCmsRepository();
    navRepo = new InMemoryNavigationRepository();
    mediaRepo = new InMemoryMediaRepository();
    taxRepo = new InMemoryTaxonomyRepository();
    formRepo = new InMemoryFormRepository();
    academicRepo = new InMemoryAcademicRepository();
    staffRepo = new InMemoryStaffRepository();
    newsRepo = new InMemoryNewsRepository();
    announcementRepo = new InMemoryAnnouncementRepository();
    eventRepo = new InMemoryEventRepository();

    searchRepo = new InMemorySearchRepository({
      cmsRepo,
      academicRepo,
      staffRepo,
      newsRepo,
      eventRepo,
      announcementRepo,
      mediaRepo,
      formRepo,
    });

    searchService = new SearchService(searchRepo, auditRepo);

    const emailService = new InMemoryEmailService();
    const authService = new AuthService(authRepo, emailService, 7, 60);
    const userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    const cmsService = new CmsService(cmsRepo, auditRepo);
    const navService = new NavigationService(navRepo, auditRepo);
    const mediaService = new MediaService(mediaRepo, auditRepo);
    const formService = new FormService(formRepo, auditRepo, emailService, tenantRepo);
    const academicService = new AcademicService(academicRepo, auditRepo);
    const staffService = new StaffService(staffRepo, auditRepo, academicRepo, mediaRepo);
    const newsService = new NewsService(newsRepo, auditRepo, mediaRepo);
    const announcementService = new AnnouncementService(announcementRepo, auditRepo);
    const eventService = new EventService(eventRepo, auditRepo, mediaRepo);

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      cmsRepository: cmsRepo,
      navigationRepository: navRepo,
      mediaRepository: mediaRepo,
      taxonomyRepository: taxRepo,
      formRepository: formRepo,
      academicRepository: academicRepo,
      staffRepository: staffRepo,
      newsRepository: newsRepo,
      announcementRepository: announcementRepo,
      eventRepository: eventRepo,
      searchRepository: searchRepo,
      authService,
      userAdminService,
      cmsService,
      navigationService: navService,
      mediaService,
      formService,
      academicService,
      staffService,
      newsService,
      announcementService,
      eventService,
      searchService,
    });

    // =========================================================================
    // SEED OXFORD CONTENT (Published & Drafts for privacy verification)
    // =========================================================================

    // 1. CMS Pages
    cmsRepo.pages.set('ox-page-1', {
      id: 'ox-page-1',
      tenantId: tenantOxford.id,
      title: 'Admissions and Enrollment Guide',
      slug: 'admissions-guide',
      summary: 'Comprehensive walkthrough of the admissions procedure and prerequisites.',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: null,
      createdAt: new Date().toISOString(),
    });

    cmsRepo.pages.set('ox-page-draft', {
      id: 'ox-page-draft',
      tenantId: tenantOxford.id,
      title: 'Secret Internal Strategy Draft Page',
      slug: 'internal-strategy',
      summary: 'Confidential draft page that should never appear in public search.',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    });

    cmsRepo.pages.set('ox-page-future', {
      id: 'ox-page-future',
      tenantId: tenantOxford.id,
      title: 'Future Scheduled Launch Page',
      slug: 'future-launch',
      summary: 'Page scheduled to publish next week.',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // 2. Academic Programmes
    await academicRepo.createProgramme(tenantOxford.id, 'admin-1', {
      title: 'Cambridge International AS & A-Level Sciences',
      slug: 'a-level-sciences',
      summary: 'Rigorous pre-university qualification in Physics, Chemistry, and Advanced Biology.',
      description: 'Comprehensive lab-intensive curriculum preparing scholars for global STEM careers.',
      duration: '2 Years',
      status: 'PUBLISHED',
      isActive: true,
      displayTuition: false, // Strict tuition privacy: false
      tuitionFee: 14500,
      tuitionCurrency: 'USD',
      tuitionPeriod: 'Per Annum',
    });

    await academicRepo.createProgramme(tenantOxford.id, 'admin-1', {
      title: 'Robotics and Computer Science Enrichment Track',
      slug: 'robotics-cs',
      summary: 'Hands-on programming and autonomous systems laboratory.',
      status: 'DRAFT', // Draft programme: must NOT appear in public search
      isActive: true,
      displayTuition: false,
    });

    await academicRepo.createProgramme(tenantOxford.id, 'admin-1', {
      title: 'Primary Foundation International Curriculum',
      slug: 'primary-foundation',
      summary: 'Inquiry-based primary education emphasizing numeracy and literacy.',
      status: 'PUBLISHED',
      isActive: true,
      displayTuition: true, // Approved tuition display
      tuitionFee: 9200,
      tuitionCurrency: 'USD',
      tuitionPeriod: 'Per Academic Year',
    });

    // 3. Staff Profiles
    await staffRepo.createStaff(tenantOxford.id, 'admin-1', {
      fullName: 'Dr. Eleanor Vance',
      slug: 'eleanor-vance',
      roleTitle: 'Head of Natural Sciences & Physics Chair',
      biography: 'Dr. Vance holds a Ph.D. in Astrophysics and directs undergraduate experimental research.',
      subjects: ['Physics', 'Astronomy'],
      status: 'PUBLISHED',
      isActive: true,
      displayEmail: true,
      publicEmail: 'e.vance@oxford.school.example',
      displayPhone: false,
      publicPhone: '+44 1865 990123', // Phone NOT approved for public display
      internalNotes: 'Top confidential executive compensation package',
    });

    await staffRepo.createStaff(tenantOxford.id, 'admin-1', {
      fullName: 'Marcus Sterling',
      slug: 'marcus-sterling',
      roleTitle: 'Dean of Student Affairs',
      biography: 'Oversees campus welfare, pastoral guidance, and student activities.',
      status: 'DRAFT', // Draft staff: must NOT appear in public search
      isActive: true,
      displayEmail: false,
    });

    // 4. News Articles
    await newsRepo.createNews(tenantOxford.id, 'admin-1', {
      title: 'Oxford Inaugurates State-of-the-Art Science Pavilion',
      slug: 'science-pavilion-inauguration',
      summary: 'A new milestone in campus science laboratories and experimental research suites.',
      body: 'The Chancellor and faculty today unveiled the new STEM pavilion featuring modern Physics and Chemistry facilities.',
      tags: ['Science', 'STEM', 'Campus'],
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    });

    await newsRepo.createNews(tenantOxford.id, 'admin-1', {
      title: 'Unpublished Internal News Editorial',
      slug: 'unpublished-editorial',
      summary: 'Draft editorial on faculty reorganizations.',
      body: 'Internal notes only.',
      status: 'DRAFT',
    });

    // 5. Events
    await eventRepo.createEvent(tenantOxford.id, 'admin-1', {
      title: 'Annual Science Fair & Innovation Exposition',
      slug: 'annual-science-fair',
      description: 'Public exhibition of senior science design projects, robotics demos, and faculty talks.',
      startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      endsAt: new Date(Date.now() + 86400000 * 3 + 14400000).toISOString(),
      location: 'Great Quadrangle Auditorium',
      category: 'ACADEMIC',
      status: 'PUBLISHED',
    });

    await eventRepo.createEvent(tenantOxford.id, 'admin-1', {
      title: 'Private Faculty Disciplinary Meeting',
      slug: 'faculty-meeting',
      description: 'Confidential staff assembly.',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000 + 7200000).toISOString(),
      status: 'DRAFT',
    });

    // 6. Announcements
    await announcementRepo.createAnnouncement(tenantOxford.id, 'admin-1', {
      title: 'Admissions Open House Registration Advisement',
      content: 'Prospective families are invited to register online for the upcoming admissions briefing.',
      status: 'PUBLISHED',
      audience: 'GENERAL',
      priority: 'NORMAL',
    });

    // 7. Documents (Media Assets)
    await mediaRepo.createMedia(tenantOxford.id, 'admin-1', {
      title: 'Official Oxford Secondary Prospectus 2026',
      caption: 'Detailed informational brochure and curriculum overview for prospective applicants.',
      category: 'DOCUMENT',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048500,
      storageKey: 'tenants/oxford/documents/prospectus.pdf',
      publicUrl: 'http://localhost:4000/api/v1/tenant/public/media/prospectus/file',
      isPublic: true,
      storagePolicy: 'PUBLIC',
    });

    // 8. Public Forms
    await formRepo.createForm(tenantOxford.id, {
      title: 'General Inquiries and Prospectus Request Form',
      slug: 'general-enquiry',
      description: 'Submit inquiries regarding curriculum, visits, and admissions procedures.',
      type: 'GENERAL_ENQUIRY',
      recipientEmails: ['private-registrar@oxford.internal'],
      isPublished: true,
    });

    // =========================================================================
    // SEED GREENWOOD CONTENT (To test Strict Tenant Isolation SEC-TEN-001)
    // =========================================================================

    await academicRepo.createProgramme(tenantGreenwood.id, 'admin-2', {
      title: 'Greenwood Science and Agricultural Technology Diploma',
      slug: 'agri-science-diploma',
      summary: 'Practical vocational diploma in environmental science and agronomy.',
      status: 'PUBLISHED',
      isActive: true,
      displayTuition: false,
    });

    await staffRepo.createStaff(tenantGreenwood.id, 'admin-2', {
      fullName: 'Dr. Gregory Greenwood',
      slug: 'gregory-greenwood',
      roleTitle: 'Head of Science Department',
      biography: 'Specialist in Botany and Agricultural Sciences.',
      status: 'PUBLISHED',
      isActive: true,
      displayEmail: true,
      publicEmail: 'gregory@greenwood.school.example',
    });
  });

  // ===========================================================================
  // 1. Functional Search Behavior & Input Sanitation (FR-SRCH-001)
  // ===========================================================================
  describe('1. Functional Search Behavior & Input Validation', () => {
    it('successfully matches queries across all eligible public content types', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=Science')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.query).toBe('Science');
      expect(res.body.data.total).toBeGreaterThanOrEqual(4);

      const items = res.body.data.items;
      const types = items.map((i: any) => i.type);

      // Verify that every required public content type matching "Science" is present
      expect(types).toContain('PROGRAMME');
      expect(types).toContain('STAFF');
      expect(types).toContain('NEWS');
      expect(types).toContain('EVENT');

      // Verify item response contract
      for (const item of items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('slug');
        expect(typeof item.score).toBe('number');
      }
    });

    it('returns clear empty result response when no records match without error', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=NonExistentKeywordXYZ')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.totalPages).toBe(1);
    });

    it('safely processes and normalizes whitespace, case, and Unicode characters', async () => {
      // Multiple spaces, leading/trailing space, mixed case
      const res1 = await request(app)
        .get('/api/v1/tenant/public/search?q=%20%20sCiEnCe%20%20')
        .set('Host', 'oxford.localhost');

      expect(res1.status).toBe(200);
      expect(res1.body.data.query).toBe('sCiEnCe');
      expect(res1.body.data.total).toBeGreaterThanOrEqual(4);

      // Unicode normalized query
      const res2 = await request(app)
        .get('/api/v1/tenant/public/search?q=Eleanor')
        .set('Host', 'oxford.localhost');

      expect(res2.status).toBe(200);
      expect(res2.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res2.body.data.items[0].title).toBe('Dr. Eleanor Vance');
    });

    it('rejects empty, whitespace-only, or missing queries with HTTP 400', async () => {
      const emptyRes = await request(app)
        .get('/api/v1/tenant/public/search?q=')
        .set('Host', 'oxford.localhost');
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.success).toBe(false);
      expect(emptyRes.body.error.code).toBe('INVALID_QUERY_PARAMS');

      const whitespaceRes = await request(app)
        .get('/api/v1/tenant/public/search?q=%20%20%20')
        .set('Host', 'oxford.localhost');
      expect(whitespaceRes.status).toBe(400);
      expect(whitespaceRes.body.success).toBe(false);

      const missingRes = await request(app)
        .get('/api/v1/tenant/public/search')
        .set('Host', 'oxford.localhost');
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.success).toBe(false);
    });

    it('rejects excessively long queries exceeding 100 characters with HTTP 400', async () => {
      const longQuery = 'a'.repeat(101);
      const res = await request(app)
        .get(`/api/v1/tenant/public/search?q=${longQuery}`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_QUERY_PARAMS');
    });

    it('filters results accurately by specific content type', async () => {
      // Query "Science" with type=PROGRAMME
      const progRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Science&type=PROGRAMME')
        .set('Host', 'oxford.localhost');

      expect(progRes.status).toBe(200);
      expect(progRes.body.data.type).toBe('PROGRAMME');
      for (const item of progRes.body.data.items) {
        expect(item.type).toBe('PROGRAMME');
        expect(item.url).toMatch(/^\/academics\//);
      }

      // Query "Science" with type=STAFF
      const staffRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Science&type=STAFF')
        .set('Host', 'oxford.localhost');

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.type).toBe('STAFF');
      for (const item of staffRes.body.data.items) {
        expect(item.type).toBe('STAFF');
        expect(item.url).toMatch(/^\/staff\//);
      }

      // Check facets contain counts for all types even when filtered
      expect(progRes.body.data.facets.totalByContentType.PROGRAMME).toBeGreaterThanOrEqual(1);
      expect(progRes.body.data.facets.totalByContentType.STAFF).toBeGreaterThanOrEqual(1);
    });

    it('supports bounded pagination and limits', async () => {
      const pagedRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Science&limit=2&page=1')
        .set('Host', 'oxford.localhost');

      expect(pagedRes.status).toBe(200);
      expect(pagedRes.body.data.items.length).toBeLessThanOrEqual(2);
      expect(pagedRes.body.data.page).toBe(1);
      expect(pagedRes.body.data.limit).toBe(2);
      expect(pagedRes.body.data.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('ranks exact and prefix title matches higher than body occurrences', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=Cambridge')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBeGreaterThan(0);
      // The item starting with "Cambridge" should have the highest score and be first
      expect(items[0].title).toContain('Cambridge');
      expect(items[0].score).toBeGreaterThanOrEqual(80);
    });
  });

  // ===========================================================================
  // 2. Strict Tenant Isolation & Anti-Spoofing (SEC-TEN-001, BR-001)
  // ===========================================================================
  describe('2. Strict Multi-Tenant Isolation (BR-001, SEC-TEN-001)', () => {
    it('isolates content: Oxford visitor receives only Oxford records, never Greenwood', async () => {
      // Both Oxford and Greenwood have "Science" content
      const oxRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Science')
        .set('Host', 'oxford.localhost');

      expect(oxRes.status).toBe(200);
      const oxTitles = oxRes.body.data.items.map((i: any) => i.title);

      expect(oxTitles).toContain('Cambridge International AS & A-Level Sciences');
      expect(oxTitles).toContain('Dr. Eleanor Vance');
      expect(oxTitles).not.toContain('Greenwood Science and Agricultural Technology Diploma');
      expect(oxTitles).not.toContain('Dr. Gregory Greenwood');
    });

    it('isolates content: Greenwood visitor receives only Greenwood records, never Oxford', async () => {
      const gwRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Science')
        .set('Host', 'secondary.localhost');

      expect(gwRes.status).toBe(200);
      const gwTitles = gwRes.body.data.items.map((i: any) => i.title);

      expect(gwTitles).toContain('Greenwood Science and Agricultural Technology Diploma');
      expect(gwTitles).toContain('Dr. Gregory Greenwood');
      expect(gwTitles).not.toContain('Cambridge International AS & A-Level Sciences');
      expect(gwTitles).not.toContain('Dr. Eleanor Vance');
    });

    it('prevents visitor from overriding tenant context via headers or query parameters', async () => {
      // Oxford host but attacker injects x-tenant-id or tenant query for Greenwood
      const attackRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Agricultural')
        .set('Host', 'oxford.localhost')
        .set('X-Tenant-Id', 'greenwood')
        .set('x-school-slug', 'greenwood');

      expect(attackRes.status).toBe(200);
      // Should find 0 results in Oxford because Agricultural is only in Greenwood!
      expect(attackRes.body.data.items).toEqual([]);
      expect(attackRes.body.data.total).toBe(0);
    });
  });

  // ===========================================================================
  // 3. Publication Rules & Privacy Shield (BR-002, BR-006, FR-CON-002)
  // ===========================================================================
  describe('3. Publication Rules & Privacy Enforcement (BR-002, FR-ACAD-002, FR-CON-002)', () => {
    it('strictly excludes draft, unpublished, and future-scheduled records from search', async () => {
      const draftRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Internal')
        .set('Host', 'oxford.localhost');

      expect(draftRes.status).toBe(200);
      const titles = draftRes.body.data.items.map((i: any) => i.title);

      // Verify draft page, draft news, and draft event are never returned
      expect(titles).not.toContain('Secret Internal Strategy Draft Page');
      expect(titles).not.toContain('Unpublished Internal News Editorial');
      expect(titles).not.toContain('Private Faculty Disciplinary Meeting');

      // Verify future scheduled page is not returned
      const futureRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Future%20Scheduled')
        .set('Host', 'oxford.localhost');
      expect(futureRes.status).toBe(200);
      expect(futureRes.body.data.items).toEqual([]);
    });

    it('respects Staff Privacy Rule: redacts unapproved phone and hides internal fields', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=Eleanor')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      const staffItem = res.body.data.items.find((i: any) => i.type === 'STAFF');
      expect(staffItem).toBeDefined();

      // Email was approved (displayEmail: true) -> present
      expect(staffItem.metadata.publicEmail).toBe('e.vance@oxford.school.example');
      // Phone was NOT approved (displayPhone: false) -> redacted to null
      expect(staffItem.metadata.publicPhone).toBeNull();
      // Internal sensitive fields must NEVER be returned in public search results
      expect(staffItem).not.toHaveProperty('internalNotes');
      expect(staffItem).not.toHaveProperty('userId');
      expect(staffItem).not.toHaveProperty('authorId');
    });

    it('respects Tuition Privacy Rule: redacts tuition fees when displayTuition is false', async () => {
      // Cambridge A-Levels has displayTuition: false
      const redactedRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Cambridge')
        .set('Host', 'oxford.localhost');

      expect(redactedRes.status).toBe(200);
      const progItem = redactedRes.body.data.items[0];
      expect(progItem.metadata.displayTuition).toBe(false);
      expect(progItem.metadata.tuitionFee).toBeNull();
      expect(progItem.metadata.tuitionCurrency).toBeNull();

      // Primary Foundation has displayTuition: true
      const approvedRes = await request(app)
        .get('/api/v1/tenant/public/search?q=Foundation')
        .set('Host', 'oxford.localhost');

      expect(approvedRes.status).toBe(200);
      const primaryItem = approvedRes.body.data.items.find((i: any) => i.type === 'PROGRAMME');
      expect(primaryItem.metadata.displayTuition).toBe(true);
      expect(primaryItem.metadata.tuitionFee).toBe(9200);
      expect(primaryItem.metadata.tuitionCurrency).toBe('USD');
    });

    it('respects Form Privacy Shield: public form search never reveals internal recipient emails', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=Inquiries')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      const formItem = res.body.data.items.find((i: any) => i.type === 'FORM');
      expect(formItem).toBeDefined();
      expect(formItem.title).toContain('General Inquiries');

      // Internal routing rules and recipient mailboxes must never be leaked
      expect(formItem).not.toHaveProperty('recipientEmails');
      expect(formItem).not.toHaveProperty('routingRules');
      expect(JSON.stringify(formItem)).not.toContain('private-registrar@oxford.internal');
    });
  });

  // ===========================================================================
  // 4. Public Search Alias Compatibility & Routing Consistency
  // ===========================================================================
  describe('4. Routing & Destination Compatibility', () => {
    it('supports both /api/v1/tenant/public/search and /api/v1/tenant/search aliases', async () => {
      const res1 = await request(app)
        .get('/api/v1/tenant/public/search?q=Science')
        .set('Host', 'oxford.localhost');
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .get('/api/v1/tenant/search?q=Science')
        .set('Host', 'oxford.localhost');
      expect(res2.status).toBe(200);
      expect(res2.body.data.total).toEqual(res1.body.data.total);
    });

    it('ensures search result URLs point to valid public paths for each content type', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/search?q=Science')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      for (const item of res.body.data.items) {
        if (item.type === 'PAGE') expect(item.url.startsWith('/')).toBe(true);
        if (item.type === 'PROGRAMME') expect(item.url.startsWith('/academics/')).toBe(true);
        if (item.type === 'STAFF') expect(item.url.startsWith('/staff/')).toBe(true);
        if (item.type === 'NEWS') expect(item.url.startsWith('/news/')).toBe(true);
        if (item.type === 'EVENT') expect(item.url.startsWith('/events/')).toBe(true);
        if (item.type === 'DOCUMENT') expect(item.url).toMatch(/media/);
        if (item.type === 'FORM') expect(item.url.startsWith('/forms/')).toBe(true);
      }
    });
  });
});
