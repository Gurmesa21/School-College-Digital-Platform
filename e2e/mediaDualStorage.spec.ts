import { test, expect } from '@playwright/test';

test.describe('Day 11: Media Library Dual-Storage Architecture & Access Control E2E', () => {
  const testRunId = Date.now();
  const testPrivateTitle = `DualStorage Restricted Audit ${testRunId}`;
  const testPrivateCaption = `Internal financial and scholarship allocation audit ${testRunId}`;

  test('Full Day 11 Lifecycle: Dual Storage Upload, Safe Private Preview, Signed Links, 2-Phase Replace & Anonymous 404 Protection', async ({ page, request }) => {
    test.setTimeout(90000);
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    let createdAssetId: string | null = null;

    try {
      // ------------------------------------------------------------------------
      // Step 1: Sign in as Tenant Administrator
      // ------------------------------------------------------------------------
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText('Tenant User Administration');

      await page.locator('#auth-email').fill('admin@oxford.edu');
      await page.locator('#auth-password').fill('AdminPassword123!');
      await page.locator('#auth-signin-btn').click();

      const userBadge = page.locator('#auth-user-badge');
      await expect(userBadge).toBeVisible({ timeout: 10000 });
      await expect(userBadge).toContainText('admin@oxford.edu');
      await page.waitForLoadState('networkidle');

      // ------------------------------------------------------------------------
      // Step 2: Open Media Library Tab & Verify Dual Storage Badges
      // ------------------------------------------------------------------------
      const mediaTabBtn = page.locator('#tab-media-btn');
      await expect(mediaTabBtn).toBeVisible();
      await mediaTabBtn.click();

      const mediaHeading = page.locator('#media-heading');
      await expect(mediaHeading).toBeVisible({ timeout: 10000 });
      await expect(mediaHeading).toContainText('Media Library & Digital Assets');

      // Verify seeded Oxford Crest has PUBLIC badge
      const crestCard = page.locator('.media-card:has-text("Oxford International School Crest")');
      await expect(crestCard).toBeVisible();
      await expect(crestCard).toContainText('PUBLIC');

      // Verify seeded Confidential Rubric has RESTRICTED / PRIVATE badge and lock icon
      const rubricCard = page.locator('.media-card:has-text("Confidential Admissions Criteria")');
      await expect(rubricCard).toBeVisible();
      await expect(rubricCard).toContainText('RESTRICTED');
      await expect(rubricCard).toContainText('PRIVATE');
      await expect(rubricCard.locator('span[role="img"]')).toHaveText('🔒');

      // ------------------------------------------------------------------------
      // Step 3: Upload Private Document with Dual-Storage Policy
      // ------------------------------------------------------------------------
      await page.locator('#upload-media-btn').click();
      const mediaModalTitle = page.locator('#media-modal-title');
      await expect(mediaModalTitle).toBeVisible();

      await page.locator('#media-title-input').fill(testPrivateTitle);
      await page.locator('#media-category-select').selectOption('DOCUMENT');
      await page.locator('#media-caption-input').fill(testPrivateCaption);

      // Select PRIVATE storage policy radio button
      const privateRadio = page.locator('input[name="mediaStoragePolicy"][value="PRIVATE"]');
      await privateRadio.check();
      await expect(privateRadio).toBeChecked();

      // Submit upload
      await page.locator('#submit-media-btn').click();

      // Verify modal closes and private asset card appears
      await expect(mediaModalTitle).not.toBeVisible({ timeout: 10000 });
      const newCard = page.locator(`.media-card:has-text("${testPrivateTitle}")`);
      await expect(newCard).toBeVisible({ timeout: 10000 });
      await expect(newCard).toContainText('RESTRICTED');
      await expect(newCard).toContainText('PRIVATE');
      await expect(newCard.locator('span[role="img"]')).toHaveText('🔒');

      createdAssetId = (await newCard.getAttribute('id'))?.replace('media-card-', '') || null;
      expect(createdAssetId).toBeTruthy();

      // ------------------------------------------------------------------------
      // Step 4: Verify Fail-Closed Anonymous Access (HTTP 404)
      // ------------------------------------------------------------------------
      const anonymousRes = await request.get(`http://localhost:4000/api/v1/tenant/public/media/${createdAssetId}`, {
        headers: { Host: 'oxford.localhost' },
      });
      expect(anonymousRes.status()).toBe(404);
      const anonJson = await anonymousRes.json();
      expect(anonJson.error?.code).toBe('MEDIA_NOT_FOUND');

      // Direct /file endpoint must also return 404
      const anonymousFileRes = await request.get(`http://localhost:4000/api/v1/tenant/public/media/${createdAssetId}/file`, {
        headers: { Host: 'oxford.localhost' },
      });
      expect(anonymousFileRes.status()).toBe(404);

      // ------------------------------------------------------------------------
      // Step 5: Generate Temporary 15-Minute Signed Download URL
      // ------------------------------------------------------------------------
      const signedBtn = newCard.locator('button:has-text("Signed Link")');
      await expect(signedBtn).toBeVisible();
      await signedBtn.click();

      // Verify success notice for signed link
      const notice = page.locator('.alert-info, .alert-success');
      await expect(notice).toBeVisible({ timeout: 5000 });
      await expect(notice).toContainText('signed download URL');

      // ------------------------------------------------------------------------
      // Step 6: Test 2-Phase Safe File Replacement Modal
      // ------------------------------------------------------------------------
      const replaceBtn = newCard.locator('button:has-text("Replace")');
      await expect(replaceBtn).toBeVisible();
      await replaceBtn.click();

      const replaceModalTitle = page.locator('#replace-modal-title');
      await expect(replaceModalTitle).toBeVisible();
      await expect(replaceModalTitle).toContainText('2-Phase Safe Swap');

      // Cancel modal
      await page.locator('button:has-text("Cancel")').first().click();
      await expect(replaceModalTitle).not.toBeVisible();

      // ------------------------------------------------------------------------
      // Step 7: Clean Up Test Asset
      // ------------------------------------------------------------------------
      const deleteBtn = newCard.locator('button[aria-label^="Delete"]');
      page.once('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
      await expect(newCard).not.toBeVisible({ timeout: 10000 });
      createdAssetId = null; // Cleaned up cleanly
    } finally {
      // Safe fallback cleanup if an assertion fails before Step 7
      if (createdAssetId) {
        try {
          await page.request.delete(`http://localhost:4000/api/v1/tenant/cms/media/${createdAssetId}`, {
            headers: { Host: 'oxford.localhost' },
          });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });
});
