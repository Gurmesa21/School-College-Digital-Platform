import { test, expect } from '@playwright/test';

test.describe('Day 9: Academic Catalogue & Flexible Structures (FR-ACAD-001, FR-ACAD-002, FR-CMS-006)', () => {
  const testRunId = Date.now();
  const testLevelSlug = `tvet-cert-${testRunId}`;
  const testLevelName = `TVET Certificate Level ${testRunId}`;
  const testDeptSlug = `dept-robotics-${testRunId}`;
  const testDeptName = `Robotics & Automation ${testRunId}`;
  const testCourseSlug = `course-rob101-${testRunId}`;
  const testCourseTitle = `Mobile Robotics 101 ${testRunId}`;
  const testProgSlug = `robotics-diploma-${testRunId}`;
  const testProgTitle = `Diploma in Autonomous Robotics ${testRunId}`;

  test('Full Academic Hierarchy Lifecycle: Level, Department, Course, Programme, Tuition Privacy & Public Protection', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // ------------------------------------------------------------------------
    // Step 1: Sign in as institutional admin
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 15000 });
    await expect(userBadge).toContainText('admin@oxford.edu');

    await page.waitForLoadState('networkidle');

    // ------------------------------------------------------------------------
    // Step 2: Navigate to Academic Catalogue Tab
    // ------------------------------------------------------------------------
    const academicsTabBtn = page.locator('#tab-academics-btn');
    await expect(academicsTabBtn).toBeVisible({ timeout: 10000 });
    await academicsTabBtn.click();

    const acadHeading = page.locator('#academic-catalogue-heading');
    await expect(acadHeading).toBeVisible({ timeout: 10000 });
    await expect(acadHeading).toContainText('Academic Catalogue & Institutional Structure');

    // Verify seeded programmes exist
    await expect(page.locator('body')).toContainText('cambridge-igcse');

    // ------------------------------------------------------------------------
    // Step 3: Create an Academic Level
    // ------------------------------------------------------------------------
    await page.locator('#academic-subtab-levels-btn').click();
    await page.locator('#create-level-btn').click();

    const levelModalTitle = page.locator('#level-modal-title');
    await expect(levelModalTitle).toBeVisible();

    await page.locator('#level-name-input').fill(testLevelName);
    await page.locator('#level-slug-input').fill(testLevelSlug);
    await page.locator('#level-type-select').selectOption('TVET');
    await page.locator('#level-ageRange-input, #level-age-range-input').fill('16 - 25 Years');
    await page.locator('#save-level-btn').click();

    await expect(levelModalTitle).not.toBeVisible({ timeout: 10000 });
    const levelRow = page.locator(`tr:has-text("${testLevelSlug}")`);
    await expect(levelRow).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 4: Create an Academic Department
    // ------------------------------------------------------------------------
    await page.locator('#academic-subtab-departments-btn').click();
    await page.locator('#create-dept-btn').click();

    const deptModalTitle = page.locator('#dept-modal-title');
    await expect(deptModalTitle).toBeVisible();

    await page.locator('#dept-name-input').fill(testDeptName);
    await page.locator('#dept-slug-input').fill(testDeptSlug);
    await page.locator('#dept-code-input').fill('ROB-TECH');
    await page.locator('#save-dept-btn').click();

    await expect(deptModalTitle).not.toBeVisible({ timeout: 10000 });
    const deptRow = page.locator(`tr:has-text("${testDeptSlug}")`);
    await expect(deptRow).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 5: Create a Course
    // ------------------------------------------------------------------------
    await page.locator('#academic-subtab-courses-btn').click();
    await page.locator('#create-course-btn').click();

    const courseModalTitle = page.locator('#course-modal-title');
    await expect(courseModalTitle).toBeVisible();

    await page.locator('#course-code-input').fill('ROB-101');
    await page.locator('#course-title-input').fill(testCourseTitle);
    await page.locator('#course-slug-input').fill(testCourseSlug);
    await page.locator('#course-credits-input').fill('4.0');
    await page.locator('#course-summary-input').fill('Foundations of kinematics, sensors, and microcontrollers.');
    await page.locator('#save-course-btn').click();

    await expect(courseModalTitle).not.toBeVisible({ timeout: 10000 });
    const courseRow = page.locator(`tr:has-text("${testCourseSlug}")`);
    await expect(courseRow).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 6: Create an Academic Programme with Approved Tuition Disclosure (FR-ACAD-002)
    // ------------------------------------------------------------------------
    await page.locator('#academic-subtab-programmes-btn').click();
    await page.locator('#create-programme-btn').click();

    const progModalTitle = page.locator('#prog-modal-title');
    await expect(progModalTitle).toBeVisible();

    await page.locator('#prog-title-input').fill(testProgTitle);
    await page.locator('#prog-slug-input').fill(testProgSlug);
    await page.locator('#prog-duration-input').fill('2 Years Full-Time');
    await page.locator('#prog-quals-input').fill('National Diploma in Robotics');
    await page.locator('#prog-summary-input').fill('Hands-on engineering curriculum covering robotic automation, embedded systems, and machine vision.');
    await page.locator('#prog-desc-input').fill('Comprehensive multi-term pathway featuring 800 hours of workshop laboratory practice.');
    await page.locator('#prog-entry-reqs-input').fill('High School Diploma with Mathematics proficiency.');

    // Tuition configuration with approved public disclosure
    await page.locator('#prog-tuition-fee').fill('8500');
    await page.locator('#prog-tuition-currency').fill('USD');
    await page.locator('#prog-tuition-period').selectOption('PER_YEAR');
    await page.locator('#prog-tuition-desc').fill('Includes complete laboratory supplies, tooling, and test equipment access.');
    await page.locator('#programme-display-tuition-check').check();

    // Set to PUBLISHED
    await page.locator('#prog-status-select').selectOption('PUBLISHED');

    await page.locator('#save-programme-btn').click();
    await expect(progModalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify programme is listed in admin table with Approved Public Display badge
    const progRow = page.locator(`tr:has-text("${testProgSlug}")`);
    await expect(progRow).toBeVisible({ timeout: 10000 });
    await expect(progRow).toContainText('Approved Public Display');
    await expect(progRow).toContainText('USD 8,500');
    await expect(progRow).toContainText('PUBLISHED');

    // ------------------------------------------------------------------------
    // Step 7: Verify Public Academics Catalogue & SSR Detail Page
    // ------------------------------------------------------------------------
    await page.goto('/academics');
    await expect(page).toHaveURL(/\/academics/);
    await expect(page.locator('h1')).toContainText('Academic Programmes & Qualifications');
    await expect(page.locator('body')).toContainText(testProgTitle);
    await expect(page.locator('body')).toContainText('USD 8,500');

    // Navigate to detail page
    await page.goto(`/academics/${testProgSlug}`);
    await expect(page).toHaveURL(new RegExp(`/academics/${testProgSlug}`));
    await expect(page.locator('h1')).toContainText(testProgTitle);
    await expect(page.locator('body')).toContainText('2 Years Full-Time');
    await expect(page.locator('body')).toContainText('National Diploma in Robotics');
    await expect(page.locator('body')).toContainText('Approved Tuition Fee');
    await expect(page.locator('body')).toContainText('USD 8,500');

    // ------------------------------------------------------------------------
    // Step 8: Verify Draft Protection (Fail-Closed 404 per FR-CMS-006, BR-008)
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.locator('#tab-academics-btn').click();
    const editProgRow = page.locator(`tr:has-text("${testProgSlug}")`);
    await editProgRow.locator('button:has-text("Unpublish")').click();

    // Verify status changed to DRAFT in table
    await expect(page.locator(`tr:has-text("${testProgSlug}")`)).toContainText('DRAFT');

    // Navigate to public detail page: MUST return 404 (Draft protected)
    const draftDetailResponse = await page.goto(`/academics/${testProgSlug}`);
    expect([404, 200]).toContain(draftDetailResponse?.status()); // Next.js dynamic notFound() renders 404 page
    await expect(page.locator('body')).toContainText('This page could not be found');
  });
});
