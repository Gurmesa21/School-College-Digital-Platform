import bcrypt from 'bcryptjs';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { InMemoryTenantRepository } from './repositories/tenantRepository.js';
import { InMemoryAuthRepository } from './repositories/authRepository.js';
import { InMemoryAuditRepository } from './repositories/auditRepository.js';
import { InMemoryCmsRepository } from './repositories/cmsRepository.js';
import { InMemoryNavigationRepository } from './repositories/navigationRepository.js';
import { InMemoryMediaRepository } from './repositories/mediaRepository.js';
import { InMemoryTaxonomyRepository } from './repositories/taxonomyRepository.js';
import { InMemoryFormRepository } from './repositories/formRepository.js';
import { InMemorySectionRepository } from './repositories/sectionRepository.js';
import { InMemoryAcademicRepository } from './repositories/academicRepository.js';
import { InMemoryStaffRepository } from './repositories/staffRepository.js';
import { InMemoryNewsRepository } from './repositories/newsRepository.js';
import { InMemoryAnnouncementRepository } from './repositories/announcementRepository.js';
import { InMemoryEventRepository } from './repositories/eventRepository.js';
import { InMemoryEmailService } from './services/emailService.js';
import { PERMISSIONS } from '@school/shared';

function isPlaceholderDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return !dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('postgres_placeholder');
}

