import { test, expect } from '@playwright/test';

test.describe('CMS Content Model, Page Publishing Lifecycle & Public Delivery', () => {
  const testRunId = Date.now();
  const testSlug = `admissions-e2e-${testRunId}`;
  const testTitle = `Admissions ${testRunId}`;
  const testSeoTitle = `Oxford Academy - Admissions ${testRunId}`;
  const testSeoDesc = `Official admissions and application details for academic year ${testRunId}.`;

  test('Complete 10-step CMS lifecycle: Draft, Persistence, Preview Isolation, Publish, Public SSR, Cross-Tenant Security & Archival', async ({ page, request }) => {
    test.setTimeout(60000);
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', (req) => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

    // ------------------------------------------------------------------------
    // Step 1: Sign in using controlled development administrator account
    // ------------------------------------------------------------------------
    await page.goto('/');
    const adminLink = page.locator('a[href="/admin"]');
    await expect(adminLink).toBeVisible();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Tenant User Administration');

    // Sign in via administrator credentials form
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    // Verify authenticated badge
    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 10000 });
    await expect(userBadge).toContainText('admin@oxford.edu');

    // Wait for post-login queries and renders to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // ------------------------------------------------------------------------
    // Step 2: Open the page-management interface
    // ------------------------------------------------------------------------
    await page.locator('#tab-pages-btn').click();

    const pagesHeading = page.locator('#pages-heading');
    await expect(pagesHeading).toBeVisible({ timeout: 10000 });
    await expect(pagesHeading).toContainText('Institutional CMS Pages');

    // ------------------------------------------------------------------------
    // Step 3: Create a draft with a supported section
    // ------------------------------------------------------------------------
    const createBtn = page.locator('#create-page-btn');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const modalTitle = page.locator('#editor-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('Create New CMS Page Draft');

    // Populate required fields
    await page.locator('#page-title-input').fill(testTitle);
    await page.locator('#page-slug-input').fill(testSlug);
    await page.locator('#page-summary-input').fill('Comprehensive admissions overview and application portal.');
    await page.locator('#page-seo-title-input').fill(testSeoTitle);
    await page.locator('#page-seo-description-input').fill(testSeoDesc);

    // Verify initial Hero section is pre-configured
    const heroHeadline = page.getByLabel('Headline *');
    await expect(heroHeadline).toBeVisible();
    await heroHeadline.fill(`Welcome to Admissions ${testRunId}`);

    const heroSubheadline = page.getByLabel('Subheadline');
    await heroSubheadline.fill('World-class holistic education and scholarship opportunities.');

    // ------------------------------------------------------------------------
    // Step 4: Save and reopen it
    // ------------------------------------------------------------------------
    const saveBtn = page.locator('#save-draft-btn');
    await saveBtn.click();

    // Verify modal closes and page appears in listing as DRAFT
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });

    const pageRow = page.locator(`tr:has-text("${testSlug}")`);
    await expect(pageRow).toBeVisible({ timeout: 10000 });
    await expect(pageRow).toContainText('DRAFT');
    await expect(pageRow).toContainText(testTitle);

    // Reopen editor and verify persisted state
    const editBtn = page.locator(`#edit-page-${testSlug}`);
    await editBtn.click();
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('Edit CMS Page');
    await expect(page.locator('#page-title-input')).toHaveValue(testTitle);
    await expect(page.locator('#page-slug-input')).toHaveValue(testSlug);

    // Close modal
    await page.locator('button[aria-label="Close editor"]').click();
    await expect(modalTitle).not.toBeVisible();

    // ------------------------------------------------------------------------
    // Step 5: Confirm the draft is NOT publicly accessible
    // ------------------------------------------------------------------------
    const draftPublicRes = await page.goto(`/${testSlug}`);
    // Next.js dynamic route calls notFound(), returning 404
    expect(draftPublicRes?.status()).toBe(404);

    // Verify direct API endpoint returns 404 for unauthenticated public requests
    const directApiRes = await request.get(`http://localhost:4000/api/v1/tenant/public/pages/${testSlug}`, {
      headers: { Host: 'oxford.localhost' },
    });
    expect(directApiRes.status()).toBe(404);
    const directApiJson = await directApiRes.json();
    expect(directApiJson.success).toBe(false);
    expect(directApiJson.error.code).toBe('PAGE_NOT_FOUND');

    // ------------------------------------------------------------------------
    // Step 6: Publish the page with the correct permission
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await page.locator('#tab-pages-btn').click();
    await expect(page.locator('#pages-heading')).toBeVisible();

    const publishBtn = page.locator(`#publish-page-${testSlug}`);
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // Verify status changes to PUBLISHED
    const publishedBadge = page.locator(`tr:has-text("${testSlug}") .badge`);
    await expect(publishedBadge).toContainText('PUBLISHED', { timeout: 10000 });

    // ------------------------------------------------------------------------
    // Step 7: Visit the public route and verify persisted content appears
    // ------------------------------------------------------------------------
    await page.goto(`/${testSlug}`);
    await expect(page.locator('h1')).toContainText(`Welcome to Admissions ${testRunId}`);
    await expect(page.locator('.hero-subheadline')).toContainText('World-class holistic education and scholarship opportunities.');

    // Breadcrumb navigation should be present
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText(testTitle);

    // ------------------------------------------------------------------------
    // Step 8: Confirm SEO title and metadata
    // ------------------------------------------------------------------------
    await expect(page).toHaveTitle(testSeoTitle);

    // ------------------------------------------------------------------------
    // Step 9: Attempt forbidden cross-tenant or unauthorized operation
    // ------------------------------------------------------------------------
    // Attempt accessing Oxford's published page under Greenwood's host header
    const crossTenantRes = await request.get(`http://localhost:4000/api/v1/tenant/public/pages/${testSlug}`, {
      headers: { Host: 'secondary.localhost' },
    });
    expect(crossTenantRes.status()).toBe(404);
    const crossTenantJson = await crossTenantRes.json();
    expect(crossTenantJson.success).toBe(false);
    expect(crossTenantJson.error.code).toBe('PAGE_NOT_FOUND');

    // Attempt modifying page without authentication
    const unauthEditRes = await request.put(`http://localhost:4000/api/v1/tenant/cms/pages/invalid-id`, {
      headers: { Host: 'oxford.localhost' },
      data: { title: 'Hacked Title', slug: 'hacked-slug' },
    });
    expect(unauthEditRes.status()).toBe(401);

    // ------------------------------------------------------------------------
    // Step 10: Archive the page and verify public route obeys archival policy
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await page.locator('#tab-pages-btn').click();
    await expect(page.locator('#pages-heading')).toBeVisible();

    const archiveBtn = page.locator(`#archive-page-${testSlug}`);
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    // Verify status changes to ARCHIVED
    const archivedBadge = page.locator(`tr:has-text("${testSlug}") .badge`);
    await expect(archivedBadge).toContainText('ARCHIVED', { timeout: 10000 });

    // Public route must now return 404 (BR-002)
    const archivedPublicRes = await page.goto(`/${testSlug}`);
    expect(archivedPublicRes?.status()).toBe(404);

    const archivedApiRes = await request.get(`http://localhost:4000/api/v1/tenant/public/pages/${testSlug}`, {
      headers: { Host: 'oxford.localhost' },
    });
    expect(archivedApiRes.status()).toBe(404);
  });

  test('Server-side Slug Uniqueness Enforcement (BR-013)', async ({ request }) => {
    // Sign in as Oxford administrator
    const loginRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    expect(loginRes.status()).toBe(200);
    const cookieHeader = loginRes.headers()['set-cookie'];
    const sessionCookie = cookieHeader.split(';')[0];

    // Seeded Oxford page slug is "welcome"
    const duplicateRes = await request.post('http://localhost:4000/api/v1/tenant/cms/pages', {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
      data: {
        title: 'Conflicting Welcome Page',
        slug: 'welcome',
        sections: [],
      },
    });

    expect(duplicateRes.status()).toBe(409);
    const duplicateBody = await duplicateRes.json();
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.error.code).toBe('SLUG_ALREADY_EXISTS');
  });
});
