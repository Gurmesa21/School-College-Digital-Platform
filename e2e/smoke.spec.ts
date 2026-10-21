import { test, expect } from '@playwright/test';

test.describe('Platform E2E Smoke & Health Verification', () => {
  test('1. Public Homepage renders correctly with system status', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Private School & College Digital Website Platform/i);

    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('Private School & College Digital Website Platform');

    const statusHeading = page.locator('#status-heading');
    await expect(statusHeading).toBeVisible();
    await expect(statusHeading).toContainText('Environment & System Status');

    const adminLink = page.locator('a[href="/admin"]');
    await expect(adminLink).toBeVisible();
  });

  test('2. Tenant Administration UI renders tabs and controls', async ({ page }) => {
    await page.goto('/admin');

    const heading = page.locator('h1');
    await expect(heading).toContainText('Tenant User Administration');

    // Verify tabs exist and are switchable
    const membersTab = page.locator('button.tab-btn:has-text("Members & Roles")');
    const invitationsTab = page.locator('button.tab-btn:has-text("Invitations & Onboarding")');
    const auditTab = page.locator('button.tab-btn:has-text("Audit History")');

    await expect(membersTab).toBeVisible();
    await expect(invitationsTab).toBeVisible();
    await expect(auditTab).toBeVisible();

    // Click invitations tab and verify invitation form
    await invitationsTab.click();
    await expect(page.locator('#invitations-heading')).toBeVisible();
    await expect(page.locator('#invite-email')).toBeVisible();

    // Click audit history tab
    await auditTab.click();
    await expect(page.locator('#audit-heading')).toBeVisible();
  });

  test('3. API Health endpoints return expected status', async ({ request }) => {
    // API Liveness check (/health)
    const healthRes = await request.get('http://localhost:4000/health');
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.success).toBe(true);
    expect(healthJson.data.status).toBe('healthy');

    // Versioned API Health check (/api/v1/health)
    const apiHealthRes = await request.get('http://localhost:4000/api/v1/health');
    expect(apiHealthRes.status()).toBe(200);
    const apiHealthJson = await apiHealthRes.json();
    expect(apiHealthJson.success).toBe(true);
    expect(apiHealthJson.data.status).toBe('healthy');
  });

  test('4. Protected Tenant Administration API rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        'x-tenant-id': 'oxford',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  test('5. Protected Platform Administration API rejects non-super-admin requests', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/platform/audit');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});
