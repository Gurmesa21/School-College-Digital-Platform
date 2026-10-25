import { test, expect } from '@playwright/test';

test.describe('Platform E2E Smoke & Health Verification', () => {
  // 1. Public Website & UI Navigation
  test('1. Public Homepage renders correctly with system status and navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/School Platform/i);

    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('Private School & College Digital Website Platform');

    const statusHeading = page.locator('#status-heading');
    await expect(statusHeading).toBeVisible();
    await expect(statusHeading).toContainText('Environment & System Status');

    // Navigation to Admin interface
    const adminLink = page.locator('a[href="/admin"]').first();
    await expect(adminLink).toBeVisible();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);

    // Verify no fatal console errors during navigation
    const fatalErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404'));
    expect(fatalErrors.length).toBe(0);
  });

  // 2. Tenant Administration UI Rendering
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

  // 3. API Health Endpoints
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

  // 4. Unauthenticated Rejection
  test('4. Protected Tenant Administration API rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'oxford.localhost',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  // 5. Host-Header Spoofing Resistance
  test('5. Tenant header spoofing is rejected (x-tenant-id cannot bypass host resolution)', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        'x-tenant-id': 'unauthorized-tenant',
        Host: 'unregistered.localhost',
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INSTITUTION_NOT_FOUND');
  });

  // 6. Platform Administration Boundary
  test('6. Protected Platform Administration API rejects non-super-admin requests', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/platform/audit');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  // 7. Database-Backed Authentication & Session Lifecycle
  test('7. Authentication flows: sign-in, invalid credentials, and non-disclosing password reset', async ({ request }) => {
    // Invalid credentials return generic 401
    const invalidRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'nonexistent@oxford.edu', password: 'WrongPassword999!' },
    });
    expect(invalidRes.status()).toBe(401);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.success).toBe(false);
    expect(invalidBody.error.code).toBe('INVALID_CREDENTIALS');

    // Password reset request returns generic 200 without user enumeration
    const resetRes = await request.post('http://localhost:4000/api/v1/auth/password-reset/request', {
      data: { email: 'anyuser@example.com' },
    });
    expect(resetRes.status()).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody.success).toBe(true);

    // Valid sign-in for seeded database administrator
    const validRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    expect(validBody.success).toBe(true);
    expect(validBody.data.user.email).toBe('admin@oxford.edu');

    // Set-cookie header must be present
    const setCookie = validRes.headers()['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('school_session=');
  });

  // 8. Database-Backed Tenant Operations with Real Session
  test('8. Database-backed member listing and invitation lifecycle', async ({ request }) => {
    // 1. Sign in as Oxford administrator
    const loginRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    expect(loginRes.status()).toBe(200);
    const cookieHeader = loginRes.headers()['set-cookie'];
    const sessionCookie = cookieHeader.split(';')[0];

    // 2. Query members from database
    const membersRes = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
    });
    expect(membersRes.status()).toBe(200);
    const membersBody = await membersRes.json();
    expect(membersBody.success).toBe(true);
    expect(membersBody.data.items.length).toBeGreaterThanOrEqual(1);
    const adminMember = membersBody.data.items.find((m: any) => m.email === 'admin@oxford.edu');
    expect(adminMember).toBeDefined();

    // 3. Fetch available roles and create a tenant invitation in PostgreSQL
    const rolesRes = await request.get('http://localhost:4000/api/v1/tenant/admin/roles', {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
    });
    expect(rolesRes.status()).toBe(200);
    const rolesBody = await rolesRes.json();
    const rolesList = Array.isArray(rolesBody.data) ? rolesBody.data : (rolesBody.data.items || []);
    const staffRole = rolesList.find((r: any) => r.name === 'STAFF') || rolesList[0];

    const inviteEmail = `teacher-${Date.now()}@oxford.edu`;
    const inviteRes = await request.post('http://localhost:4000/api/v1/tenant/admin/invitations', {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
      data: {
        email: inviteEmail,
        roleIds: [staffRole.id],
      },
    });
    expect(inviteRes.status()).toBe(201);
    const inviteBody = await inviteRes.json();
    expect(inviteBody.success).toBe(true);
    const invitationId = inviteBody.data.id;
    expect(invitationId).toBeDefined();

    // 4. Revoke the invitation in PostgreSQL
    const revokeRes = await request.post(`http://localhost:4000/api/v1/tenant/admin/invitations/${invitationId}/revoke`, {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
    });
    expect(revokeRes.status()).toBe(200);
    const revokeBody = await revokeRes.json();
    expect(revokeBody.success).toBe(true);
    expect(revokeBody.data.message).toContain('revoked');

    // 5. Query immutable audit history from PostgreSQL
    const auditRes = await request.get('http://localhost:4000/api/v1/tenant/admin/audit', {
      headers: {
        Host: 'oxford.localhost',
        Cookie: sessionCookie,
      },
    });
    expect(auditRes.status()).toBe(200);
    const auditBody = await auditRes.json();
    expect(auditBody.success).toBe(true);
    expect(auditBody.data.items.length).toBeGreaterThanOrEqual(2);
  });

  // 9. Strict Cross-Tenant Isolation
  test('9. Strict cross-tenant isolation prevents Oxford admin from accessing Greenwood institution', async ({ request }) => {
    // Sign in as Oxford administrator
    const loginRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: { email: 'admin@oxford.edu', password: 'AdminPassword123!' },
    });
    const cookieHeader = loginRes.headers()['set-cookie'];
    const sessionCookie = cookieHeader.split(';')[0];

    // Attempt to access Greenwood tenant admin endpoints
    const crossRes = await request.get('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'secondary.localhost',
        Cookie: sessionCookie,
      },
    });
    expect(crossRes.status()).toBe(403);
    const crossBody = await crossRes.json();
    expect(crossBody.success).toBe(false);
    expect(crossBody.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
  });
});
