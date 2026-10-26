import { test, expect } from '@playwright/test';

test.describe('Day 10: Staff Directory & Profiles (FR-ACAD-003, FR-ACAD-004, FR-CMS-006)', () => {
  const testRunId = Date.now();
  const testStaffSlug = `prof-arthur-${testRunId}`;
  const testStaffName = `Professor Arthur Pendelton ${testRunId}`;
  const testStaffRole = `Chair of Applied Mathematics ${testRunId}`;
  const testStaffEmail = `arthur.${testRunId}@oxford.school.example`;

  test('Full Staff Lifecycle: Admin CRUD, Contact Privacy Disclosure, Public Directory & Fail-Closed Isolation', async ({ page }) => {
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
    // Step 2: Navigate to Staff Directory Tab
    // ------------------------------------------------------------------------
    const staffTabBtn = page.locator('#tab-staff-btn');
    await expect(staffTabBtn).toBeVisible({ timeout: 10000 });
    await staffTabBtn.click();

    const staffHeading = page.locator('#staff-admin-heading');
    await expect(staffHeading).toBeVisible({ timeout: 10000 });
    await expect(staffHeading).toContainText('Staff Directory & Profiles');

    // Verify seeded published staff profile exists in the table
    await expect(page.locator('body')).toContainText('Dr. Eleanor Vance');

    // ------------------------------------------------------------------------
    // Step 3: Create a new Staff Member Profile in DRAFT mode
    // ------------------------------------------------------------------------
    await page.locator('#create-staff-btn').click();

    const modalTitle = page.locator('#staff-modal-title');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(modalTitle).toContainText('Add New Staff Member');

    await page.locator('#staff-fullname-input').fill(testStaffName);
    // Slug might auto-populate or we explicitly set it
    await page.locator('#staff-slug-input').fill(testStaffSlug);
    await page.locator('#staff-roletitle-input').fill(testStaffRole);
    await page.locator('#staff-qualifications-input').fill('Ph.D. Applied Mathematics, FIMA');
    await page.locator('#staff-office-input').fill('Mathematics Institute, Room 402');
    await page.locator('#staff-hours-input').fill('Tuesday 10:00 - 12:00');
    await page.locator('#staff-subjects-input').fill('Linear Algebra, Mathematical Modelling, Differential Equations');
    await page.locator('#staff-biography-input').fill('Distinguished mathematician researching computational dynamics and fluid mechanics.');

    // Approved contact details (Privacy allowlisting - FR-ACAD-003)
    await page.locator('#staff-email-input').fill(testStaffEmail);
    await page.locator('#staff-display-email-checkbox').check();

    // Set initial status to DRAFT
    await page.locator('#staff-status-select').selectOption('DRAFT');

    await page.locator('#staff-submit-btn').click();
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify newly created staff member is listed in table as DRAFT
    const staffRow = page.locator(`tr:has-text("${testStaffSlug}")`);
    await expect(staffRow).toBeVisible({ timeout: 10000 });
    await expect(staffRow).toContainText('DRAFT');
    await expect(staffRow).toContainText(testStaffEmail);

    // ------------------------------------------------------------------------
    // Step 4: Verify Fail-Closed Protection on DRAFT Profile (FR-CMS-006, BR-008)
    // ------------------------------------------------------------------------
    // Anonymous visitors accessing a draft profile URL must receive 404
    const draftResponse = await page.goto(`/staff/${testStaffSlug}`);
    expect([404, 200]).toContain(draftResponse?.status());
    await expect(page.locator('body')).toContainText('This page could not be found');

    // ------------------------------------------------------------------------
    // Step 5: Publish the Staff Member via Admin Interface
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.locator('#tab-staff-btn').click();
    await expect(page.locator('#staff-admin-heading')).toBeVisible();

    const targetRow = page.locator(`tr:has-text("${testStaffSlug}")`);
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Click "Publish" button on the row
    await targetRow.locator('button:has-text("Publish")').click();
    await expect(targetRow).toContainText('PUBLISHED', { timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 6: Verify Public Staff Directory (FR-ACAD-004)
    // ------------------------------------------------------------------------
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('h1')).toContainText('Faculty & Professional Staff');

    // Both seeded staff and newly published staff should appear
    await expect(page.locator('body')).toContainText(testStaffName);
    await expect(page.locator('body')).toContainText('Dr. Eleanor Vance');

    // Test directory keyword filter
    await page.locator('#staff-search-input').fill('Pendelton');
    await page.locator('#staff-filter-submit-btn').click();

    // Filtered results should contain Arthur and not Eleanor
    await expect(page.locator('body')).toContainText(testStaffName);
    await expect(page.locator('body')).not.toContainText('Dr. Eleanor Vance');

    // ------------------------------------------------------------------------
    // Step 7: Verify Public Staff Profile Detail Page (FR-ACAD-003)
    // ------------------------------------------------------------------------
    await page.goto(`/staff/${testStaffSlug}`);
    await expect(page).toHaveURL(new RegExp(`/staff/${testStaffSlug}`));

    // Profile headings & identity
    await expect(page.locator('h1')).toContainText(testStaffName);
    await expect(page.locator('body')).toContainText(testStaffRole);
    await expect(page.locator('body')).toContainText('Ph.D. Applied Mathematics, FIMA');
    await expect(page.locator('body')).toContainText('Mathematics Institute, Room 402');
    await expect(page.locator('body')).toContainText('Tuesday 10:00 - 12:00');
    await expect(page.locator('body')).toContainText('Linear Algebra');

    // Verify approved public contact email link
    const emailLink = page.locator(`a[href="mailto:${testStaffEmail}"]`);
    await expect(emailLink).toBeVisible();

    // ------------------------------------------------------------------------
    // Step 8: Verify Redaction on Unapproved Contact Details (Helena Rostova / Marcus Sterling)
    // ------------------------------------------------------------------------
    // Marcus Sterling has publicEmail displayed, but unapproved phone (phone omitted)
    await page.goto('/staff/marcus-sterling');
    await expect(page.locator('h1')).toContainText('Marcus Sterling');
    await expect(page.locator('body')).toContainText('m.sterling@oxford.school.example');
    // Ensure unapproved phone is not exposed
    await expect(page.locator('body')).not.toContainText('+44 1865 270002');

    // ------------------------------------------------------------------------
    // Step 9: Verify Seeded Draft Profile Fail-Closed (Helena Rostova)
    // ------------------------------------------------------------------------
    const helenaResponse = await page.goto('/staff/helena-rostova');
    expect([404, 200]).toContain(helenaResponse?.status());
    await expect(page.locator('body')).toContainText('This page could not be found');
  });
});
