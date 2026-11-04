import { PrismaClient } from '@school/db';

const prisma = new PrismaClient();

async function cleanContamination() {
  const oxford = await prisma.tenant.findUnique({ where: { slug: 'oxford' } });
  if (!oxford) {
    throw new Error('Oxford tenant not found!');
  }
  const tenantId = oxford.id;

  console.log('===============================================================');
  console.log(' [Day 21 Remediation] Safe Database Test Contamination Cleanup');
  console.log('===============================================================');
  console.log(`Target Tenant: ${oxford.name} (${oxford.id})`);

  // Count test records before cleanup
  const progCount = await prisma.programme.count({ where: { tenantId, slug: { startsWith: 'robotics-diploma-' } } });
  const staffCount = await prisma.staffProfile.count({ where: { tenantId, slug: { startsWith: 'prof-arthur-' } } });
  const courseCount = await prisma.course.count({ where: { tenantId, slug: { startsWith: 'course-rob101-' } } });
  const deptCount = await prisma.academicDepartment.count({ where: { tenantId, slug: { startsWith: 'dept-robotics-' } } });
  const levelCount = await prisma.academicLevel.count({ where: { tenantId, slug: { startsWith: 'tvet-cert-' } } });

  console.log('\nIdentified Test Records to Purge:');
  console.log(` - Programmes:  ${progCount}`);
  console.log(` - Staff:        ${staffCount}`);
  console.log(` - Courses:      ${courseCount}`);
  console.log(` - Departments:  ${deptCount}`);
  console.log(` - Levels:       ${levelCount}`);

  // Execute safe atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete ProgrammeCourse junction records
    const testProgIds = (await tx.programme.findMany({
      where: { tenantId, slug: { startsWith: 'robotics-diploma-' } },
      select: { id: true },
    })).map((p) => p.id);

    const testCourseIds = (await tx.course.findMany({
      where: { tenantId, slug: { startsWith: 'course-rob101-' } },
      select: { id: true },
    })).map((c) => c.id);

    const deletedJunctions = await tx.programmeCourse.deleteMany({
      where: {
        OR: [
          { programmeId: { in: testProgIds } },
          { courseId: { in: testCourseIds } },
        ],
      },
    });

    // 2. Delete test Programmes
    const deletedProgs = await tx.programme.deleteMany({
      where: { tenantId, slug: { startsWith: 'robotics-diploma-' } },
    });

    // 3. Delete test Staff Profiles
    const deletedStaff = await tx.staffProfile.deleteMany({
      where: { tenantId, slug: { startsWith: 'prof-arthur-' } },
    });

    // 4. Delete test Courses
    const deletedCourses = await tx.course.deleteMany({
      where: { tenantId, slug: { startsWith: 'course-rob101-' } },
    });

    // 5. Delete test Departments
    const deletedDepts = await tx.academicDepartment.deleteMany({
      where: { tenantId, slug: { startsWith: 'dept-robotics-' } },
    });

    // 6. Delete test Levels
    const deletedLevels = await tx.academicLevel.deleteMany({
      where: { tenantId, slug: { startsWith: 'tvet-cert-' } },
    });

    // 7. Delete test Navigation items
    const deletedNavs = await tx.navigationMenuItem.deleteMany({
      where: { label: { startsWith: 'Portal ' } },
    });

    // 8. Delete test Media assets
    const deletedMedia = await tx.mediaAsset.deleteMany({
      where: { title: { startsWith: 'Campus Quad ' } },
    });

    return {
      deletedJunctions: deletedJunctions.count,
      deletedProgs: deletedProgs.count,
      deletedStaff: deletedStaff.count,
      deletedCourses: deletedCourses.count,
      deletedDepts: deletedDepts.count,
      deletedLevels: deletedLevels.count,
      deletedNavs: deletedNavs.count,
      deletedMedia: deletedMedia.count,
    };
  });

  console.log('\nCleanup Transaction Committed Successfully:');
  console.log(` - Deleted ProgrammeCourses: ${result.deletedJunctions}`);
  console.log(` - Deleted Programmes:       ${result.deletedProgs}`);
  console.log(` - Deleted Staff Profiles:   ${result.deletedStaff}`);
  console.log(` - Deleted Courses:          ${result.deletedCourses}`);
  console.log(` - Deleted Departments:      ${result.deletedDepts}`);
  console.log(` - Deleted Levels:           ${result.deletedLevels}`);
  console.log(` - Deleted Navigation Items: ${result.deletedNavs}`);
  console.log(` - Deleted Media Assets:     ${result.deletedMedia}`);

  // Verify legitimate records preserved
  const remainingProgs = await prisma.programme.findMany({ where: { tenantId }, select: { title: true, slug: true, status: true } });
  const remainingStaff = await prisma.staffProfile.findMany({ where: { tenantId }, select: { fullName: true, slug: true, roleTitle: true } });
  const remainingDepts = await prisma.academicDepartment.findMany({ where: { tenantId }, select: { name: true, slug: true } });
  const remainingLevels = await prisma.academicLevel.findMany({ where: { tenantId }, select: { name: true, slug: true } });
  const remainingCourses = await prisma.course.findMany({ where: { tenantId }, select: { title: true, slug: true } });

  console.log('\nVerified Legitimate Oxford Records Preserved:');
  console.log(` - Programmes (${remainingProgs.length}):`, remainingProgs.map(p => `"${p.title}" [${p.slug}] (${p.status})`));
  console.log(` - Staff (${remainingStaff.length}):`, remainingStaff.map(s => `"${s.fullName}" [${s.slug}]`));
  console.log(` - Departments (${remainingDepts.length}):`, remainingDepts.map(d => `"${d.name}"`));
  console.log(` - Levels (${remainingLevels.length}):`, remainingLevels.map(l => `"${l.name}"`));
  console.log(` - Courses (${remainingCourses.length}):`, remainingCourses.map(c => `"${c.title}"`));
  console.log('===============================================================');
}

cleanContamination()
  .catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

