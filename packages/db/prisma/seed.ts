import { PrismaClient, InstitutionType, TenantStatus } from '@prisma/client';

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

export async function seedDevelopmentData(): Promise<void> {
  // Safety guard: Never run development seed in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Attempted to run development seed script in a production environment. Execution halted.');
  }

  console.log('[Seed] Seeding development multi-tenant baseline data...');

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

  console.log('[Seed] Development multi-tenant seed completed idempotently.');
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
