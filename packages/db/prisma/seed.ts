import {
  PrismaClient,
  InstitutionType,
  TenantStatus,
  UserStatus,
  MembershipStatus,
  PageStatus,
  SectionType,
  NavigationLocation,
  MediaCategory,
  CategoryType,
  FormType,
  FormFieldType,
  SubmissionStatus,
  AnnouncementPriority,
  AnnouncementAudience,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface SeedTenantData {
  slug: string;
  name: string;
  institutionType: InstitutionType;
  status: TenantStatus;
  timezone: string;
  defaultLocale: string;
  contactEmail: string;
  domains: Array<{
    hostname: string;
    isPrimary: boolean;
    isVerified: boolean;
  }>;
}

export const DEVELOPMENT_SEED_TENANTS: SeedTenantData[] = [
  {
    slug: 'oxford',
    name: 'Oxford International School',
    institutionType: InstitutionType.PRIMARY_SECONDARY,
    status: TenantStatus.ACTIVE,
    timezone: 'UTC',
    defaultLocale: 'en',
    contactEmail: 'admin@oxford.school.example',
    domains: [
      { hostname: 'oxford.localhost', isPrimary: true, isVerified: true },
      { hostname: 'oxford.local', isPrimary: false, isVerified: true },
      { hostname: 'localhost', isPrimary: false, isVerified: true },
    ],
  },
  {
    slug: 'little-explorers-kindergarten',
    name: 'Little Explorers Kindergarten',
    institutionType: InstitutionType.KINDERGARTEN,
    status: TenantStatus.ACTIVE,
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'info@littleexplorers.school.example',
    domains: [
      { hostname: 'kindergarten.localhost', isPrimary: true, isVerified: true },
    ],
  },
  {
    slug: 'greenwood-secondary-school',
    name: 'Greenwood Secondary School',
    institutionType: InstitutionType.PRIMARY_SECONDARY,
    status: TenantStatus.ACTIVE,
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admissions@greenwood.school.example',
    domains: [
      { hostname: 'secondary.localhost', isPrimary: true, isVerified: true },
      { hostname: 'greenwood.localhost', isPrimary: false, isVerified: true },
    ],
  },
  {
    slug: 'summit-tvet-institute',
    name: 'Summit TVET & Vocational Institute',
    institutionType: InstitutionType.TVET_TRAINING_CENTRE,
    status: TenantStatus.ACTIVE,
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'registrar@summit-tvet.edu.example',
    domains: [
      { hostname: 'tvet.localhost', isPrimary: true, isVerified: true },
    ],
  },
  {
    slug: 'heritage-academy-suspended',
    name: 'Heritage Academy (Suspended Institution)',
    institutionType: InstitutionType.PRIMARY_SECONDARY,
    status: TenantStatus.SUSPENDED,
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'billing@heritage.school.example',
    domains: [
      { hostname: 'suspended.localhost', isPrimary: true, isVerified: true },
    ],
  },
];

export const SYSTEM_PERMISSIONS: Array<{ code: string; category: string; description: string }> = [
  // Platform operations
  { code: 'platform:access', category: 'platform', description: 'Access platform administration operations' },
  { code: 'platform:tenants:manage', category: 'platform', description: 'Create, update, or suspend tenant accounts' },

  // Tenant Settings
  { code: 'tenant:profile:read', category: 'tenant_settings', description: 'View institution profile and configurations' },
  { code: 'tenant:profile:update', category: 'tenant_settings', description: 'Update institution profile and configurations' },
  { code: 'tenant:branding:update', category: 'tenant_settings', description: 'Update institution visual identity and branding' },

  // Users and Access
  { code: 'users:read', category: 'users_and_access', description: 'List institutional members and users' },
  { code: 'users:invite', category: 'users_and_access', description: 'Invite new institutional staff members' },
  { code: 'users:manage', category: 'users_and_access', description: 'Deactivate or adjust user membership' },
  { code: 'roles:read', category: 'users_and_access', description: 'View tenant role and permission assignments' },
  { code: 'roles:assign', category: 'users_and_access', description: 'Assign roles to institutional members' },

  // CMS & Content
  { code: 'cms:pages:read', category: 'cms', description: 'View unpublished and draft CMS content' },
  { code: 'cms:pages:write', category: 'cms', description: 'Create and edit CMS content drafts' },
  { code: 'cms:pages:publish', category: 'cms', description: 'Publish CMS pages to the public website' },

  // Admissions
  { code: 'admissions:read', category: 'admissions', description: 'View admissions enquiries and applications' },
  { code: 'admissions:review', category: 'admissions', description: 'Review and update admission applicant statuses' },
  { code: 'admissions:manage', category: 'admissions', description: 'Configure admission cycles and decision forms' },

  // Navigation & Media (Day 6)
  { code: 'cms:navigation:read', category: 'cms', description: 'View institution navigation menus' },
  { code: 'cms:navigation:write', category: 'cms', description: 'Configure institution header and footer navigation' },
  { code: 'media:read', category: 'media', description: 'View media library assets and documents' },
  { code: 'media:write', category: 'media', description: 'Upload and edit media library assets' },
  { code: 'media:delete', category: 'media', description: 'Delete media library assets' },
  { code: 'taxonomy:read', category: 'taxonomy', description: 'View content taxonomy categories' },
  { code: 'taxonomy:write', category: 'taxonomy', description: 'Manage content taxonomy categories' },

  // Forms & Admissions Submissions (Day 7)
  { code: 'cms:forms:read', category: 'cms', description: 'View form definitions and submissions' },
  { code: 'cms:forms:write', category: 'cms', description: 'Create, update, and manage dynamic forms' },

  // Academic Catalogue & Structures (Day 9)
  { code: 'academics:read', category: 'academics', description: 'View academic catalogue structures and draft programmes' },
  { code: 'academics:write', category: 'academics', description: 'Create, edit, and configure academic structures and programmes' },
  { code: 'academics:publish', category: 'academics', description: 'Publish academic programmes and catalogue records to public site' },

  // Staff Directory & Profiles (Day 10)
  { code: 'staff:read', category: 'staff', description: 'View staff directory records and unpublished draft profiles' },
  { code: 'staff:write', category: 'staff', description: 'Create, edit, and configure staff member profiles' },
  { code: 'staff:publish', category: 'staff', description: 'Publish or archive staff profiles on the public directory' },

  // News, Notices & Events (Day 12)
  { code: 'news:read', category: 'news', description: 'View news articles and unpublished drafts' },
  { code: 'news:write', category: 'news', description: 'Create and edit news stories' },
  { code: 'news:publish', category: 'news', description: 'Publish news stories to public website' },
  { code: 'announcements:read', category: 'announcements', description: 'View operational announcements and drafts' },
  { code: 'announcements:write', category: 'announcements', description: 'Create and edit operational announcements' },
  { code: 'announcements:publish', category: 'announcements', description: 'Publish notices to active banners and feeds' },
  { code: 'events:read', category: 'events', description: 'View institutional calendar events and drafts' },
  { code: 'events:write', category: 'events', description: 'Create and edit institutional calendar events' },
  { code: 'events:publish', category: 'events', description: 'Publish calendar events to public directory' },

  // Analytics
  { code: 'analytics:view', category: 'analytics', description: 'View institution traffic and admissions analytics' },

  // Audit
  { code: 'audit:read', category: 'audit', description: 'View immutable administrative audit history' },
];

export const SYSTEM_ROLES: Array<{
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}> = [
  {
    name: 'SUPER_ADMIN',
    displayName: 'Platform Super Administrator',
    description: 'Global operations, tenant lifecycle, and service-level platform administration',
    isSystem: true,
    permissions: ['platform:access', 'platform:tenants:manage', 'audit:read'],
  },
  {
    name: 'TENANT_ADMIN',
    displayName: 'Institutional Administrator',
    description: 'Full institutional management for a single institution site',
    isSystem: true,
    permissions: [
      'tenant:profile:read',
      'tenant:profile:update',
      'tenant:branding:update',
      'users:read',
      'users:invite',
      'users:manage',
      'roles:read',
      'roles:assign',
      'cms:pages:read',
      'cms:pages:write',
      'cms:pages:publish',
      'cms:navigation:read',
      'cms:navigation:write',
      'media:read',
      'media:write',
      'media:delete',
      'taxonomy:read',
      'taxonomy:write',
      'cms:forms:read',
      'cms:forms:write',
      'academics:read',
      'academics:write',
      'academics:publish',
      'staff:read',
      'staff:write',
      'staff:publish',
      'news:read',
      'news:write',
      'news:publish',
      'announcements:read',
      'announcements:write',
      'announcements:publish',
      'events:read',
      'events:write',
      'events:publish',
      'admissions:read',
      'admissions:review',
      'admissions:manage',
      'analytics:view',
      'audit:read',
    ],
  },
  {
    name: 'PRINCIPAL',
    displayName: 'Principal / Academic Leadership',
    description: 'Academic oversight, admissions decisioning, and published content review',
    isSystem: true,
    permissions: [
      'tenant:profile:read',
      'cms:pages:read',
      'cms:pages:write',
      'cms:pages:publish',
      'cms:navigation:read',
      'media:read',
      'taxonomy:read',
      'cms:forms:read',
      'academics:read',
      'academics:write',
      'academics:publish',
      'staff:read',
      'staff:write',
      'staff:publish',
      'news:read',
      'news:write',
      'news:publish',
      'announcements:read',
      'announcements:write',
      'announcements:publish',
      'events:read',
      'events:write',
      'events:publish',
      'admissions:read',
      'admissions:review',
      'analytics:view',
    ],
  },
  {
    name: 'ADMISSIONS_OFFICER',
    displayName: 'Admissions Officer',
    description: 'Review admissions enquiries, documents, and application reviews',
    isSystem: true,
    permissions: [
      'cms:forms:read',
      'cms:forms:write',
      'admissions:read',
      'admissions:review',
      'admissions:manage',
    ],
  },
  {
    name: 'STAFF',
    displayName: 'Staff / Educator',
    description: 'Author institutional drafts and view staff-facing updates',
    isSystem: true,
    permissions: [
      'cms:pages:read',
      'cms:pages:write',
      'cms:navigation:read',
      'media:read',
      'media:write',
      'taxonomy:read',
      'staff:read',
      'news:read',
      'news:write',
      'announcements:read',
      'events:read',
      'events:write',
    ],
  },
];

export async function seedDevelopmentData(): Promise<void> {
  // Safety guard: Never run development seed in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Attempted to run development seed script in a production environment. Execution halted.');
  }

  console.log('[Seed] Seeding development multi-tenant baseline data...');

  // 1. Seed baseline tenants and domains
  for (const tenantData of DEVELOPMENT_SEED_TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantData.slug },
      update: {
        name: tenantData.name,
        institutionType: tenantData.institutionType,
        status: tenantData.status,
        timezone: tenantData.timezone,
        defaultLocale: tenantData.defaultLocale,
        contactEmail: tenantData.contactEmail,
      },
      create: {
        slug: tenantData.slug,
        name: tenantData.name,
        institutionType: tenantData.institutionType,
        status: tenantData.status,
        timezone: tenantData.timezone,
        defaultLocale: tenantData.defaultLocale,
        contactEmail: tenantData.contactEmail,
      },
    });

    console.log(`[Seed] Synced Tenant: ${tenant.name} (${tenant.slug}) [${tenant.status}]`);

    for (const domain of tenantData.domains) {
      await prisma.tenantDomain.upsert({
        where: { hostname: domain.hostname },
        update: {
          isPrimary: domain.isPrimary,
          isVerified: domain.isVerified,
          tenantId: tenant.id,
        },
        create: {
          hostname: domain.hostname,
          isPrimary: domain.isPrimary,
          isVerified: domain.isVerified,
          tenantId: tenant.id,
        },
      });
      console.log(`  -> Mapped Hostname: ${domain.hostname} -> ${tenant.slug}`);
    }
  }

  // 2. Seed system permissions idempotently
  console.log('[Seed] Registering system permissions...');
  const permissionMap = new Map<string, string>();
  for (const perm of SYSTEM_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        category: perm.category,
        description: perm.description,
      },
      create: {
        code: perm.code,
        category: perm.category,
        description: perm.description,
      },
    });
    permissionMap.set(perm.code, record.id);
  }
  console.log(`[Seed] Synced ${permissionMap.size} system permissions.`);

  // 3. Seed system roles and their permission assignments
  console.log('[Seed] Registering system roles and permissions...');
  for (const roleDef of SYSTEM_ROLES) {
    // Locate existing system role or create
    const existing = await prisma.role.findFirst({
      where: { name: roleDef.name, tenantId: null },
    });

    let roleId: string;
    if (existing) {
      const updated = await prisma.role.update({
        where: { id: existing.id },
        data: {
          displayName: roleDef.displayName,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
        },
      });
      roleId = updated.id;
    } else {
      const created = await prisma.role.create({
        data: {
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          tenantId: null,
        },
      });
      roleId = created.id;
    }

    // Connect permissions to role
    for (const permCode of roleDef.permissions) {
      const permId = permissionMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId: permId,
          },
        });
      }
    }

    console.log(`[Seed] Synced System Role: ${roleDef.name} (${roleDef.displayName}) with ${roleDef.permissions.length} permissions.`);
  }

  // 4. Seed development users and tenant memberships
  console.log('[Seed] Seeding development administrative and staff users...');
  const defaultPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);

  // Platform Super Administrator
  await prisma.user.upsert({
    where: { email: 'superadmin@schoolplatform.example' },
    update: {
      passwordHash: superAdminPasswordHash,
      isSuperAdmin: true,
      status: UserStatus.ACTIVE,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'superadmin@schoolplatform.example',
      passwordHash: superAdminPasswordHash,
      isSuperAdmin: true,
      status: UserStatus.ACTIVE,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('  -> Seeded User: superadmin@schoolplatform.example (SUPER_ADMIN)');

  const tenantAdminRole = await prisma.role.findFirst({
    where: { name: 'TENANT_ADMIN', tenantId: null },
  });

  const staffRole = await prisma.role.findFirst({
    where: { name: 'STAFF', tenantId: null },
  });

  // Oxford Administrator
  const oxfordTenant = await prisma.tenant.findUnique({ where: { slug: 'oxford' } });
  if (oxfordTenant && tenantAdminRole) {
    const oxfordUser = await prisma.user.upsert({
      where: { email: 'admin@oxford.edu' },
      update: {
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
        firstName: 'Oxford',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      },
      create: {
        email: 'admin@oxford.edu',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
        firstName: 'Oxford',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      },
    });

    const oxfordMembership = await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: oxfordUser.id,
          tenantId: oxfordTenant.id,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        userId: oxfordUser.id,
        tenantId: oxfordTenant.id,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId: oxfordMembership.id,
          roleId: tenantAdminRole.id,
        },
      },
      update: {},
      create: {
        membershipId: oxfordMembership.id,
        roleId: tenantAdminRole.id,
      },
    });
    console.log('  -> Seeded User: admin@oxford.edu -> Oxford Administrator');
  }

  // Greenwood Administrator
  const greenwoodTenant = await prisma.tenant.findUnique({ where: { slug: 'greenwood-secondary-school' } });
  if (greenwoodTenant && tenantAdminRole) {
    const greenwoodUser = await prisma.user.upsert({
      where: { email: 'admin@greenwood.school.example' },
      update: {
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
        firstName: 'Greenwood',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      },
      create: {
        email: 'admin@greenwood.school.example',
        passwordHash: defaultPasswordHash,
        status: UserStatus.ACTIVE,
        firstName: 'Greenwood',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      },
    });

    const greenwoodMembership = await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: greenwoodUser.id,
          tenantId: greenwoodTenant.id,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        userId: greenwoodUser.id,
        tenantId: greenwoodTenant.id,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId: greenwoodMembership.id,
          roleId: tenantAdminRole.id,
        },
      },
      update: {},
      create: {
        membershipId: greenwoodMembership.id,
        roleId: tenantAdminRole.id,
      },
    });
    console.log('  -> Seeded User: admin@greenwood.school.example -> Greenwood Administrator');

    // Greenwood Staff
    if (staffRole) {
      const staffUser = await prisma.user.upsert({
        where: { email: 'staff@greenwood.school.example' },
        update: {
          passwordHash: defaultPasswordHash,
          status: UserStatus.ACTIVE,
          firstName: 'Greenwood',
          lastName: 'Teacher',
          emailVerifiedAt: new Date(),
        },
        create: {
          email: 'staff@greenwood.school.example',
          passwordHash: defaultPasswordHash,
          status: UserStatus.ACTIVE,
          firstName: 'Greenwood',
          lastName: 'Teacher',
          emailVerifiedAt: new Date(),
        },
      });

      const staffMembership = await prisma.membership.upsert({
        where: {
          userId_tenantId: {
            userId: staffUser.id,
            tenantId: greenwoodTenant.id,
          },
        },
        update: { status: MembershipStatus.ACTIVE },
        create: {
          userId: staffUser.id,
          tenantId: greenwoodTenant.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      await prisma.membershipRole.upsert({
        where: {
          membershipId_roleId: {
            membershipId: staffMembership.id,
            roleId: staffRole.id,
          },
        },
        update: {},
        create: {
          membershipId: staffMembership.id,
          roleId: staffRole.id,
        },
      });
      console.log('  -> Seeded User: staff@greenwood.school.example -> Greenwood Staff');
    }
  }

  // 5. Seed baseline CMS pages for development
  console.log('[Seed] Seeding baseline CMS pages...');
  if (oxfordTenant) {
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@oxford.edu' } });

    // 1. Published Welcome Page
    const welcomePage = await prisma.page.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'welcome',
        },
      },
      update: {
        title: 'Welcome to Oxford International School',
        summary: 'A premier educational institution offering British and International curricula from Kindergarten to Year 13.',
        status: PageStatus.PUBLISHED,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        seoTitle: 'Welcome | Oxford International School',
        seoDescription: 'Empowering minds, shaping global leaders. Discover Oxford International School programs and admissions.',
        canonicalUrl: 'http://oxford.localhost:3000/welcome',
        authorId: adminUser?.id,
        lastEditorId: adminUser?.id,
      },
      create: {
        tenantId: oxfordTenant.id,
        slug: 'welcome',
        title: 'Welcome to Oxford International School',
        summary: 'A premier educational institution offering British and International curricula from Kindergarten to Year 13.',
        status: PageStatus.PUBLISHED,
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        seoTitle: 'Welcome | Oxford International School',
        seoDescription: 'Empowering minds, shaping global leaders. Discover Oxford International School programs and admissions.',
        canonicalUrl: 'http://oxford.localhost:3000/welcome',
        authorId: adminUser?.id,
        lastEditorId: adminUser?.id,
        version: 1,
      },
    });

    // Remove existing sections and recreate idempotently
    await prisma.pageSection.deleteMany({ where: { pageId: welcomePage.id } });
    await prisma.pageSection.createMany({
      data: [
        {
          pageId: welcomePage.id,
          sectionType: SectionType.HERO,
          sortOrder: 0,
          isVisible: true,
          config: {
            headline: 'Empowering Minds, Shaping Global Leaders',
            subheadline: 'Excellence in international education, holistic development, and digital innovation since 1995.',
            ctaText: 'Explore Academic Catalog',
            ctaLink: '/programmes',
            bgImageUrl: '',
          },
        },
        {
          pageId: welcomePage.id,
          sectionType: SectionType.TEXT_CONTENT,
          sortOrder: 1,
          isVisible: true,
          config: {
            body: 'At Oxford International School, we foster curiosity, resilience, and compassion. Our international faculty guides learners through a rigorous, inquiry-based curriculum complemented by rich arts, athletics, and STEM programs.',
            alignment: 'left',
          },
        },
        {
          pageId: welcomePage.id,
          sectionType: SectionType.FEATURE_GRID,
          sortOrder: 2,
          isVisible: true,
          config: {
            title: 'Our Educational Pillars',
            items: [
              { title: 'Global Standards', description: 'Dual accredited qualifications preparing students for top universities worldwide.', icon: 'globe' },
              { title: 'Inquiry-Based Learning', description: 'Hands-on experiential learning promoting critical thinking and innovation.', icon: 'lightbulb' },
              { title: 'Inclusive Community', description: 'Vibrant multicultural student body representing over 40 nationalities.', icon: 'users' },
            ],
          },
        },
      ],
    });
    console.log('  -> Seeded CMS Page: "welcome" (PUBLISHED) with 3 sections for Oxford');

    // 2. Draft Page (About Us)
    await prisma.page.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'about-us-draft',
        },
      },
      update: {
        title: 'About Our Institution (Draft)',
        summary: 'Institutional history, mission, leadership, and vision.',
        status: PageStatus.DRAFT,
      },
      create: {
        tenantId: oxfordTenant.id,
        slug: 'about-us-draft',
        title: 'About Our Institution (Draft)',
        summary: 'Institutional history, mission, leadership, and vision.',
        status: PageStatus.DRAFT,
        authorId: adminUser?.id,
        lastEditorId: adminUser?.id,
        version: 1,
      },
    });
    console.log('  -> Seeded CMS Page: "about-us-draft" (DRAFT) for Oxford');

    // 6. Seed Baseline Categories (Day 6 Taxonomy)
    const categoryNames = [
      { name: 'Academics & Curriculum', slug: 'academics', type: CategoryType.GENERAL, description: 'Academic courses, subjects, and curricula' },
      { name: 'Admissions & Enrolment', slug: 'admissions', type: CategoryType.GENERAL, description: 'Prospectus, admissions cycles, and guides' },
      { name: 'Campus Life & Athletics', slug: 'campus-life', type: CategoryType.MEDIA, description: 'Extra-curriculars, student life, and facilities' },
      { name: 'Institutional Governance', slug: 'governance', type: CategoryType.PAGE, description: 'Leadership policies and institutional governance' },
    ];
    for (const cat of categoryNames) {
      await prisma.category.upsert({
        where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: cat.slug } },
        update: { name: cat.name, type: cat.type, description: cat.description },
        create: { tenantId: oxfordTenant.id, name: cat.name, slug: cat.slug, type: cat.type, description: cat.description },
      });
    }
    console.log('  -> Seeded 4 Taxonomy Categories for Oxford');

    // 7. Seed Navigation Menus & Items (Day 6 Navigation)
    const headerMenu = await prisma.navigationMenu.upsert({
      where: { tenantId_location: { tenantId: oxfordTenant.id, location: NavigationLocation.HEADER } },
      update: { title: 'Primary Header Navigation', isPublished: true },
      create: { tenantId: oxfordTenant.id, location: NavigationLocation.HEADER, title: 'Primary Header Navigation', isPublished: true },
    });

    await prisma.navigationMenuItem.deleteMany({ where: { menuId: headerMenu.id } });
    await prisma.navigationMenuItem.createMany({
      data: [
        { menuId: headerMenu.id, label: 'Home', url: '/', target: '_self', order: 0, isVisible: true },
        { menuId: headerMenu.id, label: 'Welcome', url: '/welcome', target: '_self', order: 1, isVisible: true, pageId: welcomePage.id },
        { menuId: headerMenu.id, label: 'Admissions', url: '/admissions', target: '_self', order: 2, isVisible: true },
        { menuId: headerMenu.id, label: 'Academics', url: '/academics', target: '_self', order: 3, isVisible: true },
        { menuId: headerMenu.id, label: 'Contact', url: '/contact', target: '_self', order: 4, isVisible: true },
      ],
    });

    const footerMenu = await prisma.navigationMenu.upsert({
      where: { tenantId_location: { tenantId: oxfordTenant.id, location: NavigationLocation.FOOTER } },
      update: { title: 'Footer Links', isPublished: true },
      create: { tenantId: oxfordTenant.id, location: NavigationLocation.FOOTER, title: 'Footer Links', isPublished: true },
    });

    await prisma.navigationMenuItem.deleteMany({ where: { menuId: footerMenu.id } });
    await prisma.navigationMenuItem.createMany({
      data: [
        { menuId: footerMenu.id, label: 'Privacy Policy', url: '/privacy', target: '_self', order: 0, isVisible: true },
        { menuId: footerMenu.id, label: 'Terms of Service', url: '/terms', target: '_self', order: 1, isVisible: true },
        { menuId: footerMenu.id, label: 'Staff & Admin Portal', url: '/admin', target: '_self', order: 2, isVisible: true },
      ],
    });
    console.log('  -> Seeded Navigation Menus (HEADER & FOOTER) with items for Oxford');

    // 8. Seed Media Assets (Day 6 Media Library)
    const mediaSeeds = [
      {
        title: 'Oxford International School Crest',
        altText: 'Official crest and emblem of Oxford International School',
        caption: 'Institutional emblem used on official publications.',
        category: MediaCategory.LOGO,
        mimeType: 'image/png',
        fileSizeBytes: 45200,
        storageKey: `tenants/${oxfordTenant.id}/media/oxford-crest.png`,
        publicUrl: `/api/v1/tenant/public/media/oxford-crest.png`,
        isPublic: true,
        isDecorative: false,
      },
      {
        title: 'Modern Campus Library & Innovation Hub',
        altText: 'Students collaborating inside the modern architectural library at Oxford International School',
        caption: 'The library supports independent research and collaborative projects.',
        category: MediaCategory.IMAGE,
        mimeType: 'image/jpeg',
        fileSizeBytes: 248000,
        storageKey: `tenants/${oxfordTenant.id}/media/campus-library.jpg`,
        publicUrl: `/api/v1/tenant/public/media/campus-library.jpg`,
        isPublic: true,
        isDecorative: false,
      },
      {
        title: 'Official School Prospectus 2026-2027',
        altText: 'Comprehensive guide to educational programmes, faculty, and student admissions',
        caption: 'Downloadable prospectus for prospective parents and students.',
        category: MediaCategory.DOCUMENT,
        mimeType: 'application/pdf',
        fileSizeBytes: 1540000,
        storageKey: `tenants/${oxfordTenant.id}/media/prospectus-2026.pdf`,
        publicUrl: `/api/v1/tenant/public/media/prospectus-2026.pdf`,
        isPublic: true,
        isDecorative: false,
      },
      {
        title: 'Confidential Admissions Criteria & Assessment Rubric',
        altText: null,
        caption: 'Internal rubric for admissions review committee.',
        category: MediaCategory.DOCUMENT,
        mimeType: 'application/pdf',
        fileSizeBytes: 320000,
        storageKey: `tenants/${oxfordTenant.id}/media/confidential-admissions-rubric.pdf`,
        publicUrl: '',
        isPublic: false,
        isDecorative: false,
      },
    ];

    await prisma.mediaAsset.deleteMany({ where: { tenantId: oxfordTenant.id } });
    for (const media of mediaSeeds) {
      await prisma.mediaAsset.create({
        data: {
          tenantId: oxfordTenant.id,
          uploaderId: adminUser?.id,
          title: media.title,
          altText: media.altText,
          caption: media.caption,
          category: media.category,
          mimeType: media.mimeType,
          fileSizeBytes: media.fileSizeBytes,
          storageKey: media.storageKey,
          publicUrl: media.publicUrl,
          isPublic: media.isPublic,
          isDecorative: media.isDecorative,
          storagePolicy: media.isPublic ? 'PUBLIC' : 'PRIVATE',
          storageProvider: 'local',
        },
      });
    }
    console.log('  -> Seeded 4 Media Assets (3 public, 1 private access-controlled) for Oxford');

    // 9. Seed Dynamic Forms & Submissions (Day 7)
    console.log('[Seed] Seeding dynamic forms and admissions submissions for Oxford...');

    // Form 1: Contact & General Enquiries
    const contactForm = await prisma.form.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'contact-us',
        },
      },
      update: {
        title: 'Contact & General Enquiries',
        description: 'Have questions about Oxford International School? Get in touch with our team.',
        type: FormType.CONTACT_US,
        recipientEmails: ['admissions@oxford.school.example', 'info@oxford.school.example'],
        isPublished: true,
        successMessage: 'Thank you for contacting Oxford International School. A member of our team will respond within 1 business day.',
        submitButtonText: 'Send Message',
      },
      create: {
        tenantId: oxfordTenant.id,
        slug: 'contact-us',
        title: 'Contact & General Enquiries',
        description: 'Have questions about Oxford International School? Get in touch with our team.',
        type: FormType.CONTACT_US,
        recipientEmails: ['admissions@oxford.school.example', 'info@oxford.school.example'],
        isPublished: true,
        successMessage: 'Thank you for contacting Oxford International School. A member of our team will respond within 1 business day.',
        submitButtonText: 'Send Message',
      },
    });

    await prisma.formField.deleteMany({ where: { formId: contactForm.id } });
    await prisma.formField.createMany({
      data: [
        {
          formId: contactForm.id,
          name: 'fullName',
          label: 'Full Name',
          fieldType: FormFieldType.TEXT,
          placeholder: 'e.g. Jane Doe',
          isRequired: true,
          orderIndex: 0,
        },
        {
          formId: contactForm.id,
          name: 'email',
          label: 'Email Address',
          fieldType: FormFieldType.EMAIL,
          placeholder: 'jane.doe@example.com',
          isRequired: true,
          orderIndex: 1,
        },
        {
          formId: contactForm.id,
          name: 'phone',
          label: 'Phone Number',
          fieldType: FormFieldType.PHONE,
          placeholder: '+251 91 123 4567',
          isRequired: false,
          orderIndex: 2,
        },
        {
          formId: contactForm.id,
          name: 'department',
          label: 'Department / Enquiry Category',
          fieldType: FormFieldType.SELECT,
          isRequired: true,
          orderIndex: 3,
          options: [
            { label: 'General Enquiry', value: 'general' },
            { label: 'Admissions & Enrollment', value: 'admissions' },
            { label: 'Finance & Tuition', value: 'finance' },
            { label: 'Academic Curriculum', value: 'academics' },
          ],
        },
        {
          formId: contactForm.id,
          name: 'message',
          label: 'Your Message',
          fieldType: FormFieldType.TEXTAREA,
          placeholder: 'How can our administration assist you?',
          isRequired: true,
          orderIndex: 4,
        },
      ],
    });

    // Form 2: Admissions Application Form
    const admissionsForm = await prisma.form.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'admissions-application',
        },
      },
      update: {
        title: 'Admissions Application Form 2026-2027',
        description: 'Submit your student application for the upcoming academic year.',
        type: FormType.APPLICATION,
        recipientEmails: ['admissions@oxford.school.example'],
        isPublished: true,
        successMessage: 'Your admissions application has been submitted successfully. The Admissions Office will review your details and contact you for assessment scheduling.',
        submitButtonText: 'Submit Application',
      },
      create: {
        tenantId: oxfordTenant.id,
        slug: 'admissions-application',
        title: 'Admissions Application Form 2026-2027',
        description: 'Submit your student application for the upcoming academic year.',
        type: FormType.APPLICATION,
        recipientEmails: ['admissions@oxford.school.example'],
        isPublished: true,
        successMessage: 'Your admissions application has been submitted successfully. The Admissions Office will review your details and contact you for assessment scheduling.',
        submitButtonText: 'Submit Application',
      },
    });

    await prisma.formField.deleteMany({ where: { formId: admissionsForm.id } });
    await prisma.formField.createMany({
      data: [
        {
          formId: admissionsForm.id,
          name: 'studentFullName',
          label: 'Student Full Name',
          fieldType: FormFieldType.TEXT,
          placeholder: 'e.g. Dawit Haile',
          isRequired: true,
          orderIndex: 0,
        },
        {
          formId: admissionsForm.id,
          name: 'dateOfBirth',
          label: 'Student Date of Birth',
          fieldType: FormFieldType.DATE,
          isRequired: true,
          orderIndex: 1,
        },
        {
          formId: admissionsForm.id,
          name: 'gradeApplying',
          label: 'Grade / Year Group Applying For',
          fieldType: FormFieldType.SELECT,
          isRequired: true,
          orderIndex: 2,
          options: [
            { label: 'Kindergarten / Early Years', value: 'KG' },
            { label: 'Primary (Grades 1-5)', value: 'PRIMARY' },
            { label: 'Middle School (Grades 6-8)', value: 'MIDDLE' },
            { label: 'High School (Grades 9-12)', value: 'HIGH' },
          ],
        },
        {
          formId: admissionsForm.id,
          name: 'parentFullName',
          label: 'Parent / Guardian Full Name',
          fieldType: FormFieldType.TEXT,
          placeholder: 'e.g. Haile Gebreselassie',
          isRequired: true,
          orderIndex: 3,
        },
        {
          formId: admissionsForm.id,
          name: 'parentEmail',
          label: 'Parent Email Address',
          fieldType: FormFieldType.EMAIL,
          placeholder: 'haile.parent@example.com',
          isRequired: true,
          orderIndex: 4,
        },
        {
          formId: admissionsForm.id,
          name: 'parentPhone',
          label: 'Parent Phone Number',
          fieldType: FormFieldType.PHONE,
          placeholder: '+251 91 123 4567',
          isRequired: true,
          orderIndex: 5,
        },
        {
          formId: admissionsForm.id,
          name: 'previousSchool',
          label: 'Previous School Name',
          fieldType: FormFieldType.TEXT,
          placeholder: 'Name of prior institution attended',
          isRequired: false,
          orderIndex: 6,
        },
        {
          formId: admissionsForm.id,
          name: 'specialNeeds',
          label: 'Medical or Learning Support Needs',
          fieldType: FormFieldType.TEXTAREA,
          placeholder: 'Indicate any accommodations, allergies, or support required',
          isRequired: false,
          orderIndex: 7,
        },
      ],
    });

    // Seed sample submissions
    const existingContactSub = await prisma.formSubmission.findFirst({
      where: { formId: contactForm.id },
    });
    if (!existingContactSub) {
      await prisma.formSubmission.create({
        data: {
          tenantId: oxfordTenant.id,
          formId: contactForm.id,
          status: SubmissionStatus.PENDING,
          submitterName: 'Abebe Kebede',
          submitterEmail: 'abebe.kebede@example.com',
          submitterPhone: '+251 91 234 5678',
          ipAddressHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          data: {
            fullName: 'Abebe Kebede',
            email: 'abebe.kebede@example.com',
            phone: '+251 91 234 5678',
            department: 'admissions',
            message: 'Inquiring about open house dates and campus tour schedules for next term.',
          },
        },
      });
    }

    const existingAppSub = await prisma.formSubmission.findFirst({
      where: { formId: admissionsForm.id },
    });
    if (!existingAppSub) {
      await prisma.formSubmission.create({
        data: {
          tenantId: oxfordTenant.id,
          formId: admissionsForm.id,
          status: SubmissionStatus.UNDER_REVIEW,
          submitterName: 'Sara Tadesse',
          submitterEmail: 'sara.tadesse@example.com',
          submitterPhone: '+251 92 345 6789',
          adminNotes: 'Application documents verified. Assessment interview scheduled for next Tuesday.',
          reviewedById: adminUser?.id,
          reviewedAt: new Date(),
          ipAddressHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          data: {
            studentFullName: 'Yonas Tadesse',
            dateOfBirth: '2015-04-12',
            gradeApplying: 'PRIMARY',
            parentFullName: 'Sara Tadesse',
            parentEmail: 'sara.tadesse@example.com',
            parentPhone: '+251 92 345 6789',
            previousSchool: 'Addis International Community School',
            specialNeeds: 'None',
          },
        },
      });
    }
    console.log('  -> Seeded 2 Dynamic Forms (Contact & Admissions) with Fields and Sample Submissions for Oxford');

    // Seed Day 8 Reusable CMS Sections
    console.log('[Seed] Seeding Day 8 Reusable CMS Sections...');
    const tourCtaSection = await prisma.reusableSection.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'campus-tour-cta',
        },
      },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        name: 'Campus Tour & Open House Callout',
        slug: 'campus-tour-cta',
        description: 'Standard institutional CTA strip promoting admissions tours and campus visits.',
        sectionType: SectionType.CTA_BANNER,
        category: 'CALLOUT',
        isGlobal: true,
        authorId: adminUser?.id,
        config: {
          headline: 'Experience Oxford in Person',
          subheadline: 'Book a personalized campus tour and discover our world-class science labs, arts theatre, and Olympic athletics facilities.',
          buttonText: 'Schedule a Campus Tour',
          buttonUrl: '/contact',
          theme: 'PRIMARY',
        },
      },
    });

    const faqSection = await prisma.reusableSection.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'admissions-faq',
        },
      },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        name: 'Admissions & Enrollment FAQ Accordion',
        slug: 'admissions-faq',
        description: 'Common admissions and scholarship questions for incoming parents and students.',
        sectionType: SectionType.ACCORDION,
        category: 'FAQ',
        isGlobal: true,
        authorId: adminUser?.id,
        config: {
          title: 'Frequently Asked Questions About Enrollment',
          description: 'Key insights into our admissions criteria, application deadlines, and scholarship requirements.',
          items: [
            {
              title: 'What are the age requirements for kindergarten and primary admission?',
              content: 'Kindergarten applicants must turn 4 by September 1st of the academic year. Grade 1 applicants must turn 6 by September 1st.',
            },
            {
              title: 'Does Oxford offer academic or athletic scholarship grants?',
              content: 'Yes! Merit-based scholarships covering up to 75% of tuition are awarded to distinguished incoming students following faculty evaluation.',
            },
            {
              title: 'What international curriculum accreditation does Oxford hold?',
              content: 'We offer the accredited Cambridge International Curriculum (IGCSE and International A-Levels) alongside full Ethiopian Ministry of Education accreditation.',
            },
          ],
        },
      },
    });

    const statsSection = await prisma.reusableSection.upsert({
      where: {
        tenantId_slug: {
          tenantId: oxfordTenant.id,
          slug: 'oxford-key-metrics',
        },
      },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        name: 'Institutional Excellence Key Stats',
        slug: 'oxford-key-metrics',
        description: 'High-level metrics display showcasing Oxford academic performance and campus diversity.',
        sectionType: SectionType.STATS_COUNTER,
        category: 'METRICS',
        isGlobal: true,
        authorId: adminUser?.id,
        config: {
          title: 'Oxford Excellence at a Glance',
          items: [
            { value: '100%', label: 'University Placement Rate', description: 'Graduates enrolled in tier-1 global universities' },
            { value: '12:1', label: 'Student-to-Faculty Ratio', description: 'Individualized mentorship in all academic subjects' },
            { value: '35+', label: 'Nationalities Represented', description: 'Vibrant, multicultural student community' },
            { value: '24', label: 'Advanced IGCSE & A-Level Courses', description: 'Comprehensive STEM, humanities, and arts curriculum' },
          ],
        },
      },
    });

    // Link tour CTA section to welcome page if not already linked
    const targetWelcomePage = await prisma.page.findFirst({
      where: { tenantId: oxfordTenant.id, slug: 'welcome' },
      include: { sections: true },
    });
    if (targetWelcomePage) {
      const hasCta = targetWelcomePage.sections.some((s) => s.reusableSectionId === tourCtaSection.id);
      if (!hasCta) {
        await prisma.pageSection.create({
          data: {
            pageId: targetWelcomePage.id,
            sectionType: SectionType.CTA_BANNER,
            sortOrder: targetWelcomePage.sections.length,
            isVisible: true,
            reusableSectionId: tourCtaSection.id,
            config: tourCtaSection.config as any,
          },
        });
      }
    }

    console.log('  -> Seeded 3 Day 8 Reusable Sections (CTA Banner, FAQ Accordion, Stats Counter) for Oxford');
  }

  // --------------------------------------------------------------------------
  // Day 9: Academic Catalogue & Flexible Structures (FR-ACAD-001, FR-ACAD-002)
  // --------------------------------------------------------------------------
  console.log('[Seed] Seeding Day 9 Flexible Academic Structures and Programmes...');

  // 1. Oxford International School (Secondary / Cambridge)
  const oxford = await prisma.tenant.findUnique({ where: { slug: 'oxford' } });
  const oxfordAdmin = await prisma.user.findUnique({ where: { email: 'admin@oxford.edu' } });

  if (oxford) {
    const igcseLevel = await prisma.academicLevel.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'high-school-igcse' } },
      update: {},
      create: {
        tenantId: oxford.id,
        name: 'High School (IGCSE Grades 9-10)',
        slug: 'high-school-igcse',
        levelType: 'SECONDARY',
        description: 'Upper secondary curriculum preparing students for international examinations.',
        orderIndex: 1,
        minAge: 14,
        maxAge: 16,
        isActive: true,
      },
    });

    const aLevelsLevel = await prisma.academicLevel.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'sixth-form-a-levels' } },
      update: {},
      create: {
        tenantId: oxford.id,
        name: 'Sixth Form (A-Levels Grades 11-12)',
        slug: 'sixth-form-a-levels',
        levelType: 'SECONDARY',
        description: 'Pre-university preparation with deep subject specialisation.',
        orderIndex: 2,
        minAge: 16,
        maxAge: 18,
        isActive: true,
      },
    });

    const stemDept = await prisma.academicDepartment.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'stem-sciences' } },
      update: {},
      create: {
        tenantId: oxford.id,
        name: 'Department of STEM & Sciences',
        slug: 'stem-sciences',
        code: 'STEM',
        description: 'Mathematics, Physics, Chemistry, Biology, and Computer Science disciplines.',
        orderIndex: 1,
        isActive: true,
      },
    });

    const humanitiesDept = await prisma.academicDepartment.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'humanities-languages' } },
      update: {},
      create: {
        tenantId: oxford.id,
        name: 'Department of Humanities & Languages',
        slug: 'humanities-languages',
        code: 'HUM',
        description: 'Literature, History, Global Perspectives, and Modern Languages.',
        orderIndex: 2,
        isActive: true,
      },
    });

    const mathCourse = await prisma.course.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'advanced-mathematics' } },
      update: {},
      create: {
        tenantId: oxford.id,
        code: 'MATH-IGCSE',
        title: 'Cambridge IGCSE Mathematics (Extended)',
        slug: 'advanced-mathematics',
        summary: 'Rigorous mathematical analysis covering algebra, geometry, trigonometry, and calculus basics.',
        description: 'This course provides learners with a strong foundation for further mathematical studies, emphasizing problem-solving and mathematical reasoning.',
        credits: 4.0,
        hours: 150,
        levelId: igcseLevel.id,
        departmentId: stemDept.id,
        status: PageStatus.PUBLISHED,
        orderIndex: 1,
      },
    });

    const physicsCourse = await prisma.course.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'cambridge-physics' } },
      update: {},
      create: {
        tenantId: oxford.id,
        code: 'PHYS-IGCSE',
        title: 'Cambridge IGCSE Physics',
        slug: 'cambridge-physics',
        summary: 'Comprehensive laboratory and theoretical physics covering mechanics, thermodynamics, and electricity.',
        credits: 4.0,
        hours: 150,
        levelId: igcseLevel.id,
        departmentId: stemDept.id,
        status: PageStatus.PUBLISHED,
        orderIndex: 2,
      },
    });

    const igcseProg = await prisma.programme.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'cambridge-igcse' } },
      update: {},
      create: {
        tenantId: oxford.id,
        title: 'Cambridge IGCSE Programme',
        slug: 'cambridge-igcse',
        summary: 'Globally recognized two-year upper secondary curriculum fostering independent inquiry and academic mastery.',
        description: 'The Cambridge IGCSE programme at Oxford International School delivers a broad, balanced international education designed for students aged 14 to 16. Our learners undertake comprehensive studies across core sciences, mathematics, humanities, and languages, guided by Cambridge-certified educators with full laboratory integration.',
        programmeType: 'Secondary Certificate',
        levelId: igcseLevel.id,
        departmentId: stemDept.id,
        duration: '2 Academic Years (Grades 9-10)',
        entryRequirements: 'Successful completion of Grade 8 or equivalent international middle school standing. Satisfactory performance in mathematics and English diagnostic assessments.',
        qualificationsAwarded: 'Cambridge International General Certificate of Secondary Education (IGCSE)',
        curriculum: 'Cambridge Assessment International Education (CAIE)',
        tuitionFee: 3200,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Per Academic Year',
        tuitionDescription: 'Includes Cambridge registration fees, laboratory usage, digital textbooks, and extracurricular sports club membership.',
        displayTuition: true, // Authorized and approved for public display
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'Cambridge IGCSE Programme | Oxford International School',
        seoDescription: 'Accredited 2-year Cambridge IGCSE secondary curriculum with modern laboratories and global university pathways.',
        authorId: oxfordAdmin?.id,
      },
    });

    // Link courses to programme
    await prisma.programmeCourse.upsert({
      where: { programmeId_courseId: { programmeId: igcseProg.id, courseId: mathCourse.id } },
      update: {},
      create: {
        programmeId: igcseProg.id,
        courseId: mathCourse.id,
        isRequired: true,
        term: 'Year 1 - Semesters 1 & 2',
        orderIndex: 1,
      },
    });

    await prisma.programmeCourse.upsert({
      where: { programmeId_courseId: { programmeId: igcseProg.id, courseId: physicsCourse.id } },
      update: {},
      create: {
        programmeId: igcseProg.id,
        courseId: physicsCourse.id,
        isRequired: true,
        term: 'Year 1 - Semesters 1 & 2',
        orderIndex: 2,
      },
    });

    // Seed A-Levels programme (tuition hidden/not authorized for public display)
    await prisma.programme.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'international-a-levels' } },
      update: {},
      create: {
        tenantId: oxford.id,
        title: 'Cambridge International A-Levels',
        slug: 'international-a-levels',
        summary: 'Advanced pre-university qualifications recognized by top universities across the UK, US, Canada, and Europe.',
        description: 'Our Sixth Form programme allows students to specialize deeply in three to four subjects. Rigorous academic tutoring, personalized university guidance, and independent research projects equip students for entry into the worlds premier universities.',
        programmeType: 'Pre-University Diploma',
        levelId: aLevelsLevel.id,
        departmentId: stemDept.id,
        duration: '2 Academic Years (Grades 11-12)',
        entryRequirements: 'Minimum 5 IGCSE passes with grades A*-C, including mathematics and English.',
        qualificationsAwarded: 'Cambridge International Advanced Level (A-Level)',
        curriculum: 'Cambridge Assessment International Education (CAIE)',
        tuitionFee: 4500,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Per Academic Year',
        displayTuition: false, // Tuition not approved for public display (confidential / tailored aid)
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: false,
        orderIndex: 2,
        publishedAt: new Date(),
        seoTitle: 'Cambridge International A-Levels | Oxford Sixth Form',
        seoDescription: 'World-renowned Sixth Form pre-university qualifications preparing students for top international universities.',
        authorId: oxfordAdmin?.id,
      },
    });

    // Seed a Draft Programme (should not be returned publicly)
    await prisma.programme.upsert({
      where: { tenantId_slug: { tenantId: oxford.id, slug: 'robotics-and-ai-enrichment' } },
      update: {},
      create: {
        tenantId: oxford.id,
        title: 'Robotics & AI Advanced Enrichment Track',
        slug: 'robotics-and-ai-enrichment',
        summary: 'Elective STEM pathway focusing on autonomous robotics, microcontrollers, and machine learning principles.',
        description: 'Internal draft syllabus currently undergoing faculty curriculum review.',
        programmeType: 'Enrichment Track',
        levelId: igcseLevel.id,
        departmentId: stemDept.id,
        duration: '1 Semester',
        status: PageStatus.DRAFT,
        isActive: true,
        displayTuition: false,
        orderIndex: 3,
        authorId: oxfordAdmin?.id,
      },
    });

    console.log('  -> Seeded Oxford Academic Structure (2 levels, 2 departments, 3 programmes, 2 courses)');
  }

  // 2. Little Explorers Kindergarten (Flexible Early Childhood - no college faculties)
  const kgTenant = await prisma.tenant.findUnique({ where: { slug: 'little-explorers-kindergarten' } });
  if (kgTenant) {
    const earlyYearsLevel = await prisma.academicLevel.upsert({
      where: { tenantId_slug: { tenantId: kgTenant.id, slug: 'foundation-years' } },
      update: {},
      create: {
        tenantId: kgTenant.id,
        name: 'Foundation Years (Ages 3-5)',
        slug: 'foundation-years',
        levelType: 'EARLY_CHILDHOOD',
        description: 'Play-based early developmental learning nurturing curiosity, social skills, and motor development.',
        orderIndex: 1,
        minAge: 3,
        maxAge: 5,
        isActive: true,
      },
    });

    const playActivityDept = await prisma.academicDepartment.upsert({
      where: { tenantId_slug: { tenantId: kgTenant.id, slug: 'creative-play-activities' } },
      update: {},
      create: {
        tenantId: kgTenant.id,
        name: 'Creative Play & Early Learning Activities',
        slug: 'creative-play-activities',
        description: 'Montessori-inspired learning areas, sensory play stations, and early childhood motor activities.',
        orderIndex: 1,
        isActive: true,
      },
    });

    await prisma.programme.upsert({
      where: { tenantId_slug: { tenantId: kgTenant.id, slug: 'explorers-kindergarten' } },
      update: {},
      create: {
        tenantId: kgTenant.id,
        title: 'Little Explorers Full-Day Kindergarten',
        slug: 'explorers-kindergarten',
        summary: 'Nurturing full-day early childhood programme combining sensory exploration, phonics, and expressive arts.',
        description: 'Our full-day kindergarten curriculum promotes holistic child development through structured discovery and creative play. Children develop foundational early literacy, numeracy intuition, and social empathy in safe, stimulating learning environments.',
        programmeType: 'Early Learning Programme',
        levelId: earlyYearsLevel.id,
        departmentId: playActivityDept.id,
        duration: '1 Academic Year (Full-Day 8:30 AM - 3:00 PM)',
        entryRequirements: 'Child must be 3 years of age by commencement of term and toilet-trained.',
        qualificationsAwarded: 'Early Childhood Completion Certificate',
        curriculum: 'Reggio Emilia & Early Years Foundation Stage (EYFS)',
        tuitionFee: 1800,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Per Term',
        tuitionDescription: 'Includes organic morning snack, hot nutritious lunch, arts materials, and daily resting cot.',
        displayTuition: true,
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'Full-Day Kindergarten | Little Explorers',
        seoDescription: 'Holistic early childhood foundation programme combining sensory exploration and play-based learning.',
      },
    });

    console.log('  -> Seeded Little Explorers Kindergarten Structure (Early Childhood model without college faculties)');
  }

  // 3. Summit TVET & Vocational Institute (Practical training, certifications, duration, entry criteria)
  const tvetTenant = await prisma.tenant.findUnique({ where: { slug: 'summit-tvet-institute' } });
  if (tvetTenant) {
    const tvetLevel = await prisma.academicLevel.upsert({
      where: { tenantId_slug: { tenantId: tvetTenant.id, slug: 'vocational-diploma-level' } },
      update: {},
      create: {
        tenantId: tvetTenant.id,
        name: 'National Occupational Certificate Level III-IV',
        slug: 'vocational-diploma-level',
        levelType: 'TVET',
        description: 'Industry-standard competency-based vocational training verified by national certification boards.',
        orderIndex: 1,
        minAge: 18,
        maxAge: null,
        isActive: true,
      },
    });

    const autoDept = await prisma.academicDepartment.upsert({
      where: { tenantId_slug: { tenantId: tvetTenant.id, slug: 'automotive-trades' } },
      update: {},
      create: {
        tenantId: tvetTenant.id,
        name: 'Division of Automotive & Mechanical Trades',
        slug: 'automotive-trades',
        code: 'AUTO',
        description: 'Advanced workshops for vehicle electronics, engine overhauls, and hydraulic systems.',
        orderIndex: 1,
        isActive: true,
      },
    });

    await prisma.programme.upsert({
      where: { tenantId_slug: { tenantId: tvetTenant.id, slug: 'automotive-diagnostics-technology' } },
      update: {},
      create: {
        tenantId: tvetTenant.id,
        title: 'Automotive Diagnostics & Maintenance Technology',
        slug: 'automotive-diagnostics-technology',
        summary: 'Hands-on practical certification in computerized diagnostic equipment, hybrid powertrains, and braking systems.',
        description: 'Summit TVETs flagship technical programme prepares certified automotive technicians through 70% workshop practicum and 30% theory. Students master OBD-II digital diagnostics, hybrid battery safety, automatic transmissions, and electronic fuel injection.',
        programmeType: 'Technical Certification',
        levelId: tvetLevel.id,
        departmentId: autoDept.id,
        duration: '12 Months (1,200 Practical Workshop Hours + 3-Month Industry Apprenticeship)',
        entryRequirements: 'High school diploma or Grade 10 secondary school completion certificate. Basic aptitude in technical mechanics.',
        qualificationsAwarded: 'National Occupational Competency Certificate (Level IV Technician)',
        curriculum: 'National TVET Competency Standard & ASE Aligned',
        tuitionFee: 950,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Total Course Tuition',
        tuitionDescription: 'Includes heavy-duty safety gear, personal tool set, workshop consumable fluids, and national assessment fees.',
        displayTuition: true,
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'Automotive Diagnostics Technician Programme | Summit TVET',
        seoDescription: 'Hands-on 12-month automotive technician certification with 70% workshop practicum and apprenticeship.',
      },
    });

    console.log('  -> Seeded Summit TVET Structure (Vocational training, certification, practical duration, criteria)');
  }

  // 12. Seed Staff Directory & Profiles (Day 10)
  console.log('[Seed] Seeding staff profiles for Oxford, Kindergarten, and Summit TVET...');
  if (oxfordTenant) {
    const oxfordScienceDept = await prisma.academicDepartment.findUnique({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'science-technology-division' } },
    });

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@oxford.edu' } });

    // Profile photo media asset
    const eleanorPhoto = await prisma.mediaAsset.upsert({
      where: { id: `media-seed-${oxfordTenant.id}-eleanor-vance` },
      update: {},
      create: {
        id: `media-seed-${oxfordTenant.id}-eleanor-vance`,
        tenantId: oxfordTenant.id,
        uploaderId: adminUser?.id,
        title: 'Dr. Eleanor Vance Portrait',
        altText: 'Dr. Eleanor Vance, Dean of Science and Mathematics, in academic regalia',
        caption: 'Dean & Head of Science & Mathematics at Oxford International School',
        category: MediaCategory.IMAGE,
        mimeType: 'image/jpeg',
        fileSizeBytes: 185000,
        storageKey: `tenants/${oxfordTenant.id}/media/staff-eleanor-vance.jpg`,
        publicUrl: '/api/v1/tenant/public/media/staff-eleanor-vance.jpg',
        isPublic: true,
        isDecorative: false,
        storagePolicy: 'PUBLIC',
        storageProvider: 'local',
      },
    });

    await prisma.staffProfile.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'dr-eleanor-vance' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        fullName: 'Dr. Eleanor Vance',
        slug: 'dr-eleanor-vance',
        roleTitle: 'Dean & Head of Science & Mathematics',
        biography: 'Dr. Eleanor Vance oversees the Faculty of Sciences and Mathematics at Oxford International School. With over 15 years of academic leadership, her research spans quantum optics and STEM pedagogical methodologies.',
        departmentId: oxfordScienceDept?.id,
        profileMediaId: eleanorPhoto.id,
        subjects: ['Advanced Physics', 'Quantum Mechanics', 'Pure Mathematics'],
        qualifications: 'Ph.D. in Physics (Cambridge), M.Sc. Applied Mathematics',
        officeLocation: 'Science Block, Suite 304',
        consultationHours: 'Mon & Wed 2:00 PM - 4:00 PM',
        publicEmail: 'e.vance@oxford.school.example',
        publicPhone: '+44 1865 270001',
        displayEmail: true,
        displayPhone: true,
        websiteUrl: 'https://eleanorvance.oxford.school.example',
        internalNotes: 'Senior academic leadership member; faculty budgeting oversight.',
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'Dr. Eleanor Vance | Oxford Faculty & Leadership',
        seoDescription: 'Biography, consultation hours, STEM research expertise, and courses led by Dr. Eleanor Vance.',
      },
    });

    await prisma.staffProfile.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'marcus-sterling' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        fullName: 'Marcus Sterling',
        slug: 'marcus-sterling',
        roleTitle: 'Senior Lecturer in Pure & Applied Mathematics',
        biography: 'Marcus Sterling specializes in multivariable calculus, linear algebra, and competitive mathematical Olympiad coaching.',
        departmentId: oxfordScienceDept?.id,
        subjects: ['Calculus III', 'Linear Algebra', 'Discrete Mathematics'],
        qualifications: 'M.Sc. Mathematics (Oxford), B.Sc. First Class Honors',
        officeLocation: 'Mathematics Wing, Room 112',
        consultationHours: 'Tue & Thu 10:00 AM - 12:00 PM',
        publicEmail: 'm.sterling@oxford.school.example',
        publicPhone: '+44 1865 270002',
        displayEmail: true,
        displayPhone: false, // Phone unapproved for public display (privacy redaction check)
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: false,
        orderIndex: 2,
        publishedAt: new Date(),
        seoTitle: 'Marcus Sterling | Oxford Mathematics Faculty',
        seoDescription: 'Senior mathematics faculty profile, publications, and student consultation times.',
      },
    });

    await prisma.staffProfile.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'helena-rostova' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        fullName: 'Helena Rostova',
        slug: 'helena-rostova',
        roleTitle: 'Associate Lecturer in Biology & Genetics',
        biography: 'Draft bio undergoing faculty review.',
        departmentId: oxfordScienceDept?.id,
        subjects: ['Molecular Genetics', 'Cellular Biology'],
        qualifications: 'M.Sc. Molecular Biology',
        officeLocation: 'Biology Annex, Lab 4',
        consultationHours: 'Fridays 1:00 PM - 3:00 PM',
        publicEmail: 'h.rostova@oxford.school.example',
        displayEmail: true,
        status: PageStatus.DRAFT, // Draft fail-closed test
        isActive: true,
        isFeatured: false,
        orderIndex: 3,
      },
    });

    console.log('  -> Seeded Oxford Staff Profiles (Dr. Eleanor Vance, Marcus Sterling, Helena Rostova [Draft])');
  }

  if (kgTenant) {
    const playActivityDept = await prisma.academicDepartment.findUnique({
      where: { tenantId_slug: { tenantId: kgTenant.id, slug: 'creative-play-activities' } },
    });

    await prisma.staffProfile.upsert({
      where: { tenantId_slug: { tenantId: kgTenant.id, slug: 'sarah-jenkins' } },
      update: {},
      create: {
        tenantId: kgTenant.id,
        fullName: 'Sarah Jenkins',
        slug: 'sarah-jenkins',
        roleTitle: 'Lead Early Childhood Educator & Reggio Specialist',
        biography: 'Sarah Jenkins leads our early childhood discovery activities, guiding toddlers and young children through sensory exploration, play-based numeracy, and language development.',
        departmentId: playActivityDept?.id,
        subjects: ['Sensory Exploration', 'Early Literacy', 'Reggio Creative Arts'],
        qualifications: 'B.Ed. Early Childhood Education (Montessori & Reggio certified)',
        officeLocation: 'Sunflower Classroom B',
        consultationHours: 'Weekdays 3:15 PM - 4:00 PM (By appointment)',
        publicEmail: 's.jenkins@littleexplorers.school.example',
        publicPhone: '+251 11 618 2000',
        displayEmail: true,
        displayPhone: true,
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'Sarah Jenkins | Little Explorers Kindergarten',
        seoDescription: 'Meet Lead Early Childhood Educator Sarah Jenkins at Little Explorers Kindergarten.',
      },
    });

    console.log('  -> Seeded Little Explorers Kindergarten Staff Profile (Sarah Jenkins)');
  }

  if (tvetTenant) {
    const autoDept = await prisma.academicDepartment.findUnique({
      where: { tenantId_slug: { tenantId: tvetTenant.id, slug: 'automotive-trades' } },
    });

    await prisma.staffProfile.upsert({
      where: { tenantId_slug: { tenantId: tvetTenant.id, slug: 'david-miller' } },
      update: {},
      create: {
        tenantId: tvetTenant.id,
        fullName: 'David Miller',
        slug: 'david-miller',
        roleTitle: 'Head Instructor, Automotive Diagnostics & Systems',
        biography: 'David Miller brings 20 years of field master technician experience in computer diagnostics, transmission rebuilds, and electrical system troubleshooting.',
        departmentId: autoDept?.id,
        subjects: ['OBD-II Diagnostics', 'Hybrid Powertrains', 'Engine Overhaul'],
        qualifications: 'ASE Certified Master Automotive Technician (L1), National TVET Trainer Level V',
        officeLocation: 'Technical Workshop Bay 3',
        consultationHours: 'Mon-Fri 4:00 PM - 5:30 PM',
        publicEmail: 'd.miller@summit-tvet.edu.example',
        publicPhone: '+251 11 551 9800',
        displayEmail: true,
        displayPhone: true,
        status: PageStatus.PUBLISHED,
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        publishedAt: new Date(),
        seoTitle: 'David Miller | Summit TVET Technical Faculty',
        seoDescription: 'Practical vocational instructor profile and workshop hours for David Miller at Summit TVET.',
      },
    });

    console.log('  -> Seeded Summit TVET Staff Profile (David Miller)');
  }

  // 13. Seed News, Notices & Events (Day 12)
  console.log('[Seed] Seeding news articles, announcements, and events for Oxford International School...');
  if (oxfordTenant) {
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@oxford.edu' } });

    // Feature media for news
    const newsMedia = await prisma.mediaAsset.upsert({
      where: { id: `media-seed-${oxfordTenant.id}-stem-wing` },
      update: {},
      create: {
        id: `media-seed-${oxfordTenant.id}-stem-wing`,
        tenantId: oxfordTenant.id,
        uploaderId: adminUser?.id,
        title: 'New STEM Innovation Wing Opening Ceremony',
        altText: 'Students and faculty cutting ribbon for the new Oxford STEM Innovation Wing',
        caption: 'Oxford International School unveils state-of-the-art laboratory facilities',
        category: MediaCategory.IMAGE,
        mimeType: 'image/jpeg',
        fileSizeBytes: 245000,
        storageKey: `tenants/${oxfordTenant.id}/media/stem-wing-opening.jpg`,
        publicUrl: '/api/v1/tenant/public/media/stem-wing-opening.jpg',
        isPublic: true,
        isDecorative: false,
        storagePolicy: 'PUBLIC',
        storageProvider: 'local',
      },
    });

    // Feature media for events
    const eventMedia = await prisma.mediaAsset.upsert({
      where: { id: `media-seed-${oxfordTenant.id}-open-house` },
      update: {},
      create: {
        id: `media-seed-${oxfordTenant.id}-open-house`,
        tenantId: oxfordTenant.id,
        uploaderId: adminUser?.id,
        title: 'Oxford Campus Open House Banner',
        altText: 'Aerial view of Oxford International School campus with prospective students and families',
        caption: 'Join us for our comprehensive campus open day tour and faculty presentations',
        category: MediaCategory.BANNER,
        mimeType: 'image/jpeg',
        fileSizeBytes: 310000,
        storageKey: `tenants/${oxfordTenant.id}/media/open-house-banner.jpg`,
        publicUrl: '/api/v1/tenant/public/media/open-house-banner.jpg',
        isPublic: true,
        isDecorative: false,
        storagePolicy: 'PUBLIC',
        storageProvider: 'local',
      },
    });

    // Seed News Articles (FR-COM-001)
    await prisma.newsArticle.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'stem-innovation-wing-inauguration' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        title: 'Oxford Unveils Cutting-Edge STEM Innovation Wing',
        slug: 'stem-innovation-wing-inauguration',
        summary: 'A multi-million dollar advancement providing robotics laboratories, biotechnology cleanrooms, and computational physics workstations for all secondary students.',
        body: 'Oxford International School proudly celebrated the formal opening of the new STEM Innovation Wing this week. The multi-story facility integrates advanced robotics testing arenas, high-precision biotechnology laboratories, and sustainable architectural design.\n\nDuring the inaugural address, Dr. Eleanor Vance emphasized our commitment to inquiry-driven learning: "This wing transforms abstract scientific theory into experiential breakthrough discovery. Our students will now design and test real-world solutions directly on campus."\n\nAdmissions tours for the new facility commence next month for enrolled and prospective families.',
        authorName: 'Oxford Communications Office',
        publishedAt: new Date('2026-09-15T09:00:00Z'),
        featuredMediaId: newsMedia.id,
        tags: ['STEM', 'Campus Development', 'Academics', 'Innovation'],
        status: PageStatus.PUBLISHED,
        seoTitle: 'New STEM Innovation Wing | Oxford International School News',
        seoDescription: 'Read about the new STEM Innovation Wing at Oxford International School, featuring robotics and biotechnology laboratories.',
        authorId: adminUser?.id,
      },
    });

    await prisma.newsArticle.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'annual-science-symposium-winners-2026' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        title: 'Winners Announced for 2026 Annual Science & Mathematics Symposium',
        slug: 'annual-science-symposium-winners-2026',
        summary: 'Over 120 student projects were exhibited, culminating in top honors for renewable energy harvesting and algorithmic bioinformatics.',
        body: 'The 2026 Oxford Annual Science and Mathematics Symposium concluded with an exceptional showcase of investigative rigour. Students from Grades 9 through 12 presented peer-reviewed research before an invited panel of university academics and industry researchers.\n\nFirst prize in Applied Sciences was awarded to Grade 11 student Marcus Chen for his prototype on ambient piezoelectric kinetic energy harvesting in high-traffic campus walkways. The Mathematics & Computing prize was awarded to Grade 12 student Sophia Patel for algorithmic modelling of local microclimate rainfall variations.\n\nCongratulations to all exhibitors and faculty mentors for their tireless dedication.',
        authorName: 'Academic Review Committee',
        publishedAt: new Date('2026-10-01T14:30:00Z'),
        featuredMediaId: newsMedia.id,
        tags: ['Academics', 'Awards', 'Science', 'Student Life'],
        status: PageStatus.PUBLISHED,
        seoTitle: '2026 Science Symposium Winners | Oxford International School',
        seoDescription: 'Celebrating student excellence and investigative research at the 2026 Oxford Annual Science Symposium.',
        authorId: adminUser?.id,
      },
    });

    await prisma.newsArticle.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'summer-internship-partnerships-draft' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        title: 'Draft: 2027 International Summer Internship Opportunities',
        slug: 'summer-internship-partnerships-draft',
        summary: 'Preliminary internal draft of university and corporate summer research placements for senior scholars.',
        body: 'This is an unapproved editorial draft describing forthcoming university laboratory partnerships. Not for public distribution or release until institutional agreements are countersigned.',
        authorName: 'College Counselling Team',
        publishedAt: null,
        tags: ['Careers', 'Internal', 'Draft'],
        status: PageStatus.DRAFT,
        authorId: adminUser?.id,
      },
    });

    // Seed Operational Announcements (FR-COM-002)
    // 1. High-priority active emergency notice
    await prisma.announcement.upsert({
      where: { id: `announcement-seed-${oxfordTenant.id}-adverse-weather` },
      update: {},
      create: {
        id: `announcement-seed-${oxfordTenant.id}-adverse-weather`,
        tenantId: oxfordTenant.id,
        title: 'Adverse Weather Alert: Morning Bus Transit Route Adjustments',
        content: 'Due to severe seasonal storms, morning transport routes 4 and 7 will operate with a 20-minute safety delay. All campus buildings remain open on regular schedule with indoor student reception.',
        priority: AnnouncementPriority.EMERGENCY,
        audience: AnnouncementAudience.GENERAL,
        isPinned: true,
        startsAt: new Date('2026-10-25T00:00:00Z'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Active for 7 days
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 2. Standard active student notice
    await prisma.announcement.upsert({
      where: { id: `announcement-seed-${oxfordTenant.id}-library-hours` },
      update: {},
      create: {
        id: `announcement-seed-${oxfordTenant.id}-library-hours`,
        tenantId: oxfordTenant.id,
        title: 'Extended Evening Library Study Hours During Midterm Assessment',
        content: 'The Senior Campus Library and Quiet Study Atrium will remain open until 8:30 PM Mondays through Thursdays. Faculty tutors will be available for drop-in consultations.',
        priority: AnnouncementPriority.NORMAL,
        audience: AnnouncementAudience.STUDENTS,
        isPinned: false,
        startsAt: new Date('2026-10-20T00:00:00Z'),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Active for 14 days
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 3. Expired notice (historical record retained, stops appearing in active placements)
    await prisma.announcement.upsert({
      where: { id: `announcement-seed-${oxfordTenant.id}-term1-uniform-sale` },
      update: {},
      create: {
        id: `announcement-seed-${oxfordTenant.id}-term1-uniform-sale`,
        tenantId: oxfordTenant.id,
        title: 'Past Notice: Term 1 Official Uniform Exchange & Book Fair',
        content: 'The annual community uniform resale and textbook exchange will run from 9:00 AM to 1:00 PM at the Gymnasium concourse.',
        priority: AnnouncementPriority.LOW,
        audience: AnnouncementAudience.PARENTS,
        isPinned: false,
        startsAt: new Date('2026-09-01T08:00:00Z'),
        expiresAt: new Date('2026-09-05T17:00:00Z'), // Past expired date!
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 4. Draft announcement
    await prisma.announcement.upsert({
      where: { id: `announcement-seed-${oxfordTenant.id}-term2-schedule-draft` },
      update: {},
      create: {
        id: `announcement-seed-${oxfordTenant.id}-term2-schedule-draft`,
        tenantId: oxfordTenant.id,
        title: 'Draft Notice: Preliminary Term 2 Examination Timetable',
        content: 'Draft internal schedule under faculty review. Not yet approved for student distribution.',
        priority: AnnouncementPriority.NORMAL,
        audience: AnnouncementAudience.STAFF,
        isPinned: false,
        status: PageStatus.DRAFT,
        authorId: adminUser?.id,
      },
    });

    // Seed Events Calendar (FR-EVT-001)
    // 1. Upcoming Open House with explicit timezone & registration
    await prisma.eventItem.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'oxford-autumn-open-house-2026' } },
      update: {
        timezone: 'Europe/London',
      },
      create: {
        tenantId: oxfordTenant.id,
        title: 'Oxford Autumn Campus Open Day & Admissions Showcase',
        slug: 'oxford-autumn-open-house-2026',
        description: 'Explore our academic divisions, meet department chairs, inspect laboratory spaces, and speak directly with our admissions and scholarship officers.',
        startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hour event
        timezone: 'Europe/London',
        location: 'Main Auditorium & Quadrangle, Oxford Campus',
        category: 'ADMISSIONS',
        coverMediaId: eventMedia.id,
        contactName: 'Admissions Directorate',
        contactEmail: 'admissions@oxford.edu',
        contactPhone: '+44 1865 200100',
        capacity: 250,
        isRegistrationOpen: true,
        registrationUrl: '/forms/admissions-inquiry',
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 2. Upcoming Multi-day Athletics Championship
    await prisma.eventItem.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'inter-school-track-and-field-championship' } },
      update: {
        timezone: 'Europe/London',
      },
      create: {
        tenantId: oxfordTenant.id,
        title: 'Inter-School Track & Field Invitational Championship',
        slug: 'inter-school-track-and-field-championship',
        description: 'A 2-day athletic competition featuring sprint relays, hurdle finals, high jump, and field events across 8 visiting secondary schools.',
        startsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Spans 2 days
        timezone: 'Europe/London',
        location: 'Oxford Sports Complex Athletics Arena',
        category: 'SPORTS',
        coverMediaId: eventMedia.id,
        contactName: 'Athletics Department',
        contactEmail: 'athletics@oxford.edu',
        contactPhone: '+44 1865 200105',
        capacity: 800,
        isRegistrationOpen: false,
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 3. Past Historical Event (Historical record retained, past date)
    await prisma.eventItem.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'class-of-2026-commencement-gala' } },
      update: {
        timezone: 'Europe/London',
      },
      create: {
        tenantId: oxfordTenant.id,
        title: 'Class of 2026 Annual Commencement & Valedictory Gala',
        slug: 'class-of-2026-commencement-gala',
        description: 'Formal graduation ceremonies honouring our senior diploma recipients, academic medalists, and distinguished alumni fellows.',
        startsAt: new Date('2026-06-20T10:00:00Z'),
        endsAt: new Date('2026-06-20T16:00:00Z'),
        timezone: 'Europe/London',
        location: 'Great Hall & Riverside Grounds',
        category: 'COMMENCEMENT',
        coverMediaId: eventMedia.id,
        contactName: 'Registrar Office',
        contactEmail: 'registrar@oxford.edu',
        contactPhone: '+44 1865 200102',
        capacity: 600,
        isRegistrationOpen: false,
        status: PageStatus.PUBLISHED,
        authorId: adminUser?.id,
      },
    });

    // 4. Draft Event
    await prisma.eventItem.upsert({
      where: { tenantId_slug: { tenantId: oxfordTenant.id, slug: 'alumni-networking-symposium-draft' } },
      update: {},
      create: {
        tenantId: oxfordTenant.id,
        title: 'Draft: Oxford Alumni Global Mentorship Evening',
        slug: 'alumni-networking-symposium-draft',
        description: 'Draft schedule for panel discussions connecting senior students with graduates in medicine, law, and engineering.',
        startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        timezone: 'UTC',
        location: 'Oxford Fellows Lounge',
        category: 'COMMUNITY',
        status: PageStatus.DRAFT,
        authorId: adminUser?.id,
      },
    });

    console.log('  -> Seeded Oxford News Articles (2 published, 1 draft)');
    console.log('  -> Seeded Oxford Announcements (1 emergency pinned, 1 standard active, 1 expired, 1 draft)');
    console.log('  -> Seeded Oxford Events (1 upcoming open day, 1 multi-day athletics, 1 past graduation, 1 draft)');
  }

  console.log('[Seed] Development multi-tenant, RBAC, user, CMS, navigation, media, dynamic forms, reusable sections, and academic catalogue seed completed idempotently.');
}

// Direct execution guard
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDevelopmentData()
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
