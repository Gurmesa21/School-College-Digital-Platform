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
import { ResolvedTenant, PublicSitemapEntryDto } from '@school/shared';

describe('Day 16 Suite — Public Tenant-Scoped Sitemap (GET /api/v1/tenant/public/sitemap)', () => {
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
    primaryDomain: 'oxford.school.example',
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
    matchedHostname: 'secondary.localhost',
    primaryDomain: 'greenwood.school.example',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  beforeEach(() => {
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

    const searchService = new SearchService(searchRepo, auditRepo);
    const emailService = new InMemoryEmailService();
    const authService = new AuthService(authRepo, emailService, 7, 60);
    const userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    const cmsService = new CmsService(cmsRepo, auditRepo);
    const navigationService = new NavigationService(navRepo, auditRepo);
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
      navigationService,
      mediaService,
      formService,
      academicService,
      staffService,
      newsService,
      announcementService,
      eventService,
      searchService,
    });
  });

  it('1. returns 200 with core public routes when tenant has no dynamic content', async () => {
    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const entries: PublicSitemapEntryDto[] = res.body.data;
    const locs = entries.map((e) => e.loc);

    expect(locs).toContain('/');
    expect(locs).toContain('/academics');
    expect(locs).toContain('/staff');
    expect(locs).toContain('/news');
    expect(locs).toContain('/events');
    expect(locs).toContain('/admissions');
    expect(locs).toContain('/contact');
    expect(locs).toContain('/documents');
    expect(locs).toContain('/search');
  });

  it('2. includes published CMS pages and excludes draft or expired pages', async () => {
    const now = new Date();

    // Published page for Oxford
    (cmsRepo as any).pages.set('page-1', {
      id: 'page-1',
      tenantId: 'tenant-oxford-id',
      title: 'About Our Campus',
      slug: 'about-us',
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 86400000),
      createdAt: now,
      updatedAt: now,
    });

    // Draft page for Oxford (must NOT appear)
    (cmsRepo as any).pages.set('page-2', {
      id: 'page-2',
      tenantId: 'tenant-oxford-id',
      title: 'Internal Draft Strategy',
      slug: 'internal-draft',
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });

    // Expired page for Oxford (must NOT appear)
    (cmsRepo as any).pages.set('page-3', {
      id: 'page-3',
      tenantId: 'tenant-oxford-id',
      title: 'Past Expo 2024',
      slug: 'past-expo-2024',
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 86400000 * 30),
      expiresAt: new Date(now.getTime() - 86400000),
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    const locs = res.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locs).toContain('/about-us');
    expect(locs).not.toContain('/internal-draft');
    expect(locs).not.toContain('/past-expo-2024');
  });

  it('3. includes active/published programmes and excludes unpublished programmes', async () => {
    const now = new Date();

    // Published programme
    (academicRepo as any).programmes.push({
      id: 'prog-1',
      tenantId: 'tenant-oxford-id',
      title: 'IGCSE Sciences',
      slug: 'igcse-sciences',
      status: 'PUBLISHED',
      isActive: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });

    // Unpublished programme (must NOT appear)
    (academicRepo as any).programmes.push({
      id: 'prog-2',
      tenantId: 'tenant-oxford-id',
      title: 'Unpublished Curriculum Draft',
      slug: 'unpublished-draft',
      status: 'DRAFT',
      isActive: true,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    const locs = res.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locs).toContain('/academics/igcse-sciences');
    expect(locs).not.toContain('/academics/unpublished-draft');
  });

  it('4. includes active/published staff profiles and excludes unpublished staff', async () => {
    const now = new Date();

    // Published staff
    (staffRepo as any).staff.push({
      id: 'staff-1',
      tenantId: 'tenant-oxford-id',
      fullName: 'Dr. Eleanor Vance',
      slug: 'eleanor-vance',
      roleTitle: 'Head of Physics',
      status: 'PUBLISHED',
      isActive: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });

    // Unpublished staff
    (staffRepo as any).staff.push({
      id: 'staff-2',
      tenantId: 'tenant-oxford-id',
      fullName: 'Hidden Staff Member',
      slug: 'hidden-staff',
      roleTitle: 'Consultant',
      status: 'DRAFT',
      isActive: true,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    const locs = res.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locs).toContain('/staff/eleanor-vance');
    expect(locs).not.toContain('/staff/hidden-staff');
  });

  it('5. includes published news articles and events', async () => {
    const now = new Date();

    // Published news
    (newsRepo as any).items.push({
      id: 'news-1',
      tenantId: 'tenant-oxford-id',
      title: 'Annual Science Fair Winners',
      slug: 'science-fair-winners',
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 3600000),
      createdAt: now,
      updatedAt: now,
    });

    // Published event
    (eventRepo as any).items.push({
      id: 'event-1',
      tenantId: 'tenant-oxford-id',
      title: 'Open Campus Day 2026',
      slug: 'open-campus-day-2026',
      status: 'PUBLISHED',
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    const locs = res.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locs).toContain('/news/science-fair-winners');
    expect(locs).toContain('/events/open-campus-day-2026');
  });

  it('6. strictly enforces tenant isolation — no Greenwood items appear in Oxford sitemap (BR-001)', async () => {
    const now = new Date();

    // Greenwood published page
    (cmsRepo as any).pages.set('gw-page-1', {
      id: 'gw-page-1',
      tenantId: 'tenant-greenwood-id',
      title: 'Greenwood History',
      slug: 'greenwood-history',
      status: 'PUBLISHED',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Greenwood programme
    (academicRepo as any).programmes.push({
      id: 'gw-prog-1',
      tenantId: 'tenant-greenwood-id',
      title: 'Greenwood Arts',
      slug: 'greenwood-arts',
      status: 'PUBLISHED',
      isActive: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });

    // Query Oxford sitemap
    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'oxford.localhost');

    expect(res.status).toBe(200);
    const locs = res.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locs).not.toContain('/greenwood-history');
    expect(locs).not.toContain('/academics/greenwood-arts');

    // Query Greenwood sitemap
    const resGw = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'secondary.localhost');

    expect(resGw.status).toBe(200);
    const locsGw = resGw.body.data.map((e: PublicSitemapEntryDto) => e.loc);

    expect(locsGw).toContain('/greenwood-history');
    expect(locsGw).toContain('/academics/greenwood-arts');
  });

  it('7. returns 404 Not Found when host header does not match any tenant', async () => {
    const res = await request(app)
      .get('/api/v1/tenant/public/sitemap')
      .set('Host', 'unrecognized-domain.org');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

