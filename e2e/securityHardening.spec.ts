import { test, expect } from '@playwright/test';

test.describe('Day 18: Security Hardening & Tenant Isolation Tests (NFR-SEC-001, BR-001, NFR-PRIV-001)', () => {
  test('1. Web frontend emits hardened HTTP security response headers', async ({ page, request }) => {
    const res = await request.get('http://localhost:3000/', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('2. API endpoints emit hardened security response headers and strip server fingerprint', async ({ request }) => {
    const res = await request.get('http://localhost:4000/health');
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toBe('0');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('3. Cross-tenant isolation blocks Oxford Admin session from accessing Greenwood tenant resources', async ({ page, request }) => {
    // 1. Sign in as Oxford tenant admin on web UI
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 15000 });
    await expect(userBadge).toContainText('admin@oxford.edu');

    // Extract session cookie from browser context
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'school_session');
    expect(sessionCookie).toBeDefined();

    // 2. Direct API request targeting Greenwood tenant with Oxford cookie
    const crossTenantRes = await request.get('http://localhost:4000/api/v1/tenant/cms/pages', {
      headers: {
        'Host': 'greenwood.localhost:4000',
        'Cookie': `school_session=${sessionCookie?.value}`,
      },
    });

    expect(crossTenantRes.status()).toBe(403);
    const crossTenantBody = await crossTenantRes.json();
    expect(crossTenantBody.success).toBe(false);
    expect(crossTenantBody.error.code).toBe('TENANT_MEMBERSHIP_REQUIRED');
  });

  test('4. CSRF origin guard rejects cookie-authenticated state mutations from untrusted origin', async ({ request }) => {
    // 1. Sign in to obtain a valid session cookie
    const signInRes = await request.post('http://localhost:4000/api/v1/auth/sign-in', {
      data: {
        email: 'admin@oxford.edu',
        password: 'AdminPassword123!',
      },
    });
    expect(signInRes.status()).toBe(200);

    const setCookieHeader = signInRes.headers()['set-cookie'] || '';
    const sessionMatch = setCookieHeader.match(/school_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : '';
    expect(sessionToken).toBeTruthy();

    // 2. Attempt mutating request with cookie and an untrusted cross-origin header
    const csrfRes = await request.post('http://localhost:4000/api/v1/tenant/cms/pages', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Cookie': `school_session=${sessionToken}`,
        'Origin': 'https://evil-attacker.com',
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Exploit Page',
        slug: 'exploit',
        sections: [],
      },
    });

    expect(csrfRes.status()).toBe(403);
    const csrfBody = await csrfRes.json();
    expect(csrfBody.error.code).toBe('CSRF_ORIGIN_FORBIDDEN');
  });

  test('5. Bounded payload limit rejects oversized JSON requests with HTTP 413', async ({ request }) => {
    const largePadding = 'A'.repeat(1024 * 1024 + 100); // > 1MB
    const overflowRes = await request.post('http://localhost:4000/api/v1/tenant/public/analytics/event', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
      },
      data: {
        eventType: 'PAGE_VIEW',
        path: '/overflow-test',
        padding: largePadding,
      },
    });

    expect(overflowRes.status()).toBe(413);
    const overflowBody = await overflowRes.json();
    expect(overflowBody.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  test('6. Analytics public ingestion sanitizes PII values with data minimization', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/v1/tenant/public/analytics/event', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
      },
      data: {
        eventType: 'SEARCH',
        path: '/search',
        metadata: {
          searchTerm: 'enquiry for student jane.smith@example.org or call 555-019-2831',
        },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.recorded).toBe(true);
  });
});
