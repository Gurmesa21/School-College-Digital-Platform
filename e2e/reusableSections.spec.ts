import { test, expect } from '@playwright/test';

test.describe('Day 8: Reusable CMS Sections, Layout Composition & Live CO-PE Synchronization', () => {
  const testRunId = Date.now();
  const testSectionSlug = `open-house-cta-${testRunId}`;
  const testSectionName = `Open House CTA ${testRunId}`;
  const testPageSlug = `discovery-${testRunId}`;
  const testPageTitle = `Campus Discovery ${testRunId}`;

  test('Full Reusable Section Lifecycle: Library Management, Page Layout Insertion, Reordering, Public SSR & Live CO-PE Sync', async ({ page }) => {
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
    // Step 2: Navigate to Reusable Sections Library Tab
    // ------------------------------------------------------------------------
    await page.locator('#tab-sections-btn').click();
    const sectionsHeading = page.locator('#sections-heading');
    await expect(sectionsHeading).toBeVisible({ timeout: 10000 });
    await expect(sectionsHeading).toContainText('Reusable CMS Sections & Layout Library');

    // Verify seeded reusable sections exist
    await expect(page.locator('body')).toContainText('campus-tour-cta');
    await expect(page.locator('body')).toContainText('admissions-faq');

    // ------------------------------------------------------------------------
    // Step 3: Create a new Master Reusable Section (CTA_BANNER)
    // ------------------------------------------------------------------------
    await page.locator('#create-section-btn').click();
    const modalTitle = page.locator('#section-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('Create Reusable CMS Section');

    await page.locator('#section-name-input').fill(testSectionName);
    await page.locator('#section-slug-input').fill(testSectionSlug);
    await page.locator('#section-category-input').fill('Admissions');
    await page.locator('#section-desc-input').fill('Central call-to-action banner for campus tours and open week.');

    // Select CTA_BANNER section type
    await page.locator('#section-type-select').selectOption('CTA_BANNER');

    // Fill CTA_BANNER config fields
    await page.locator('#cta-headline-input').fill('Join Our 2027 Open Campus Week');
    await page.locator('#cta-subheadline-input').fill('Meet department heads and tour campus facilities.');
    await page.locator('#cta-primary-btn-text').fill('Register For Open Week');
    await page.locator('#cta-primary-btn-url').fill('/contact');

    // Save section
    await page.locator('#save-section-btn').click();
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify newly created section is listed in library
    const newSectionRow = page.locator(`tr:has-text("${testSectionSlug}")`);
    await expect(newSectionRow).toBeVisible({ timeout: 10000 });
    await expect(newSectionRow).toContainText('CTA_BANNER');
    await expect(newSectionRow).toContainText(testSectionName);

    // ------------------------------------------------------------------------
    // Step 4: Verify initial Placements modal (0 placements)
    // ------------------------------------------------------------------------
    const placementsBtn = newSectionRow.locator('button:has-text("0 Page")');
    await expect(placementsBtn).toBeVisible();
    await placementsBtn.click();

    const placementsModalTitle = page.locator('#placements-modal-title');
    await expect(placementsModalTitle).toBeVisible();
    await expect(page.locator('body')).toContainText('This reusable section is not currently embedded in any pages.');

    // Close placements modal
    await page.locator('button[aria-label="Close dialog"]').click();
    await expect(placementsModalTitle).not.toBeVisible();

    // ------------------------------------------------------------------------
    // Step 5: Compose a Page Layout embedding the Reusable Section
    // ------------------------------------------------------------------------
    await page.locator('#tab-pages-btn').click();
    await expect(page.locator('#pages-heading')).toBeVisible();

    await page.locator('#create-page-btn').click();
    const pageModalTitle = page.locator('#editor-modal-title');
    await expect(pageModalTitle).toBeVisible();

    await page.locator('#page-title-input').fill(testPageTitle);
    await page.locator('#page-slug-input').fill(testPageSlug);
    await page.locator('#page-summary-input').fill('Campus discovery overview page.');
    await page.locator('#page-seo-title-input').fill(`${testPageTitle} | Oxford International`);
    await page.locator('#page-seo-description-input').fill('Explore our world-class educational campus.');

    // Pre-configured Hero section: update headline
    await page.getByLabel('Headline *').first().fill(`Discover Oxford Academy ${testRunId}`);

    // Insert Reusable Section from Library
    await page.locator('#insert-reusable-section-btn').click();
    const insertModalTitle = page.locator('#insert-section-modal-title');
    await expect(insertModalTitle).toBeVisible();

    // Find and insert our test section from inside the modal
    const insertModal = page.locator('[aria-labelledby="insert-section-modal-title"]');
    await expect(insertModal).toBeVisible();
    await insertModal.locator('button:has-text("+ Insert")').first().click();
    await expect(insertModalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify Reusable Section card appears in Page Editor
    await expect(page.locator('.badge-reusable')).toBeVisible();

    // Add Accordion section
    await page.locator('#add-accordion-btn').click();

    // Reorder sections: Move the reusable section up
    const moveUpBtns = page.locator('button[title="Move section up"]');
    const secondMoveUp = moveUpBtns.nth(1);
    if (await secondMoveUp.isEnabled()) {
      await secondMoveUp.click();
    }

    // Save Page Draft
    await page.locator('#save-draft-btn').click();
    await expect(pageModalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify Page in listing and Publish it
    const pageRow = page.locator(`tr:has-text("${testPageSlug}")`);
    await expect(pageRow).toBeVisible({ timeout: 10000 });
    await expect(pageRow).toContainText('DRAFT');

    const publishBtn = pageRow.locator('button:has-text("Publish")');
    await publishBtn.click();
    await expect(pageRow).toContainText('PUBLISHED', { timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 6: Public SSR Verification (/discovery-[testRunId])
    // ------------------------------------------------------------------------
    await page.goto(`/${testPageSlug}`);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

    // Verify Reusable Section CTA Banner rendered in SSR
    await expect(page.locator('body')).toContainText('Join Our 2027 Open Campus Week');
    await expect(page.locator('body')).toContainText('Meet department heads and tour campus facilities.');
    const registerBtn = page.locator('a:has-text("Register For Open Week")');
    await expect(registerBtn).toBeVisible();
    await expect(registerBtn).toHaveAttribute('href', '/contact');

    // ------------------------------------------------------------------------
    // Step 7: Live CO-PE Synchronization Test
    // ------------------------------------------------------------------------
    // Return to Admin -> Sections Library
    await page.goto('/admin');
    await page.locator('#tab-sections-btn').click();
    await expect(sectionsHeading).toBeVisible();

    // Edit the master reusable section
    const targetSectionRow = page.locator(`tr:has-text("${testSectionSlug}")`);
    await targetSectionRow.locator('button:has-text("Edit")').click();
    await expect(modalTitle).toBeVisible();

    // Change headline to live updated text
    const updatedHeadline = `LIVE UPDATED: All 2027 Tours Fully Booked! ${testRunId}`;
    await page.locator('#cta-headline-input').fill(updatedHeadline);
    await page.locator('#cta-primary-btn-text').fill('Join Waiting List');
    await page.locator('#save-section-btn').click();
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });

    // Verify Placements now reflects 1 page placement
    const updatedRow = page.locator(`tr:has-text("${testSectionSlug}")`);
    const updatedPlacementsBtn = updatedRow.locator('button:has-text("1 Page")');
    await expect(updatedPlacementsBtn).toBeVisible({ timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 8: Verify Public Page Immediately Shows Live Update (Without Re-publishing)
    // ------------------------------------------------------------------------
    await page.goto(`/${testPageSlug}`);
    await expect(page.locator('body')).toContainText(updatedHeadline, { timeout: 15000 });
    await expect(page.locator('a:has-text("Join Waiting List")')).toBeVisible();
  });
});
