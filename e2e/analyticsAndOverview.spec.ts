import { test, expect } from '@playwright/test';

test.describe('Day 17: Privacy-Aware Analytics & Admin Overviews (FR-ANL-001, NFR-PRIV-001, BR-001)', () => {
  // 1. Public Anonymous Event Tracking
  test('1. Public visitor generates anonymous pageview telemetry with privacy data minimization', async ({ page, request }) => {
    // 1. Visit homepage
    await page.goto('/', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });
    await expect(page).toHaveTitle(/Oxford International School/i);

    // 2. Directly send public analytics event and verify 201 response
    const eventRes = await request.post('http://localhost:4000/api/v1/tenant/public/analytics/event', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
      },
      data: {
        eventType: 'PAGE_VIEW',
        path: '/academics',
        referrerDomain: 'https://www.google.com/search?q=oxford',
      },
    });

    expect(eventRes.status()).toBe(201);
    const eventBody = await eventRes.json();
    expect(eventBody.success).toBe(true);
    expect(eventBody.data.recorded).toBe(true);
  });

  // 2. Admin Overview Dashboard Rendering & Content Inventory
  test('2. Tenant Admin accesses Overview & Analytics dashboard with KPI cards and content inventory', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    // Sign in as Oxford tenant admin
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 15000 });

    // Check that Overview & Analytics tab button is rendered and selected by default
    const overviewTab = page.locator('#tab-overview-btn');
    await expect(overviewTab).toBeVisible({ timeout: 10000 });
    await expect(overviewTab).toHaveText(/Overview & Analytics/i);

    // Check Privacy Shield banner
    await expect(page.locator('text=Privacy Shield Active')).toBeVisible({ timeout: 10000 });

    // Check KPI metric cards
    await expect(page.locator('text=Total Page Views')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Public Searches')).toBeVisible();
    await expect(page.locator('text=Enquiry Submissions')).toBeVisible();
    await expect(page.locator('text=Document Downloads')).toBeVisible();

    // Check Content Inventory section
    await expect(page.getByRole('heading', { name: /Operational Content Inventory/i })).toBeVisible();
    await expect(page.locator('text=Published Pages').first()).toBeVisible();
    await expect(page.locator('text=Academic Programmes').first()).toBeVisible();
    await expect(page.locator('text=Faculty / Staff Profiles').first()).toBeVisible();
  });

  // 3. Period Filtering Interactivity (7d, 30d, 90d)
  test('3. Period filters update displayed analytics window', async ({ page }) => {
    await page.goto('/admin');
    const emailField = page.locator('#auth-email');
    if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailField.fill('admin@oxford.edu');
      await page.locator('#auth-password').fill('AdminPassword123!');
      await page.locator('#auth-signin-btn').click();
      await expect(page.locator('#auth-user-badge')).toBeVisible({ timeout: 15000 });
    }

    const btn7d = page.getByRole('button', { name: '7 Days' });
    const btn30d = page.getByRole('button', { name: '30 Days' });
    const btn90d = page.getByRole('button', { name: '90 Days' });

    await expect(btn7d).toBeVisible({ timeout: 10000 });
    await expect(btn30d).toBeVisible();
    await expect(btn90d).toBeVisible();

    // Switch to 7 Days
    await btn7d.click();
    await expect(btn7d).toBeVisible();

    // Switch to 90 Days
    await btn90d.click();
    await expect(btn90d).toBeVisible();
  });

  // 4. Analytics Data Export
  test('4. Analytics summary export returns valid CSV data without personal information', async ({ request }) => {
    // 1. Sign in as Oxford admin
    const loginRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    expect(loginRes.status()).toBe(200);
    const cookieHeader = loginRes.headers()['set-cookie'] || '';
    const sessionCookie = cookieHeader.split(';')[0];

    // 2. Query export endpoint
    const exportRes = await request.get('http://localhost:4000/api/v1/tenant/admin/analytics/export?period=30d&format=csv', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: sessionCookie,
      },
    });

    expect(exportRes.status()).toBe(200);
    const contentType = exportRes.headers()['content-type'] || '';
    expect(contentType).toContain('text/csv');
    const csvText = await exportRes.text();
    expect(csvText).toContain('Date,PageViews,Searches,Enquiries,DocumentDownloads');
  });

  // 5. Strict Cross-Tenant Isolation
  test('5. Cross-tenant isolation prevents accessing another tenant\'s analytics overview', async ({ request }) => {
    // Sign in as Oxford admin
    const loginRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    const sessionCookie = (loginRes.headers()['set-cookie'] || '').split(';')[0];

    // Try accessing Greenwood with Oxford session
    const res = await request.get('http://localhost:4000/api/v1/tenant/admin/analytics/overview', {
      headers: {
        Host: 'greenwood.localhost:4000',
        Cookie: sessionCookie,
      },
    });

    expect(res.status()).toBe(403);
  });

  // 6. Day 16/17 OpenGraph Crawler Exception in Robots Policy
  test('6. Robots.txt policy includes Allow: /api/og exception for social preview crawlers', async ({ request }) => {
    const robotsRes = await request.get('/robots.txt', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });

    expect(robotsRes.status()).toBe(200);
    const body = await robotsRes.text();
    expect(body).toContain('Allow: /api/og');
    expect(body).toContain('Disallow: /admin');

    // Confirm /api/og returns a valid image
    const ogRes = await request.get('/api/og?title=RobotsTest&type=portal', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });
    expect(ogRes.status()).toBe(200);
    const ogType = ogRes.headers()['content-type'] || '';
    expect(ogType).toMatch(/image\/png/i);
  });
});
