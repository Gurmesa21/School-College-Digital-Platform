import { PrismaClient } from '@school/db';

const prisma = new PrismaClient();

async function cleanTestForms() {
  const oxford = await prisma.tenant.findUnique({ where: { slug: 'oxford' } });
  const tenantId = oxford.id;

  const testForms = await prisma.form.findMany({
    where: {
      tenantId,
      OR: [
        { slug: { startsWith: 'scholarship-' } },
        { slug: { startsWith: 'dept-enquiry-' } },
      ],
    },
    select: { id: true, slug: true }
  });
  console.log(`Found ${testForms.length} test forms to clean.`);

  if (testForms.length > 0) {
    const formIds = testForms.map(f => f.id);
    const delSubs = await prisma.formSubmission.deleteMany({ where: { formId: { in: formIds } } });
    const delFields = await prisma.formField.deleteMany({ where: { formId: { in: formIds } } });
    const delForms = await prisma.form.deleteMany({ where: { id: { in: formIds } } });
    console.log(`Deleted ${delSubs.count} submissions, ${delFields.count} fields, and ${delForms.count} test forms.`);
  }

  const remaining = await prisma.form.findMany({
    where: { tenantId },
    select: { id: true, title: true, slug: true }
  });
  console.log(`Remaining legitimate forms for Oxford (${remaining.length}):`);
  remaining.forEach(f => console.log(` - "${f.title}" [${f.slug}]`));
}

cleanTestForms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
