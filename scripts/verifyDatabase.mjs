import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[DB Verification] Connecting to PostgreSQL database...');

  const tenantsCount = await prisma.tenant.count();
  const domainsCount = await prisma.tenantDomain.count();
  const usersCount = await prisma.user.count();
  const rolesCount = await prisma.role.count();
  const permissionsCount = await prisma.permission.count();
  const membershipsCount = await prisma.membership.count();
  const invitationsCount = await prisma.tenantInvitation.count();
  const auditLogsCount = await prisma.auditLog.count();
  const pagesCount = await prisma.page.count();
  const pageSectionsCount = await prisma.pageSection.count();
  const navigationMenusCount = await prisma.navigationMenu.count();
  const navigationMenuItemsCount = await prisma.navigationMenuItem.count();
  const categoriesCount = await prisma.category.count();
  const mediaAssetsCount = await prisma.mediaAsset.count();
  const academicLevelsCount = await prisma.academicLevel.count();
  const academicDepartmentsCount = await prisma.academicDepartment.count();
  const programmesCount = await prisma.programme.count();
  const coursesCount = await prisma.course.count();
  const staffProfilesCount = await prisma.staffProfile.count();

  console.log('[DB Verification] Table Record Counts:');
  console.log(`  - tenants: ${tenantsCount}`);
  console.log(`  - tenant_domains: ${domainsCount}`);
  console.log(`  - users: ${usersCount}`);
  console.log(`  - roles: ${rolesCount}`);
  console.log(`  - permissions: ${permissionsCount}`);
  console.log(`  - memberships: ${membershipsCount}`);
  console.log(`  - tenant_invitations: ${invitationsCount}`);
  console.log(`  - audit_logs: ${auditLogsCount}`);
  console.log(`  - pages: ${pagesCount}`);
  console.log(`  - page_sections: ${pageSectionsCount}`);
  console.log(`  - navigation_menus: ${navigationMenusCount}`);
  console.log(`  - navigation_menu_items: ${navigationMenuItemsCount}`);
  console.log(`  - categories: ${categoriesCount}`);
  console.log(`  - media_assets: ${mediaAssetsCount}`);
  console.log(`  - academic_levels: ${academicLevelsCount}`);
  console.log(`  - academic_departments: ${academicDepartmentsCount}`);
  console.log(`  - programmes: ${programmesCount}`);
  console.log(`  - courses: ${coursesCount}`);
  console.log(`  - staff_profiles: ${staffProfilesCount}`);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isSuperAdmin: true,
      status: true,
      memberships: {
        select: {
          tenant: { select: { slug: true, name: true } },
          roles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  });

  console.log('[DB Verification] Seeded Users and Memberships:');
  for (const u of users) {
    const roles = u.memberships.flatMap((m) => m.roles.map((r) => r.role.name)).join(', ');
    const tenants = u.memberships.map((m) => m.tenant.slug).join(', ');
    console.log(`  - ${u.email} (SuperAdmin: ${u.isSuperAdmin}, Status: ${u.status}) -> Tenants: [${tenants}], Roles: [${roles}]`);
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      slug: true,
      name: true,
      status: true,
      domains: { select: { hostname: true, isPrimary: true } },
    },
  });

  console.log('[DB Verification] Tenants & Mapped Domains:');
  for (const t of tenants) {
    const domainList = t.domains.map((d) => `${d.hostname}${d.isPrimary ? ' (primary)' : ''}`).join(', ');
    console.log(`  - [${t.status}] ${t.name} (${t.slug}) -> Domains: ${domainList}`);
  }
}

main()
  .catch((err) => {
    console.error('[DB Verification] Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
