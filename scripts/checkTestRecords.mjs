import { PrismaClient } from '@school/db';

const prisma = new PrismaClient();

async function checkOtherTenants() {
  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
    const progs = await prisma.programme.findMany({ where: { tenantId: t.id } });
    const staff = await prisma.staffProfile.findMany({ where: { tenantId: t.id } });
    console.log(`Tenant ${t.slug} (${t.name}): ${progs.length} programmes, ${staff.length} staff`);
    for (const p of progs) {
      if (/\d{10,}/.test(p.title) || /\d{10,}/.test(p.slug)) {
        console.log(`  -> Contaminated programme: ${p.title} [${p.slug}]`);
      }
    }
    for (const s of staff) {
      if (/\d{10,}/.test(s.fullName) || /\d{10,}/.test(s.slug)) {
        console.log(`  -> Contaminated staff: ${s.fullName} [${s.slug}]`);
      }
    }
  }
}

checkOtherTenants().finally(() => prisma.$disconnect());
