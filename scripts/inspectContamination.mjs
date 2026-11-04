import { PrismaClient } from '@school/db';

const prisma = new PrismaClient();

async function main() {
  const oxford = await prisma.tenant.findUnique({ where: { slug: 'oxford' } });
  console.log('Oxford Tenant ID:', oxford?.id);

  const programmes = await prisma.programme.findMany({
    where: { tenantId: oxford?.id },
    select: { id: true, title: true, slug: true, status: true, createdAt: true }
  });
  console.log('\n--- OXFORD PROGRAMMES (' + programmes.length + ') ---');
  for (const p of programmes) {
    console.log(`[${p.id}] "${p.title}" | slug: ${p.slug} | status: ${p.status} | created: ${p.createdAt.toISOString()}`);
  }

  const staff = await prisma.staffProfile.findMany({
    where: { tenantId: oxford?.id },
    select: { id: true, fullName: true, slug: true, roleTitle: true, createdAt: true }
  });
  console.log('\n--- OXFORD STAFF (' + staff.length + ') ---');
  for (const s of staff) {
    console.log(`[${s.id}] "${s.fullName}" | slug: ${s.slug} | role: "${s.roleTitle}" | created: ${s.createdAt.toISOString()}`);
  }
}

main().finally(() => prisma.$disconnect());

