import { test, expect } from '@playwright/test';

test.describe('Day 6: Dynamic Navigation Menus, Media Library Asset Management & Taxonomy', () => {
  const testRunId = Date.now();
  const testNavLabel = `Portal ${testRunId}`;
  const testNavUrl = `/portal-${testRunId}`;
  const testMediaTitle = `Campus Quad ${testRunId}`;
  const testMediaAlt = `Panoramic view of the historic campus quadrangle during autumn ${testRunId}`;

  test('Full Day 6 Lifecycle: Navigation Reordering, Public Navbar SSR, WCAG 2.2 AA Alt-Text Enforcement & Private Media Isolation', async ({ page, request }) => {
    test.setTimeout(90000);
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // ------------------------------------------------------------------------
    // Step 1: Sign in as Tenant Administrator
    // ------------------------------------------------------------------------
    await page.goto('/');
    const adminLink = page.locator('a[href="/admin"]').first();
    await expect(adminLink).toBeVisible();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Tenant User Administration');

    // Submit sign in
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    // Verify user badge
    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 10000 });
    await expect(userBadge).toContainText('admin@oxford.edu');
    await page.waitForLoadState('networkidle');

    // ------------------------------------------------------------------------
    // Step 2: Open Navigation Menus Tab & Verify Locations
    // ------------------------------------------------------------------------
    const navTabBtn = page.locator('#tab-navigation-btn');
    await expect(navTabBtn).toBeVisible();
    await navTabBtn.click();

    const navHeading = page.locator('#nav-heading');
    await expect(navHeading).toBeVisible({ timeout: 10000 });
    await expect(navHeading).toContainText('Institutional Navigation Menus');

    // Verify location switcher exists
    await expect(page.locator('#nav-loc-btn-header')).toBeVisible();
    await expect(page.locator('#nav-loc-btn-footer')).toBeVisible();
    await expect(page.locator('#nav-loc-btn-quick_links')).toBeVisible();

    // Verify seeded items exist in Header (Home, Admissions, Academics, etc.)
    await expect(page.locator('table[aria-label="Navigation Menu Items"]')).toBeVisible();
    const initialHeaderCount = await page.locator('tbody tr').count();
    expect(initialHeaderCount).toBeGreaterThanOrEqual(5);

    // Switch to Footer Menu and verify items
    await page.locator('#nav-loc-btn-footer').click();
    await page.waitForTimeout(500);
    await expect(page.locator('tbody tr')).toHaveCount(3); // 3 seeded footer items

    // Switch back to Header Navbar
    await page.locator('#nav-loc-btn-header').click();
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------------
    // Step 3: Create a New Navigation Menu Item
    // ------------------------------------------------------------------------
    await page.locator('#create-nav-item-btn').click();
    const navModalTitle = page.locator('#nav-modal-title');
    await expect(navModalTitle).toBeVisible();
    await expect(navModalTitle).toContainText('HEADER');

    await page.locator('#nav-item-label').fill(testNavLabel);
    await page.locator('#nav-item-url').fill(testNavUrl);
    await page.locator('#save-nav-item-btn').click();

    // Verify modal closes and new item appears in list
    await expect(navModalTitle).not.toBeVisible({ timeout: 10000 });
    const newNavRow = page.locator(`tr:has-text("${testNavLabel}")`);
    await expect(newNavRow).toBeVisible({ timeout: 10000 });
    await expect(newNavRow).toContainText(testNavUrl);

    // ------------------------------------------------------------------------
    // Step 4: Verify Dynamic Public Header Displays the New Menu Item
    // ------------------------------------------------------------------------
    await page.goto('/');
    const publicNav = page.locator('#primary-navigation');
    await expect(publicNav).toBeVisible();
    const publicPortalLink = publicNav.locator(`a:has-text("${testNavLabel}")`);
    await expect(publicPortalLink).toBeVisible({ timeout: 10000 });
    await expect(publicPortalLink).toHaveAttribute('href', testNavUrl);

    // ------------------------------------------------------------------------
    // Step 5: Media Library - Category Filtering & Seed Asset Inspection
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.locator('#tab-media-btn').click();

    const mediaHeading = page.locator('#media-heading');
    await expect(mediaHeading).toBeVisible({ timeout: 10000 });
    await expect(mediaHeading).toContainText('Media Library & Digital Assets');

    // Verify filter chips exist
    await expect(page.locator('#media-chip-all')).toBeVisible();
    await expect(page.locator('#media-chip-image')).toBeVisible();
    await expect(page.locator('#media-chip-document')).toBeVisible();

    // Filter by DOCUMENT
    await page.locator('#media-chip-document').click();
    await page.waitForTimeout(500);
    const docCard = page.locator('.media-card:has-text("Confidential Admissions Criteria")');
    await expect(docCard).toBeVisible();
    await expect(docCard).toContainText('RESTRICTED'); // Private access-controlled document

    // Reset filter to All Assets
    await page.locator('#media-chip-all').click();
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------------
    // Step 6: Test WCAG 2.2 AA Alt-Text Enforcement (FR-MEDIA-002)
    // ------------------------------------------------------------------------
    await page.locator('#upload-media-btn').click();
    const mediaModalTitle = page.locator('#media-modal-title');
    await expect(mediaModalTitle).toBeVisible();

    // Populate title and URL but leave alt-text completely blank
    await page.locator('#media-title-input').fill(testMediaTitle);
    await page.locator('#media-category-select').selectOption('IMAGE');
    await page.locator('#media-alt-input').fill(''); // Explicitly empty
    await page.locator('#submit-media-btn').click();

    // Verify accessibility validation error appears
    const errorAlert = page.locator('.alert-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText('WCAG 2.2 AA Accessibility Violation');

    // Now provide valid descriptive alternative text per WCAG 2.2 AA
    await page.locator('#media-alt-input').fill(testMediaAlt);
    await page.locator('#submit-media-btn').click();

    // Verify modal closes and asset appears in gallery
    await expect(mediaModalTitle).not.toBeVisible({ timeout: 10000 });
    const uploadedCard = page.locator(`.media-card:has-text("${testMediaTitle}")`);
    await expect(uploadedCard).toBeVisible({ timeout: 10000 });
    await expect(uploadedCard).toContainText('Alt Text OK');
    await expect(uploadedCard).toContainText('PUBLIC');

    // ------------------------------------------------------------------------
    // Step 7: Verify Access Control for Private Documents (FR-MEDIA-003)
    // ------------------------------------------------------------------------
    const uploadedAssetId = (await uploadedCard.getAttribute('id'))?.replace('media-card-', '');
    const docAssetId = (await docCard.getAttribute('id'))?.replace('media-card-', '');

    // Anonymous public request to public endpoint for a private document must return 404
    const privateDocRes = await request.get(`http://localhost:4000/api/v1/tenant/public/media/${docAssetId}`, {
      headers: { Host: 'oxford.localhost', Accept: 'application/json' },
    });
    expect(privateDocRes.status()).toBe(404);
    const privateJson = await privateDocRes.json();
    expect(privateJson.success).toBe(false);
    expect(privateJson.error.code).toBe('MEDIA_NOT_FOUND');

    // Public request for a public image must succeed with 200
    const publicAssetRes = await request.get(`http://localhost:4000/api/v1/tenant/public/media/${uploadedAssetId}`, {
      headers: { Host: 'oxford.localhost', Accept: 'application/json' },
    });
    expect(publicAssetRes.status()).toBe(200);
    const assetJson = await publicAssetRes.json();
    expect(assetJson.success).toBe(true);
    expect(assetJson.data.isPublic).toBe(true);
    expect(assetJson.data.title).toBe(testMediaTitle);

    // ------------------------------------------------------------------------
    // Step 8: Clean up Created Test Artifacts
    // ------------------------------------------------------------------------
    // Delete test media asset
    const deleteMediaBtn = uploadedCard.locator('button[aria-label^="Delete"]');
    page.once('dialog', (dialog) => dialog.accept());
    await deleteMediaBtn.click();
    await expect(uploadedCard).not.toBeVisible({ timeout: 10000 });

    // Switch to Navigation tab and delete test navigation item
    await page.locator('#tab-navigation-btn').click();
    const itemToDelete = page.locator(`tr:has-text("${testNavLabel}")`);
    await expect(itemToDelete).toBeVisible();
    const deleteNavBtn = itemToDelete.locator('button:has-text("Delete")');
    page.once('dialog', (dialog) => dialog.accept());
    await deleteNavBtn.click();
    await expect(itemToDelete).not.toBeVisible({ timeout: 10000 });
  });
});