async function startServer() {
  let app;

  if (isPlaceholderDatabase()) {
    console.log('[API] Notice: DATABASE_URL is unconfigured or placeholder.');
    console.log('[API] Initializing in-memory development repositories with baseline tenant and administrative data.');

    const tenantRepo = new InMemoryTenantRepository([
      {
        tenant: {
          id: 'tenant_oxford',
          slug: 'oxford',
          name: 'Oxford International School',
          institutionType: 'PRIMARY_SECONDARY',
          status: 'ACTIVE',
          timezone: 'UTC',
          defaultLocale: 'en',
          contactEmail: 'admin@oxford.school.example',
          matchedHostname: 'oxford.localhost',
          resolutionMethod: 'DOMAIN_MAPPING',
        },
        domains: ['oxford.localhost', 'oxford.local', 'localhost'],
      },
      {
        tenant: {
          id: 'tenant_greenwood',
          slug: 'greenwood',
          name: 'Greenwood Secondary School',
          institutionType: 'PRIMARY_SECONDARY',
          status: 'ACTIVE',
          timezone: 'UTC',
          defaultLocale: 'en',
          contactEmail: 'admin@greenwood.school.example',
          matchedHostname: 'greenwood.localhost',
          resolutionMethod: 'DOMAIN_MAPPING',
        },
        domains: ['greenwood.localhost', 'secondary.localhost'],
      },
    ]);

    const authRepo = new InMemoryAuthRepository();
    const auditRepo = new InMemoryAuditRepository();
    const emailService = new InMemoryEmailService();

    // Seed baseline tenant roles
    const adminRole = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      description: 'Full institutional management',
      isSystem: true,
      tenantId: 'tenant_oxford',
    });

    const tenantAdminPermissions = [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.AUDIT_READ,
    ];

    for (const permCode of tenantAdminPermissions) {
      await authRepo.assignPermissionToRole(adminRole.id, permCode);
    }

    const teacherRole = await authRepo.createRole({
      name: 'TEACHER',
      displayName: 'Teacher / Educator',
      description: 'Classroom and student management',
      isSystem: true,
      tenantId: 'tenant_oxford',
    });
    await authRepo.assignPermissionToRole(teacherRole.id, PERMISSIONS.USERS_READ);

    const superAdminRole = await authRepo.createRole({
      name: 'SUPER_ADMIN',
      displayName: 'Platform Super Administrator',
      description: 'Platform-level governance',
      isSystem: true,
      tenantId: null,
    });
    await authRepo.assignPermissionToRole(superAdminRole.id, PERMISSIONS.PLATFORM_ACCESS);
    await authRepo.assignPermissionToRole(superAdminRole.id, PERMISSIONS.AUDIT_READ);

    // Seed pre-registered administrator user (password: AdminPassword123!)
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash,
      status: 'ACTIVE',
      firstName: 'Institutional',
      lastName: 'Administrator',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(adminUser.id, { emailVerifiedAt: new Date() });

    const membership = await authRepo.createMembership({
      userId: adminUser.id,
      tenantId: 'tenant_oxford',
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(membership.id, adminRole.id);

    const cmsRepo = new InMemoryCmsRepository();
    // Seed initial published page for Oxford
    const welcomePage = await cmsRepo.createPage('tenant_oxford', adminUser.id, {
      title: 'Welcome to Oxford International School',
      slug: 'welcome',
      summary: 'A leading international day and boarding school providing world-class education.',
      seoTitle: 'Welcome | Oxford International School',
      seoDescription: 'Discover our world-class educational programmes and vibrant learning community.',
      canonicalUrl: 'http://oxford.localhost:3000/welcome',
      sections: [
        {
          sectionType: 'HERO',
          sortOrder: 0,
          isVisible: true,
          config: {
            headline: 'Empowering Minds, Shaping Global Leaders',
            subheadline: 'Excellence in international education since 1995.',
            ctaText: 'Explore Programmes',
            ctaLink: '/programmes',
            bgImageUrl: '',
          },
        },
        {
          sectionType: 'TEXT_CONTENT',
          sortOrder: 1,
          isVisible: true,
          config: {
            body: 'Welcome to Oxford International School. Our comprehensive curriculum blends academic rigour with character development, preparing students for success in an interconnected world.',
            alignment: 'left',
          },
        },
        {
          sectionType: 'FEATURE_GRID',
          sortOrder: 2,
          isVisible: true,
          config: {
            title: 'Why Choose Oxford International School',
            items: [
              { title: 'Global Curriculum', description: 'Internationally recognized qualifications accepted worldwide.', icon: 'globe' },
              { title: 'Dedicated Faculty', description: 'Experienced educators passionate about student growth.', icon: 'users' },
              { title: 'State-of-the-Art Labs', description: 'Modern science, robotics, and media laboratories.', icon: 'desktop' },
            ],
          },
        },
      ],
    });
    await cmsRepo.publishPage('tenant_oxford', welcomePage.id, adminUser.id);

    const navRepo = new InMemoryNavigationRepository();
    const headerMenu = await navRepo.upsertMenu('tenant_oxford', 'HEADER', 'Primary Header Navigation');
    await navRepo.addMenuItem('tenant_oxford', headerMenu.id, { label: 'Home', url: '/', order: 0, target: '_self', isVisible: true });
    await navRepo.addMenuItem('tenant_oxford', headerMenu.id, { label: 'Welcome', url: '/welcome', order: 1, target: '_self', isVisible: true });
    await navRepo.addMenuItem('tenant_oxford', headerMenu.id, { label: 'Admissions', url: '/admissions', order: 2, target: '_self', isVisible: true });
    await navRepo.addMenuItem('tenant_oxford', headerMenu.id, { label: 'Contact', url: '/contact', order: 3, target: '_self', isVisible: true });

    const mediaRepo = new InMemoryMediaRepository([
      {
        id: 'media_oxford_crest',
        tenantId: 'tenant_oxford',
        uploaderId: adminUser.id,
        title: 'Oxford International School Crest',
        altText: 'Official crest and emblem of Oxford International School',
        caption: 'Institutional emblem used on official publications.',
        category: 'LOGO',
        mimeType: 'image/png',
        fileSizeBytes: 45200,
        storageKey: 'public/tenants/tenant_oxford/media/oxford-crest.png',
        publicUrl: '/api/v1/tenant/public/media/oxford-crest.png',
        isPublic: true,
        isDecorative: false,
        storagePolicy: 'PUBLIC',
        storageProvider: 'local',
        categoryId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const taxRepo = new InMemoryTaxonomyRepository([
      {
        id: 'cat_academics',
        tenantId: 'tenant_oxford',
        name: 'Academics & Curriculum',
        slug: 'academics',
        type: 'GENERAL',
        description: 'Academic subjects and curriculum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const formRepo = new InMemoryFormRepository();
    const sectionRepo = new InMemorySectionRepository([
      {
        id: 'sec_campus_tour',
        tenantId: 'tenant_oxford',
        name: 'Campus Tour CTA Banner',
        slug: 'campus-tour-cta',
        description: 'Call to action banner inviting parents to book an in-person campus tour',
        sectionType: 'CTA_BANNER',
        category: 'Admissions',
        isGlobal: true,
        config: {
          headline: 'Experience Oxford First-Hand',
          subheadline: 'Schedule a private guided tour of our historic campus and state-of-the-art STEM facilities.',
          primaryButtonText: 'Book a Campus Tour',
          primaryButtonUrl: '/contact',
          secondaryButtonText: 'Download Prospectus',
          secondaryButtonUrl: '/news',
          theme: 'primary',
          alignment: 'center',
        },
        authorId: adminUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        placementCount: 0,
      },
      {
        id: 'sec_admissions_faq',
        tenantId: 'tenant_oxford',
        name: 'Admissions Frequently Asked Questions',
        slug: 'admissions-faq',
        description: 'Accordion of common admissions questions, key deadlines, and scholarship details',
        sectionType: 'ACCORDION',
        category: 'Admissions',
        isGlobal: true,
        config: {
          title: 'Admissions Frequently Asked Questions',
          subtitle: 'Everything you need to know about applying to Oxford for the 2026/2027 academic year.',
          items: [
            {
              id: 'faq-1',
              title: 'When is the application deadline for the autumn term?',
              content: 'Applications for the autumn cohort close on January 15, 2027. Early decision applications close on November 30, 2026.',
              isOpenDefault: true,
            },
            {
              id: 'faq-2',
              title: 'Does Oxford offer academic and athletic scholarships?',
              content: 'Yes. Merit-based scholarships covering up to 50% of tuition are awarded based on our annual entrance assessment.',
              isOpenDefault: false,
            },
            {
              id: 'faq-3',
              title: 'What documents are required during initial submission?',
              content: 'Submit official transcripts for the past two academic years, two educator references, and a copy of the student identification.',
              isOpenDefault: false,
            },
          ],
          allowMultipleOpen: true,
        },
        authorId: adminUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        placementCount: 0,
      },
    ]);

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      cmsRepository: cmsRepo,
      navigationRepository: navRepo,
      mediaRepository: mediaRepo,
      taxonomyRepository: taxRepo,
      formRepository: formRepo,
      sectionRepository: sectionRepo,
      academicRepository: new InMemoryAcademicRepository(),
      staffRepository: new InMemoryStaffRepository(),
      newsRepository: new InMemoryNewsRepository(),
      announcementRepository: new InMemoryAnnouncementRepository(),
      eventRepository: new InMemoryEventRepository(),
      emailService,
    });
  } else {
    app = createApp();
  }

  const server = app.listen(config.PORT, () => {
    console.log(`[API] Server listening on http://localhost:${config.PORT}`);
    console.log(`[API] Health check available at http://localhost:${config.PORT}/health`);
    console.log(`[API] Versioned prefix active at http://localhost:${config.PORT}${config.API_PREFIX}/health`);
  });

  // Graceful shutdown handling
  function shutdown(signal: string) {
    console.log(`[API] Received ${signal}. Starting graceful shutdown...`);
    server.close((err) => {
      if (err) {
        console.error('[API] Error during server close:', err);
        process.exit(1);
      }
      console.log('[API] Server closed gracefully. Process exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[API] Forceful shutdown initiated after timeout.');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[API] Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[API] Uncaught Exception:', error);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[API] Failed to start server:', err);
  process.exit(1);
});
