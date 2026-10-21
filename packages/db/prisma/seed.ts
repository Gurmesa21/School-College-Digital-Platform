import { PrismaClient, InstitutionType, TenantStatus, UserStatus, MembershipStatus } from '@prisma/client';
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

  console.log('[Seed] Development multi-tenant, RBAC, and user seed completed idempotently.');
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
