import { test, expect } from '@playwright/test';

test.describe('Day 19: End-to-End Automated Regression Suite & Multi-Tenant Journeys', () => {

  // 1. Multi-Step Visitor Journey: Search -> Programme -> Contact Enquiry Submission (SRS UC-PUB-01, UC-PUB-02, UC-PUB-03, FR-CON-001)
  test('1. End-to-end visitor cross-cutting journey: Homepage -> Search -> Programme Detail -> Enquiry Submission', async ({ page }) => {
    // Step 1: Visit Institutional Homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Oxford International School/i);

    // Step 2: Navigate to Public Search via header shortcut
    const searchNav = page.locator('a[href="/search"]').first();
    await searchNav.click();
    await expect(page).toHaveURL(/\/search/);

    // Step 3: Search for academic curriculum
    const searchInput = page.locator('input[name="q"], input[type="search"]').first();
    await searchInput.fill('Cambridge');
    await searchInput.press('Enter');

    // Wait for search results
    await expect(page.locator('text=Cambridge IGCSE Programme').first()).toBeVisible();

    // Step 4: Click through to Programme Detail
    const programmeLink = page.locator('a[href*="/academics/cambridge-igcse"]').first();
    await programmeLink.click();
    await expect(page).toHaveURL(/\/academics\/cambridge-igcse/);
    await expect(page.locator('h1')).toContainText('Cambridge IGCSE Programme');

    // Step 5: Follow link to Contact / Admissions Inquiry
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('Get in Touch');

    // Step 6: Submit a valid enquiry form
    const testEmail = `parent_${Date.now()}@example.com`;
    await page.locator('input[name="fullName"]').fill('Eleanor Vance Sr.');
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="phone"]').fill('+44 1865 999888');
    await page.locator('select[name="department"]').selectOption('admissions');
    await page.locator('textarea[name="message"]').fill('We are seeking admission details and laboratory schedule for the upcoming Cambridge IGCSE term.');

    // Submit form
    await page.locator('button:has-text("Send Message"), button[type="submit"]').click();

    // Step 7: Verify confirmation state and unique tracking reference code
    const refBadge = page.locator('#submission-reference-badge');
    await expect(refBadge).toBeVisible();
    await expect(refBadge).toContainText('Reference Code');
  });

  // 2. Multi-Tenant Side-by-Side Isolation (SRS 5.1, BR-001, SEC-TEN-001)
  test('2. Multi-tenant side-by-side browser isolation across Oxford and Greenwood institutions', async ({ browser }) => {
    // Oxford Context
    const oxfordContext = await browser.newContext();
    const oxfordPage = await oxfordContext.newPage();
    await oxfordPage.goto('/');
    await expect(oxfordPage.locator('h1')).toContainText('Oxford International School');
    await expect(oxfordPage.locator('text=Cambridge IGCSE Programme').first()).toBeVisible();

    // Greenwood Context (using x-forwarded-host to simulate distinct institutional domain)
    const greenwoodContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'greenwood.localhost:3000',
      },
    });
    const greenwoodPage = await greenwoodContext.newPage();
    await greenwoodPage.goto('/');
    await expect(greenwoodPage.locator('h1')).toContainText('Greenwood Secondary School');

    // Verify Oxford content is strictly NOT visible on Greenwood
    const oxfordContentOnGreenwood = greenwoodPage.locator('text=Oxford International School');
    await expect(oxfordContentOnGreenwood).toHaveCount(0);

    await oxfordContext.close();
    await greenwoodContext.close();
  });

  // 3. Graceful Fallback on Unknown Tenant Host (SRS 4.3, Fail-Safe Architecture)
  test('3. Unknown or unregistered tenant host renders institutional fallback without server crash', async ({ browser }) => {
    const unknownContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'nonexistent-school.localhost:3000',
      },
    });
    const page = await unknownContext.newPage();
    const response = await page.goto('/');

    // Either a 200 with fallback platform portal or 404 institutional not found
    expect([200, 404]).toContain(response?.status());
    // Must NOT leak Oxford or Greenwood institutional branding
    await expect(page.locator('.public-brand-name')).toContainText('School Platform');
    await unknownContext.close();
  });

  // 4. Admin Content Sync & Navigation (SRS 5.2, FR-COM-002)
  test('4. Administrative authentication and tab navigation lifecycle', async ({ page }) => {
    // Sign into Admin Console
    await page.goto('/admin');
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    // Wait for authenticated admin state
    await expect(page.locator('#auth-user-badge')).toBeVisible();
    await expect(page.locator('#auth-user-badge')).toContainText('admin@oxford.edu');

    // Navigate to Editorial News tab
    await page.locator('#tab-news-btn').click();
    await expect(page.locator('#tab-news-btn')).toHaveClass(/active/);

    // Navigate to Announcements tab
    await page.locator('#tab-announcements-btn').click();
    await expect(page.locator('#tab-announcements-btn')).toHaveClass(/active/);
  });

  // 5. Negative & Security Failure Recovery Scenarios (SRS NFR-SEC-001, BR-003, BR-012)
  test('5. Form validation prevents empty submissions and bot honeypot traps spam', async ({ page, request }) => {
    await page.goto('/contact');

    // Attempt to submit completely empty form
    await page.locator('button:has-text("Send Message"), button[type="submit"]').click();

    // Form should not submit successfully without required fields
    await expect(page.locator('#submission-reference-badge')).toHaveCount(0);

    // Direct API honeypot submission test: bot filling hidden `website_hp` field
    const honeypotRes = await request.post('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      headers: {
        Host: 'oxford.localhost',
      },
      data: {
        data: {
          fullName: 'Spam Bot',
          email: 'spambot@example.com',
          phone: '+1 800 555 0199',
          subject: 'Buy cheap medicine',
          message: 'Spam payload',
          website_hp: 'http://spam-link.example.com', // Hidden bot honeypot field
        },
      },
    });

    // Honeypot should reject or silently discard spam
    expect([400, 422]).toContain(honeypotRes.status());
  });

  // 6. Cross-Tenant Admin Boundary Protection (SEC-TEN-001, BR-001)
  test('6. Oxford Admin authenticated session is strictly rejected from Greenwood admin operations', async ({ request }) => {
    // 1. Authenticate as Oxford Admin
    const authRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      headers: { Host: 'oxford.localhost' },
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    expect(authRes.status()).toBe(200);

    const cookies = authRes.headers()['set-cookie'] || '';
    const sessionMatch = cookies.match(/school_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : '';
    expect(sessionToken).toBeTruthy();

    // 2. Attempt to query Greenwood admin members using Oxford session
    const crossTenantRes = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'greenwood.localhost',
        Cookie: `school_session=${sessionToken}`,
      },
    });

    // Cross-tenant access must be rejected with 401 (no session in Greenwood) or 403 Forbidden
    expect([401, 403]).toContain(crossTenantRes.status());
  });

  // 7. Invalid Credentials UI Error Handling (FR-AUTH-003)
  test('7. Admin login with invalid credentials displays clear error message without crashing', async ({ page }) => {
    await page.goto('/admin');

    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('CompletelyWrongPassword999!');
    await page.locator('#auth-signin-btn').click();

    // Error message should render
    const errorMsg = page.locator('#auth-error-msg');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).not.toBeEmpty();
  });
});
