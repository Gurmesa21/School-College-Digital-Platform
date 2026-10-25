import { spawn, execSync } from 'child_process';
import http from 'http';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function waitForPort(url, maxRetries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetchUrl(url);
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await wait(intervalMs);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  console.log('[Smoke Test] Starting API server on port 4000...');
  const apiProcess = spawn('node', ['apps/api/dist/server.js'], {
    stdio: 'inherit',
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, PORT: '4000', NODE_ENV: 'development', ALLOW_DEV_TENANT_OVERRIDE: 'true' },
  });

  console.log('[Smoke Test] Starting Web server on port 3000...');
  const webProcess = spawn('npm', ['run', 'start', '--workspace=@school/web'], {
    stdio: 'inherit',
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
  });

  const cleanup = () => {
    console.log('\n[Smoke Test] Shutting down processes...');
    try {
      if (process.platform === 'win32') {
        if (apiProcess.pid) {
          try { execSync(`taskkill /pid ${apiProcess.pid} /T /F`, { stdio: 'ignore' }); } catch {}
        }
        if (webProcess.pid) {
          try { execSync(`taskkill /pid ${webProcess.pid} /T /F`, { stdio: 'ignore' }); } catch {}
        }
      } else {
        if (apiProcess.pid) {
          try { process.kill(-apiProcess.pid, 'SIGKILL'); } catch {
            try { apiProcess.kill('SIGKILL'); } catch {}
          }
        }
        if (webProcess.pid) {
          try { process.kill(-webProcess.pid, 'SIGKILL'); } catch {
            try { webProcess.kill('SIGKILL'); } catch {}
          }
        }
        try { execSync('fuser -k 3000/tcp 4000/tcp 2>/dev/null || true', { stdio: 'ignore' }); } catch {}
        try { execSync('pkill -f "next start" 2>/dev/null || true', { stdio: 'ignore' }); } catch {}
        try { execSync('pkill -f "apps/api/dist/server.js" 2>/dev/null || true', { stdio: 'ignore' }); } catch {}
      }
    } catch {
      // Ignore cleanup error
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    console.log('[Smoke Test] Waiting for API server readiness on port 4000...');
    await waitForPort('http://localhost:4000/health');
    console.log('[Smoke Test] API is ready!');

    console.log('[Smoke Test] Waiting for Web server readiness on port 3000...');
    await waitForPort('http://localhost:3000/');
    console.log('[Smoke Test] Web is ready!\n');

    let allPassed = true;
    const testCases = [];

    // Test 1: Liveness probe /health
    console.log('Testing 1: GET http://localhost:4000/health');
    const health1 = await fetchUrl('http://localhost:4000/health');
    const h1Json = JSON.parse(health1.body);
    const pass1 = health1.status === 200 && h1Json.success === true && h1Json.data.status === 'healthy';
    testCases.push({ name: 'API Liveness Probe (/health)', status: health1.status, pass: pass1 });
    console.log(`  -> Status: ${health1.status}, Service: ${h1Json.data.service}, Healthy: ${pass1}`);

    // Test 2: Versioned health probe /api/v1/health
    console.log('Testing 2: GET http://localhost:4000/api/v1/health');
    const health2 = await fetchUrl('http://localhost:4000/api/v1/health');
    const h2Json = JSON.parse(health2.body);
    const pass2 = health2.status === 200 && h2Json.success === true && h2Json.data.status === 'healthy';
    testCases.push({ name: 'Versioned API Health Probe (/api/v1/health)', status: health2.status, pass: pass2 });
    console.log(`  -> Status: ${health2.status}, Service: ${h2Json.data.service}, Healthy: ${pass2}`);

    // Test 3: Frontend public landing /
    console.log('Testing 3: GET http://localhost:3000/');
    const webHome = await fetchUrl('http://localhost:3000/');
    const pass3 = webHome.status === 200 && webHome.body.includes('Private School') && webHome.body.includes('Digital Website Platform');
    testCases.push({ name: 'Frontend Public Landing (/)', status: webHome.status, pass: pass3 });
    console.log(`  -> Status: ${webHome.status}, Contains Brand: ${pass3}`);

    // Test 4: Frontend administration page /admin
    console.log('Testing 4: GET http://localhost:3000/admin');
    const webAdmin = await fetchUrl('http://localhost:3000/admin');
    const pass4 = webAdmin.status === 200 && webAdmin.body.includes('Tenant User Administration');
    testCases.push({ name: 'Frontend Admin Console (/admin)', status: webAdmin.status, pass: pass4 });
    console.log(`  -> Status: ${webAdmin.status}, Contains Admin UI: ${pass4}`);

    // Test 5: Negative Authorization - Protected tenant admin route rejects unauthenticated request
    console.log('Testing 5: GET http://localhost:4000/api/v1/tenant/admin/users without auth');
    const unauthAdmin = await fetchUrl('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: { 'x-tenant-id': 'oxford' },
    });
    const unauthJson = JSON.parse(unauthAdmin.body);
    const pass5 = unauthAdmin.status === 401 && unauthJson.success === false && unauthJson.error.code === 'AUTHENTICATION_REQUIRED';
    testCases.push({ name: 'Tenant Admin API Rejects Unauthenticated (401)', status: unauthAdmin.status, pass: pass5 });
    console.log(`  -> Status: ${unauthAdmin.status}, Error Code: ${unauthJson.error?.code}, Pass: ${pass5}`);

    // Test 6: Negative Authorization - Protected platform admin route rejects non-super-admin
    console.log('Testing 6: GET http://localhost:4000/api/v1/platform/audit without auth');
    const unauthPlatform = await fetchUrl('http://localhost:4000/api/v1/platform/audit');
    const unauthPlatformJson = JSON.parse(unauthPlatform.body);
    const pass6 = unauthPlatform.status === 401 && unauthPlatformJson.success === false && unauthPlatformJson.error.code === 'AUTHENTICATION_REQUIRED';
    testCases.push({ name: 'Platform Admin API Rejects Non-Super-Admin (401)', status: unauthPlatform.status, pass: pass6 });
    console.log(`  -> Status: ${unauthPlatform.status}, Error Code: ${unauthPlatformJson.error?.code}, Pass: ${pass6}`);

    // Test 7: Sign-In with Invalid Credentials (non-disclosing 401)
    console.log('Testing 7: POST http://localhost:4000/api/v1/auth/sign-in with invalid credentials');
    const invalidSignIn = await fetchUrl('http://localhost:4000/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'wrongpassword' }),
    });
    const signInJson = JSON.parse(invalidSignIn.body);
    const pass7 = invalidSignIn.status === 401 && signInJson.success === false && signInJson.error.code === 'INVALID_CREDENTIALS';
    testCases.push({ name: 'Auth Sign-in Generic 401 on Invalid Credentials', status: invalidSignIn.status, pass: pass7 });
    console.log(`  -> Status: ${invalidSignIn.status}, Error Code: ${signInJson.error?.code}, Pass: ${pass7}`);

    // Test 8: Password Reset Request (non-disclosing 200)
    console.log('Testing 8: POST http://localhost:4000/api/v1/auth/password-reset/request');
    const resetReq = await fetchUrl('http://localhost:4000/api/v1/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anyuser@example.com' }),
    });
    const resetJson = JSON.parse(resetReq.body);
    const pass8 = resetReq.status === 200 && resetJson.success === true;
    testCases.push({ name: 'Password Reset Non-Disclosing Success (200)', status: resetReq.status, pass: pass8 });
    console.log(`  -> Status: ${resetReq.status}, Success: ${resetJson.success}, Pass: ${pass8}`);

    // Test 9: Valid Sign-In for Admin User (sets session cookie)
    console.log('Testing 9: POST http://localhost:4000/api/v1/auth/sign-in with valid admin credentials');
    const validSignIn = await fetchUrl('http://localhost:4000/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@oxford.edu', password: 'AdminPassword123!' }),
    });
    const validSignJson = JSON.parse(validSignIn.body);
    const setCookieHeader = validSignIn.headers['set-cookie'];
    const pass9 = validSignIn.status === 200 && validSignJson.success === true && !!setCookieHeader;
    testCases.push({ name: 'Admin Sign-in Establishes Session (200 & Cookie)', status: validSignIn.status, pass: pass9 });
    console.log(`  -> Status: ${validSignIn.status}, User: ${validSignJson.data?.user?.email}, Cookie set: ${pass9}`);

    const cookieString = setCookieHeader ? setCookieHeader[0].split(';')[0] : '';

    // Test 10: Authenticated Tenant Admin Lists Members
    console.log('Testing 10: GET http://localhost:4000/api/v1/tenant/admin/users with session cookie');
    const authAdmin = await fetchUrl('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });
    const authAdminJson = JSON.parse(authAdmin.body);
    const pass10 = authAdmin.status === 200 && authAdminJson.success === true && Array.isArray(authAdminJson.data?.items);
    testCases.push({ name: 'Authenticated Admin Lists Tenant Members (200)', status: authAdmin.status, pass: pass10 });
    console.log(`  -> Status: ${authAdmin.status}, Members Count: ${authAdminJson.data?.items?.length}, Pass: ${pass10}`);

    // Test 11a: Header Spoofing Protection - x-tenant-id header CANNOT override server-side tenant
    console.log('Testing 11a: Verification that x-tenant-id header cannot override server-side host tenant');
    const spoofHeaderRes = await fetchUrl('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'oxford.localhost:4000',
        'x-tenant-id': 'greenwood', // Attempt to spoof Greenwood via header
        Cookie: cookieString,
      },
    });
    // Because header is safely ignored, tenant remains oxford, so oxford admin succeeds (200), not spoofed to Greenwood
    const pass11a = spoofHeaderRes.status === 200;
    testCases.push({ name: 'Header Spoofing Guard (x-tenant-id safely ignored)', status: spoofHeaderRes.status, pass: pass11a });
    console.log(`  -> Status: ${spoofHeaderRes.status}, Header safely ignored: ${pass11a}`);

    // Test 11b: Cross-Tenant Isolation - Oxford admin accessing Greenwood via authorized Host is blocked with 403
    console.log('Testing 11b: GET http://localhost:4000/api/v1/tenant/admin/users with Host: greenwood.localhost');
    const crossTenant = await fetchUrl('http://localhost:4000/api/v1/tenant/admin/users', {
      headers: {
        Host: 'greenwood.localhost:4000',
        Cookie: cookieString,
      },
    });
    const crossJson = JSON.parse(crossTenant.body);
    const pass11b = crossTenant.status === 403 && crossJson.success === false && (crossJson.error.code === 'TENANT_MEMBERSHIP_REQUIRED' || crossJson.error.code === 'FORBIDDEN_TENANT_ACCESS');
    testCases.push({ name: 'Cross-Tenant Isolation Blocks Unauthorized Tenant (403)', status: crossTenant.status, pass: pass11b });
    console.log(`  -> Status: ${crossTenant.status}, Error Code: ${crossJson.error?.code}, Pass: ${pass11b}`);

    // Test 12: Admin Reads Audit Logs
    console.log('Testing 12: GET http://localhost:4000/api/v1/tenant/admin/audit with session cookie');
    const auditRes = await fetchUrl('http://localhost:4000/api/v1/tenant/admin/audit', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });
    const auditJson = JSON.parse(auditRes.body);
    const pass12 = auditRes.status === 200 && auditJson.success === true && Array.isArray(auditJson.data?.items);
    testCases.push({ name: 'Admin Reads Tenant Audit Trail (200)', status: auditRes.status, pass: pass12 });
    console.log(`  -> Status: ${auditRes.status}, Audit Count: ${auditJson.data?.items?.length}, Pass: ${pass12}`);

    // Test 13: Public Seeded CMS Page Retrieval
    console.log('Testing 13: GET http://localhost:4000/api/v1/tenant/public/pages/welcome');
    const cmsPublicRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/pages/welcome', {
      headers: {
        Host: 'oxford.localhost:4000',
      },
    });
    const cmsPublicJson = JSON.parse(cmsPublicRes.body);
    const pass13 = cmsPublicRes.status === 200 && cmsPublicJson.success === true && cmsPublicJson.data?.slug === 'welcome';
    testCases.push({ name: 'Public CMS Page Served for Eligible Published Content (200)', status: cmsPublicRes.status, pass: pass13 });
    console.log(`  -> Status: ${cmsPublicRes.status}, Slug: ${cmsPublicJson.data?.slug}, Sections: ${cmsPublicJson.data?.sections?.length}, Pass: ${pass13}`);

    // Test 14: Draft Page Isolation - Drafts are NOT returned publicly (404)
    console.log('Testing 14: GET http://localhost:4000/api/v1/tenant/public/pages/about-us-draft');
    const draftRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/pages/about-us-draft', {
      headers: {
        Host: 'oxford.localhost:4000',
      },
    });
    const pass14 = draftRes.status === 404;
    testCases.push({ name: 'Draft Page Isolation from Anonymous Delivery (404)', status: draftRes.status, pass: pass14 });
    console.log(`  -> Status: ${draftRes.status}, Draft Protected: ${pass14}`);

    // Test 15: Frontend SSR CMS Page Rendering
    console.log('Testing 15: GET http://localhost:3000/welcome');
    const webCmsPage = await fetchUrl('http://localhost:3000/welcome', {
      headers: {
        Host: 'localhost:3000',
      },
    });
    const pass15 = webCmsPage.status === 200 && (webCmsPage.body.includes('Oxford') || webCmsPage.body.includes('Welcome'));
    testCases.push({ name: 'Frontend SSR Renders Persisted CMS Page (/welcome)', status: webCmsPage.status, pass: pass15 });
    console.log(`  -> Status: ${webCmsPage.status}, Renders CMS Content: ${pass15}`);

    // Test 16: Public Navigation Menu Retrieval (Day 6 Dynamic Navigation)
    console.log('Testing 16: GET http://localhost:4000/api/v1/tenant/public/navigation/HEADER');
    const pubNavRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/navigation/HEADER', {
      headers: {
        Host: 'oxford.localhost:4000',
      },
    });
    const pubNavJson = JSON.parse(pubNavRes.body);
    const pass16 = pubNavRes.status === 200 && pubNavJson.success === true && pubNavJson.data?.location === 'HEADER' && Array.isArray(pubNavJson.data?.items) && pubNavJson.data.items.length >= 5;
    testCases.push({ name: 'Public Navigation Menu Served for HEADER Location (200)', status: pubNavRes.status, pass: pass16 });
    console.log(`  -> Status: ${pubNavRes.status}, Items Count: ${pubNavJson.data?.items?.length}, Pass: ${pass16}`);

    // Test 17: Authenticated Access to Media Library (FR-MEDIA-001)
    console.log('Testing 17: GET http://localhost:4000/api/v1/tenant/cms/media with Admin Session');
    const authMediaRes = await fetchUrl('http://localhost:4000/api/v1/tenant/cms/media', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });
    const authMediaJson = JSON.parse(authMediaRes.body);
    const pass17 = authMediaRes.status === 200 && authMediaJson.success === true && Array.isArray(authMediaJson.data?.items) && authMediaJson.data.items.length >= 4;
    testCases.push({ name: 'Admin Retrieves Tenant Media Assets with RBAC (200)', status: authMediaRes.status, pass: pass17 });
    console.log(`  -> Status: ${authMediaRes.status}, Asset Count: ${authMediaJson.data?.items?.length}, Pass: ${pass17}`);

    const publicAsset = authMediaJson.data?.items?.find((i) => i.isPublic);
    const privateAsset = authMediaJson.data?.items?.find((i) => !i.isPublic);

    // Test 18: Public Media Asset Retrieval Anonymously (FR-MEDIA-004)
    console.log(`Testing 18: GET http://localhost:4000/api/v1/tenant/public/media/${publicAsset?.id}`);
    const pubMediaRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/public/media/${publicAsset?.id}`, {
      headers: {
        Host: 'oxford.localhost:4000',
        Accept: 'application/json',
      },
    });
    const pubMediaJson = JSON.parse(pubMediaRes.body);
    const pass18 = pubMediaRes.status === 200 && pubMediaJson.success === true && pubMediaJson.data?.isPublic === true;
    testCases.push({ name: 'Public Media Asset Served Anonymously (200)', status: pubMediaRes.status, pass: pass18 });
    console.log(`  -> Status: ${pubMediaRes.status}, Category: ${pubMediaJson.data?.category}, Pass: ${pass18}`);

    // Test 19: Private Media Asset Security Isolation (FR-MEDIA-003)
    console.log(`Testing 19: GET http://localhost:4000/api/v1/tenant/public/media/${privateAsset?.id}`);
    const privMediaRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/public/media/${privateAsset?.id}`, {
      headers: {
        Host: 'oxford.localhost:4000',
      },
    });
    const pass19 = privMediaRes.status === 404;
    testCases.push({ name: 'Private Document Isolated from Anonymous Delivery (404)', status: privMediaRes.status, pass: pass19 });
    console.log(`  -> Status: ${privMediaRes.status}, Private Document Protected: ${pass19}`);

    // Test 20: Frontend SSR Public Header & Footer Integration
    console.log('Testing 20: GET http://localhost:3000/ contains dynamic navbar and footer');
    const webHomeNav = await fetchUrl('http://localhost:3000/');
    const pass20 = webHomeNav.status === 200 && webHomeNav.body.includes('public-navbar-container') && webHomeNav.body.includes('public-footer-container');
    testCases.push({ name: 'Frontend SSR Renders Dynamic Header & Footer Layout', status: webHomeNav.status, pass: pass20 });
    console.log(`  -> Status: ${webHomeNav.status}, Header & Footer Present: ${pass20}`);

    console.log('\n========================================');
    console.log('       LIVE SMOKE TEST RESULTS');
    console.log('========================================');
    for (const tc of testCases) {
      console.log(`[${tc.pass ? 'PASS' : 'FAIL'}] ${tc.name} -> HTTP ${tc.status}`);
      if (!tc.pass) allPassed = false;
    }
    console.log('========================================');

    cleanup();
    await wait(2000);

    if (allPassed) {
      console.log('[Smoke Test] ALL 20 LIVE APPLICATION SMOKE TESTS PASSED!');
      process.exit(0);
    } else {
      console.error('[Smoke Test] Some smoke tests failed!');
      process.exit(1);
    }
  } catch (err) {
    console.error('[Smoke Test] Fatal error during smoke test:', err);
    cleanup();
    await wait(2000);
    process.exit(1);
  }
}

run();
