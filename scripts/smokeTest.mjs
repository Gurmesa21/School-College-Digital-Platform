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

    // Test 21: Public Form Schema Retrieval (FR-CON-001)
    console.log('Testing 21: GET http://localhost:4000/api/v1/tenant/public/forms/contact-us');
    const pubFormRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us', {
      headers: {
        Host: 'oxford.localhost:4000',
        Accept: 'application/json',
      },
    });
    const pubFormJson = JSON.parse(pubFormRes.body);
    const pass21 = pubFormRes.status === 200 && pubFormJson.success === true && pubFormJson.data?.slug === 'contact-us' && Array.isArray(pubFormJson.data?.fields);
    testCases.push({ name: 'Public Form Schema Served Anonymously (200)', status: pubFormRes.status, pass: pass21 });
    console.log(`  -> Status: ${pubFormRes.status}, Fields Count: ${pubFormJson.data?.fields?.length}, Pass: ${pass21}`);

    // Test 22: Public Form Submission Processing & Validation (FR-CON-001)
    console.log('Testing 22: POST http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit');
    const submitRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      method: 'POST',
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: {
        data: {
          fullName: 'Smoke Test Visitor',
          email: 'visitor.smoke@example.com',
          phone: '+251 91 000 1122',
          department: 'admissions',
          message: 'Inquiring via automated smoke test suite.',
        },
      },
    });
    const submitJson = JSON.parse(submitRes.body);
    const pass22 = submitRes.status === 201 && submitJson.success === true && !!submitJson.data?.submissionId;
    testCases.push({ name: 'Public Form Submission Processed (201)', status: submitRes.status, pass: pass22 });
    console.log(`  -> Status: ${submitRes.status}, Submission ID: ${submitJson.data?.submissionId}, Pass: ${pass22}`);

    const newSubmissionId = submitJson.data?.submissionId;

    // Test 23: Anti-Spam Honeypot Bot Rejection (FR-CON-001)
    console.log('Testing 23: POST http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit with honeypot');
    const botRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      method: 'POST',
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: {
        data: {
          fullName: 'Spam Bot',
          email: 'spammer@bot.net',
          department: 'general',
          message: 'Spam payload',
        },
        _hp_company: 'Spam Corporation Inc',
      },
    });
    const botJson = JSON.parse(botRes.body);
    const pass23 = botRes.status === 400 && (botJson.error?.code === 'VALIDATION_FAILED' || botJson.error?.code === 'SPAM_DETECTED');
    testCases.push({ name: 'Anti-Spam Honeypot Bot Submission Rejected (400)', status: botRes.status, pass: pass23 });
    console.log(`  -> Status: ${botRes.status}, Error Code: ${botJson.error?.code}, Pass: ${pass23}`);

    // Test 24: Admin Submission Review & Status Transition (FR-APP-003, FR-APP-005)
    console.log(`Testing 24: PATCH http://localhost:4000/api/v1/tenant/cms/forms/submissions/${newSubmissionId}/status`);
    const reviewRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/cms/forms/submissions/${newSubmissionId}/status`, {
      method: 'PATCH',
      headers: {
        'Host': 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        'Cookie': cookieString,
      },
      body: {
        status: 'UNDER_REVIEW',
        adminNotes: 'Smoke test review verification note.',
      },
    });
    const reviewJson = JSON.parse(reviewRes.body);
    const pass24 = reviewRes.status === 200 && reviewJson.success === true && reviewJson.data?.status === 'UNDER_REVIEW';
    testCases.push({ name: 'Admin Submission Status Review Transition (200)', status: reviewRes.status, pass: pass24 });
    console.log(`  -> Status: ${reviewRes.status}, New Status: ${reviewJson.data?.status}, Pass: ${pass24}`);

    // Test 25: Public Frontend Contact & Admissions Pages
    console.log('Testing 25: GET http://localhost:3000/contact and /admissions');
    const contactPageRes = await fetchUrl('http://localhost:3000/contact');
    const admissionsPageRes = await fetchUrl('http://localhost:3000/admissions');
    const pass25 =
      contactPageRes.status === 200 &&
      (contactPageRes.body.includes('Get in Touch') || contactPageRes.body.includes('Contact')) &&
      admissionsPageRes.status === 200 &&
      admissionsPageRes.body.includes('Admissions');
    testCases.push({ name: 'Public Contact & Admissions Frontend Pages Render (200)', status: contactPageRes.status, pass: pass25 });
    console.log(`  -> Contact: ${contactPageRes.status}, Admissions: ${admissionsPageRes.status}, Pass: ${pass25}`);

    // Test 26: Public Academic Catalogue Discovery (FR-ACAD-001, FR-ACAD-002)
    console.log('Testing 26: GET http://localhost:4000/api/v1/tenant/public/academics/programmes');
    const acadRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/academics/programmes', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const acadJson = JSON.parse(acadRes.body);
    const pass26 = acadRes.status === 200 && acadJson.success === true && Array.isArray(acadJson.data?.items) && acadJson.data.items.length > 0;
    testCases.push({ name: 'Public Academic Catalogue Discovery (200)', status: acadRes.status, pass: pass26 });
    console.log(`  -> Status: ${acadRes.status}, Programmes Count: ${acadJson.data?.items?.length}, Pass: ${pass26}`);

    // Test 27: Public Programme Detail & Tuition Privacy (FR-ACAD-002)
    console.log('Testing 27: GET http://localhost:4000/api/v1/tenant/public/academics/programmes/cambridge-igcse');
    const progDetailRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/academics/programmes/cambridge-igcse', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const progDetailJson = JSON.parse(progDetailRes.body);
    const pass27 =
      progDetailRes.status === 200 &&
      progDetailJson.success === true &&
      progDetailJson.data?.slug === 'cambridge-igcse' &&
      progDetailJson.data?.displayTuition === true &&
      typeof progDetailJson.data?.tuitionFee === 'number';
    testCases.push({ name: 'Public Programme Detail & Approved Tuition Disclosure (200)', status: progDetailRes.status, pass: pass27 });
    console.log(`  -> Status: ${progDetailRes.status}, Tuition Fee: ${progDetailJson.data?.tuitionFee}, Pass: ${pass27}`);

    // Test 28: Draft Programme Fail-Closed Protection (FR-CMS-006, BR-008)
    console.log('Testing 28: GET http://localhost:4000/api/v1/tenant/public/academics/programmes/robotics-and-ai-enrichment (DRAFT)');
    const acadDraftRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/academics/programmes/robotics-and-ai-enrichment', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const acadDraftJson = JSON.parse(acadDraftRes.body);
    const draftErrorCode = acadDraftJson.error?.code;
    const pass28 = acadDraftRes.status === 404 && (draftErrorCode === 'PROGRAMME_NOT_FOUND' || draftErrorCode === 'NOT_FOUND');
    testCases.push({ name: 'Draft Programme Fail-Closed Protection (404)', status: acadDraftRes.status, pass: pass28 });
    console.log(`  -> Status: ${acadDraftRes.status}, Error Code: ${draftErrorCode}, Pass: ${pass28}`);

    // Test 29: Public Frontend Academics Catalogue Page (SSR)
    console.log('Testing 29: GET http://localhost:3000/academics');
    const academicsPageRes = await fetchUrl('http://localhost:3000/academics');
    const pass29 =
      academicsPageRes.status === 200 &&
      academicsPageRes.body.includes('Academic Programmes');
    testCases.push({ name: 'Public Academics Frontend Page Render (200)', status: academicsPageRes.status, pass: pass29 });
    console.log(`  -> Status: ${academicsPageRes.status}, Pass: ${pass29}`);

    // Test 30: Public Staff Directory Discovery (FR-ACAD-004)
    console.log('Testing 30: GET http://localhost:4000/api/v1/tenant/public/staff');
    const staffDirRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/staff', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const staffDirJson = JSON.parse(staffDirRes.body);
    const pass30 = staffDirRes.status === 200 && staffDirJson.success === true && Array.isArray(staffDirJson.data?.items) && staffDirJson.data.items.length >= 2;
    testCases.push({ name: 'Public Staff Directory Discovery (200)', status: staffDirRes.status, pass: pass30 });
    console.log(`  -> Status: ${staffDirRes.status}, Staff Count: ${staffDirJson.data?.items?.length}, Pass: ${pass30}`);

    // Test 31: Public Staff Profile Detail with Approved Email Disclosure (FR-ACAD-003)
    console.log('Testing 31: GET http://localhost:4000/api/v1/tenant/public/staff/dr-eleanor-vance');
    const staffDetailRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/staff/dr-eleanor-vance', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const staffDetailJson = JSON.parse(staffDetailRes.body);
    const pass31 =
      staffDetailRes.status === 200 &&
      staffDetailJson.success === true &&
      staffDetailJson.data?.slug === 'dr-eleanor-vance' &&
      staffDetailJson.data?.publicEmail === 'e.vance@oxford.school.example';
    testCases.push({ name: 'Public Staff Profile Detail & Approved Contact Disclosure (200)', status: staffDetailRes.status, pass: pass31 });
    console.log(`  -> Status: ${staffDetailRes.status}, Email: ${staffDetailJson.data?.publicEmail}, Pass: ${pass31}`);

    // Test 32: Privacy Redaction (Unapproved Phone is Redacted, Internal Notes Omitted) (FR-ACAD-003)
    console.log('Testing 32: GET http://localhost:4000/api/v1/tenant/public/staff/marcus-sterling (Phone unapproved)');
    const staffPrivacyRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/staff/marcus-sterling', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const staffPrivacyJson = JSON.parse(staffPrivacyRes.body);
    const pass32 =
      staffPrivacyRes.status === 200 &&
      staffPrivacyJson.success === true &&
      staffPrivacyJson.data?.slug === 'marcus-sterling' &&
      staffPrivacyJson.data?.publicEmail === 'm.sterling@oxford.school.example' &&
      staffPrivacyJson.data?.publicPhone === null &&
      staffPrivacyJson.data?.internalNotes === undefined;
    testCases.push({ name: 'Staff Contact Privacy Redaction Verification (200)', status: staffPrivacyRes.status, pass: pass32 });
    console.log(`  -> Status: ${staffPrivacyRes.status}, Phone Redacted: ${staffPrivacyJson.data?.publicPhone === null}, Pass: ${pass32}`);

    // Test 33: Draft Staff Profile Fail-Closed Protection (FR-CMS-006, BR-008)
    console.log('Testing 33: GET http://localhost:4000/api/v1/tenant/public/staff/helena-rostova (DRAFT)');
    const staffDraftRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/staff/helena-rostova', {
      headers: {
        'Host': 'oxford.localhost:4000',
        'Accept': 'application/json',
      },
    });
    const staffDraftJson = JSON.parse(staffDraftRes.body);
    const staffDraftErrorCode = staffDraftJson.error?.code;
    const pass33 = staffDraftRes.status === 404 && (staffDraftErrorCode === 'STAFF_NOT_FOUND' || staffDraftErrorCode === 'NOT_FOUND');
    testCases.push({ name: 'Draft Staff Profile Fail-Closed Protection (404)', status: staffDraftRes.status, pass: pass33 });
    console.log(`  -> Status: ${staffDraftRes.status}, Error Code: ${staffDraftErrorCode}, Pass: ${pass33}`);

    // Test 34: Public Frontend Staff Directory Page Render (SSR)
    console.log('Testing 34: GET http://localhost:3000/staff');
    const staffPageRes = await fetchUrl('http://localhost:3000/staff');
    const pass34 =
      staffPageRes.status === 200 &&
      (staffPageRes.body.includes('Faculty & Staff') ||
        staffPageRes.body.includes('Faculty &amp; Staff') ||
        (staffPageRes.body.includes('Faculty') && staffPageRes.body.includes('Staff')));
    testCases.push({ name: 'Public Staff Frontend Page Render (200)', status: staffPageRes.status, pass: pass34 });
    console.log(`  -> Status: ${staffPageRes.status}, Pass: ${pass34}`);

    // Test 35: Day 11 Public Media Asset Delivery with Cache Headers (FR-MEDIA-003)
    console.log('Testing 35: GET http://localhost:4000/api/v1/tenant/public/media/oxford-crest.png');
    const publicMediaRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/media/oxford-crest.png', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const pass35 =
      publicMediaRes.status === 200 &&
      publicMediaRes.headers['content-type'] === 'image/png' &&
      publicMediaRes.headers['cache-control']?.includes('public');
    testCases.push({ name: 'Public Media Asset Delivery & Cache Headers (200)', status: publicMediaRes.status, pass: pass35 });
    console.log(`  -> Status: ${publicMediaRes.status}, Content-Type: ${publicMediaRes.headers['content-type']}, Cache-Control: ${publicMediaRes.headers['cache-control']}, Pass: ${pass35}`);

    // Test 36: Day 11 Access-Controlled Private Document Fail-Closed Boundary (FR-MEDIA-003)
    console.log('Testing 36: GET http://localhost:4000/api/v1/tenant/public/media/confidential-admissions-rubric.pdf (Private Document)');
    const privateDocRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/media/confidential-admissions-rubric.pdf', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const pass36 = privateDocRes.status === 404;
    testCases.push({ name: 'Private Document Anonymous Access Denied Fail-Closed (404)', status: privateDocRes.status, pass: pass36 });
    console.log(`  -> Status: ${privateDocRes.status}, Pass: ${pass36}`);

    // Test 37: Day 11 Media Library Administration API & Dual Storage Metadata
    console.log('Testing 37: GET http://localhost:4000/api/v1/tenant/cms/media');
    const mediaAdminRes = await fetchUrl('http://localhost:4000/api/v1/tenant/cms/media', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });
    const mediaAdminJson = JSON.parse(mediaAdminRes.body);
    const pass37 =
      mediaAdminRes.status === 200 &&
      mediaAdminJson.success === true &&
      Array.isArray(mediaAdminJson.data?.items) &&
      mediaAdminJson.data.items.some((item) => item.storagePolicy === 'PUBLIC') &&
      mediaAdminJson.data.items.some((item) => item.storagePolicy === 'PRIVATE');
    testCases.push({ name: 'Admin Media Library Dual-Storage Metadata (200)', status: mediaAdminRes.status, pass: pass37 });
    console.log(`  -> Status: ${mediaAdminRes.status}, Items: ${mediaAdminJson.data?.items?.length}, Dual Policy Verified: ${pass37}`);

    // Test 38: Day 11 Safe 2-Phase Replacement & Short-Lived Signed Download URLs
    console.log('Testing 38: Upload, signed download URL, and purge lifecycle');
    const validPngB64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]).toString('base64');
    const uploadSmokeRes = await fetchUrl('http://localhost:4000/api/v1/tenant/cms/media', {
      method: 'POST',
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Smoke Test Dual Storage Asset',
        altText: 'A smoke test graphic',
        category: 'IMAGE',
        mimeType: 'image/png',
        fileBase64: validPngB64,
        isPublic: false,
        storagePolicy: 'PRIVATE',
      }),
    });
    const uploadSmokeJson = JSON.parse(uploadSmokeRes.body);
    const smokeAssetId = uploadSmokeJson.data?.id;

    // Signed URL generation
    const signedUrlRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/cms/media/${smokeAssetId}/signed-url`, {
      method: 'POST',
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresInSeconds: 900 }),
    });
    const signedUrlJson = JSON.parse(signedUrlRes.body);

    // Delete smoke test asset
    const deleteSmokeRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/cms/media/${smokeAssetId}`, {
      method: 'DELETE',
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });

    const pass38 =
      uploadSmokeRes.status === 201 &&
      uploadSmokeJson.data?.storagePolicy === 'PRIVATE' &&
      signedUrlRes.status === 200 &&
      signedUrlJson.data?.url?.includes('/download-signed') &&
      deleteSmokeRes.status === 200;
    testCases.push({ name: 'Dual-Storage Upload, Signed URL & Purge Lifecycle (201/200)', status: uploadSmokeRes.status, pass: pass38 });
    console.log(`  -> Status: Upload ${uploadSmokeRes.status}, Signed ${signedUrlRes.status}, Delete ${deleteSmokeRes.status}, Pass: ${pass38}`);

    // Test 39: Day 12 Editorial News Public Endpoints (FR-COM-001)
    console.log('Testing 39: News public listing, archive timeline, and article detail');
    const newsListRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/news', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const newsListJson = JSON.parse(newsListRes.body);
    const newsArchiveRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/news/archive', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const newsArchiveJson = JSON.parse(newsArchiveRes.body);
    const newsDetailRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/news/stem-innovation-wing-inauguration', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const newsDetailJson = JSON.parse(newsDetailRes.body);
    const pass39 =
      newsListRes.status === 200 &&
      newsListJson.success === true &&
      newsListJson.data.items.length >= 1 &&
      newsArchiveRes.status === 200 &&
      newsArchiveJson.success === true &&
      newsDetailRes.status === 200 &&
      newsDetailJson.data?.slug === 'stem-innovation-wing-inauguration';
    testCases.push({ name: 'Public News Listing, Archive & Detail (200)', status: newsDetailRes.status, pass: pass39 });
    console.log(`  -> Status: List ${newsListRes.status}, Archive ${newsArchiveRes.status}, Detail ${newsDetailRes.status}, Pass: ${pass39}`);

    // Test 40: Day 12 Operational Announcements Fail-Closed Expiry (FR-COM-002)
    console.log('Testing 40: Announcements public active placement window filtering');
    const annListRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/announcements', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const annListJson = JSON.parse(annListRes.body);
    const activeItems = annListJson.data || [];
    const hasEmergency = activeItems.some((a) => a.priority === 'EMERGENCY' && a.isPinned);
    const hasExpired = activeItems.some((a) => a.title.includes('Expired'));
    const pass40 = annListRes.status === 200 && annListJson.success === true && hasEmergency && !hasExpired;
    testCases.push({ name: 'Public Announcements Display Window & Expiry Filter (200)', status: annListRes.status, pass: pass40 });
    console.log(`  -> Status: ${annListRes.status}, Active Count: ${activeItems.length}, Has Emergency: ${hasEmergency}, Excludes Expired: ${!hasExpired}, Pass: ${pass40}`);

    // Test 41: Day 12 Events Calendar & RFC 5545 iCalendar (.ics) Export (FR-EVT-001, FR-EVT-002)
    console.log('Testing 41: Events calendar listing, detail, and iCal RFC 5545 export');
    const evtListRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/events', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const evtListJson = JSON.parse(evtListRes.body);
    const evtDetailRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/events/oxford-autumn-open-house-2026', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const evtDetailJson = JSON.parse(evtDetailRes.body);
    const evtIcsRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/events/oxford-autumn-open-house-2026/ics', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const pass41 =
      evtListRes.status === 200 &&
      evtListJson.success === true &&
      evtDetailRes.status === 200 &&
      Boolean(evtDetailJson.data?.timezone) &&
      evtIcsRes.status === 200 &&
      evtIcsRes.headers['content-type']?.includes('text/calendar') &&
      evtIcsRes.body.includes('BEGIN:VCALENDAR') &&
      evtIcsRes.body.includes('BEGIN:VEVENT');
    testCases.push({ name: 'Public Events Calendar & RFC 5545 iCal Export (200)', status: evtIcsRes.status, pass: pass41 });
    console.log(`  -> Status: List ${evtListRes.status}, Detail ${evtDetailRes.status}, ICS ${evtIcsRes.status}, Pass: ${pass41}`);

    // Test 42: Day 12 Frontend SSR Web Pages (/news, /news/[slug], /events, /events/[slug])
    console.log('Testing 42: Frontend public SSR page responses');
    const webNewsRes = await fetchUrl('http://localhost:3000/news', {
      headers: { Host: 'oxford.localhost:3000' },
    });
    const webNewsDetailRes = await fetchUrl('http://localhost:3000/news/stem-innovation-wing-inauguration', {
      headers: { Host: 'oxford.localhost:3000' },
    });
    const webEventsRes = await fetchUrl('http://localhost:3000/events', {
      headers: { Host: 'oxford.localhost:3000' },
    });
    const webEventDetailRes = await fetchUrl('http://localhost:3000/events/oxford-autumn-open-house-2026', {
      headers: { Host: 'oxford.localhost:3000' },
    });
    const pass42 =
      webNewsRes.status === 200 &&
      webNewsDetailRes.status === 200 &&
      webEventsRes.status === 200 &&
      webEventDetailRes.status === 200;
    // Test 43: Day 13 Validated Department-Specific Contact Routing & Privacy Shield (FR-CON-001, FR-CON-002)
    console.log('Testing 43: Department-specific enquiry routing and privacy shield');
    const deptPubFormRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    const deptPubFormJson = JSON.parse(deptPubFormRes.body);
    const privacyPreserved =
      !deptPubFormRes.body.includes('@oxford.school.example') &&
      deptPubFormJson.data?.recipientEmails === undefined &&
      deptPubFormJson.data?.routingRules === undefined;

    const deptEnquiryRes = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      method: 'POST',
      headers: {
        Host: 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        data: {
          fullName: 'Eleanor Admissions Enquirer',
          email: 'eleanor.enquiry@example.com',
          phone: '+44 20 7946 0912',
          department: 'admissions',
          message: 'Smoke test validated departmental routing inquiry for Day 13.',
        },
      },
    });
    const deptEnquiryJson = JSON.parse(deptEnquiryRes.body);
    const pass43 =
      deptPubFormRes.status === 200 &&
      privacyPreserved &&
      deptEnquiryRes.status === 201 &&
      deptEnquiryJson.success === true &&
      Boolean(deptEnquiryJson.data?.referenceNumber);
    testCases.push({ name: 'Validated Department Routing & Privacy Shield (201)', status: deptEnquiryRes.status, pass: pass43 });
    console.log(`  -> Schema: ${deptPubFormRes.status}, Privacy Preserved: ${privacyPreserved}, Submit: ${deptEnquiryRes.status}, Ref: ${deptEnquiryJson.data?.referenceNumber}, Pass: ${pass43}`);

    // Test 44: Day 13 Client-Side Idempotency Key Replay (FR-CON-001, Reliability)
    console.log('Testing 44: Client-side idempotency replay for duplicate enquiry submissions');
    const smokeIdmpKey = `smoke-idmp-${Date.now()}`;
    const idmpRes1 = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      method: 'POST',
      headers: {
        Host: 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        'x-idempotency-key': smokeIdmpKey,
        Accept: 'application/json',
      },
      body: {
        data: {
          fullName: 'Idempotent Submitter',
          email: 'idmp.submitter@example.com',
          phone: '+44 20 7946 0999',
          department: 'general',
          message: 'Testing idempotency key replay in live smoke test.',
        },
      },
    });
    const idmpJson1 = JSON.parse(idmpRes1.body);

    const idmpRes2 = await fetchUrl('http://localhost:4000/api/v1/tenant/public/forms/contact-us/submit', {
      method: 'POST',
      headers: {
        Host: 'oxford.localhost:4000',
        'Content-Type': 'application/json',
        'x-idempotency-key': smokeIdmpKey,
        Accept: 'application/json',
      },
      body: {
        data: {
          fullName: 'Idempotent Submitter',
          email: 'idmp.submitter@example.com',
          phone: '+44 20 7946 0999',
          department: 'general',
          message: 'Testing idempotency key replay in live smoke test.',
        },
      },
    });
    const idmpJson2 = JSON.parse(idmpRes2.body);
    const pass44 =
      idmpRes1.status === 201 &&
      (idmpRes2.status === 200 || idmpRes2.status === 201) &&
      idmpJson1.data?.referenceNumber === idmpJson2.data?.referenceNumber &&
      idmpJson2.data?.idempotentReplay === true;
    testCases.push({ name: 'Enquiry Submission Idempotency Safe Replay (200/201)', status: idmpRes2.status, pass: pass44 });
    console.log(`  -> Submit 1: ${idmpRes1.status}, Replay 2: ${idmpRes2.status}, Matches Ref: ${pass44}`);

    // Test 45: Day 13 Administrative Review & Notification Retry Endpoint (FR-CON-002, BR-012)
    console.log('Testing 45: Admin review listing with category/delivery metadata & notification retry');
    const adminSubsRes = await fetchUrl('http://localhost:4000/api/v1/tenant/cms/forms/submissions/items?limit=10', {
      headers: {
        Host: 'oxford.localhost:4000',
        Cookie: cookieString,
      },
    });
    const adminSubsJson = JSON.parse(adminSubsRes.body);
    const subsList = adminSubsJson.data?.items || [];
    const firstSub = subsList[0];
    let retryPass = false;
    let retryStatus = 0;
    if (firstSub) {
      const retryRes = await fetchUrl(`http://localhost:4000/api/v1/tenant/cms/forms/submissions/${firstSub.id}/retry-notification`, {
        method: 'POST',
        headers: {
          Host: 'oxford.localhost:4000',
          Cookie: cookieString,
        },
      });
      retryStatus = retryRes.status;
      const retryJson = JSON.parse(retryRes.body);
      retryPass = retryRes.status === 200 && retryJson.success === true && Boolean(retryJson.data?.deliveryStatus);
    }
    const pass45 = adminSubsRes.status === 200 && Array.isArray(subsList) && subsList.length > 0 && retryPass;
    testCases.push({ name: 'Admin Submissions Review & Notification Retry (200)', status: retryStatus, pass: pass45 });
    console.log(`  -> List: ${adminSubsRes.status}, Items: ${subsList.length}, Retry: ${retryStatus}, Pass: ${pass45}`);

    // Test 46: Day 14 Live Public Search Multi-Type Query (FR-SRCH-001, UC-PUB-02)
    console.log('Testing 46: Public search multi-type query (/api/v1/tenant/public/search?q=Science)');
    const searchRes1 = await fetchUrl('http://localhost:4000/api/v1/tenant/public/search?q=Science', {
      headers: {
        Host: 'oxford.localhost:4000',
        Accept: 'application/json',
      },
    });
    const searchJson1 = JSON.parse(searchRes1.body);
    const pass46 =
      searchRes1.status === 200 &&
      searchJson1.success === true &&
      Array.isArray(searchJson1.data?.items) &&
      searchJson1.data.total >= 1 &&
      Boolean(searchJson1.data.facets);
    testCases.push({ name: 'Public Search Multi-Type Query (200)', status: searchRes1.status, pass: pass46 });
    console.log(`  -> Search Results: ${searchJson1.data?.total || 0}, Status: ${searchRes1.status}, Pass: ${pass46}`);

    // Test 47: Day 14 Content-Type Filtered Search
    console.log('Testing 47: Public search filtered by type=PROGRAMME');
    const searchRes2 = await fetchUrl('http://localhost:4000/api/v1/tenant/public/search?q=Science&type=PROGRAMME', {
      headers: {
        Host: 'oxford.localhost:4000',
        Accept: 'application/json',
      },
    });
    const searchJson2 = JSON.parse(searchRes2.body);
    const progOnly = (searchJson2.data?.items || []).every((i) => i.type === 'PROGRAMME');
    const pass47 = searchRes2.status === 200 && searchJson2.success === true && progOnly;
    testCases.push({ name: 'Public Search Content-Type Filter (200)', status: searchRes2.status, pass: pass47 });
    console.log(`  -> Filtered Items: ${searchJson2.data?.items?.length || 0}, All PROGRAMME: ${progOnly}, Pass: ${pass47}`);

    // Test 48: Day 14 Empty Result Safe Handling
    console.log('Testing 48: Public search non-matching query handling');
    const searchRes3 = await fetchUrl('http://localhost:4000/api/v1/tenant/public/search?q=NonExistentQueryXYZ123', {
      headers: {
        Host: 'oxford.localhost:4000',
        Accept: 'application/json',
      },
    });
    const searchJson3 = JSON.parse(searchRes3.body);
    const pass48 =
      searchRes3.status === 200 &&
      searchJson3.success === true &&
      Array.isArray(searchJson3.data?.items) &&
      searchJson3.data.total === 0;
    testCases.push({ name: 'Public Search Empty Result Handling (200)', status: searchRes3.status, pass: pass48 });
    console.log(`  -> Status: ${searchRes3.status}, Total: ${searchJson3.data?.total}, Pass: ${pass48}`);

    // Test 49: Day 14 Web Frontend Search Route
    console.log('Testing 49: Web frontend search route (GET http://localhost:3000/search?q=Science)');
    const webSearchRes = await fetchUrl('http://localhost:3000/search?q=Science', {
      headers: {
        Host: 'oxford.localhost:3000',
      },
    });
    const pass49 = webSearchRes.status === 200 && webSearchRes.body.includes('Institutional Search');
    testCases.push({ name: 'Web Search Frontend Page (200)', status: webSearchRes.status, pass: pass49 });
    console.log(`  -> Web Search Status: ${webSearchRes.status}, Pass: ${pass49}`);

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
      console.log('[Smoke Test] ALL 49 LIVE APPLICATION SMOKE TESTS PASSED!');
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
