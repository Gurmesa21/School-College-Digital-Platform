import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[DB Verification] Connecting to PostgreSQL at port 55432...');

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
