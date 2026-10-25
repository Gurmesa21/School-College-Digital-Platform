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
  }

  console.log('[Seed] Development multi-tenant, RBAC, user, CMS, navigation, media, and dynamic forms seed completed idempotently.');
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
