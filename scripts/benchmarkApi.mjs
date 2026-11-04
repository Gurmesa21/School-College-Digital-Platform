/**
 * Day 19: API Performance & Controlled Load Benchmark
 * Evaluates paginated read endpoints under concurrent pilot load.
 *
 * Roadmap Target:
 * - Standard paginated read APIs: p95 response time <= 500 milliseconds under agreed pilot load.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const CONCURRENCY = 10;
const TOTAL_REQUESTS = 100;
const WARMUP_REQUESTS = 10;

const ENDPOINTS = [
  {
    name: 'Public Programmes (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/academics/programmes?page=1&limit=10',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Public Programmes (Greenwood)',
    method: 'GET',
    path: '/api/v1/tenant/public/academics/programmes?page=1&limit=10',
    host: 'greenwood.localhost:4000',
  },
  {
    name: 'Public Staff Listing (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/staff?page=1&limit=10',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Public News Listing (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/news?page=1&limit=10',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Public Events Upcoming (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/events?page=1&limit=10&timeframe=upcoming',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Public Search Query (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/search?q=curriculum&type=ALL',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Public Documents Repo (Oxford)',
    method: 'GET',
    path: '/api/v1/tenant/public/media?page=1&limit=10&mediaType=DOCUMENT',
    host: 'oxford.localhost:4000',
  },
  {
    name: 'Admin Analytics Overview (Auth)',
    method: 'GET',
    path: '/api/v1/tenant/admin/analytics/overview?period=30d',
    host: 'oxford.localhost:4000',
    needsAuth: true,
  },
];

async function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkServerReady(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function authenticateOxfordAdmin() {
  const payload = JSON.stringify({
    email: 'admin@oxford.edu',
    password: 'AdminPassword123!',
  });

  return new Promise((resolve) => {
    const req = http.request(
      `${API_BASE}/api/v1/auth/sign-in`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Host: 'oxford.localhost:4000',
        },
      },
      (res) => {
        const setCookie = res.headers['set-cookie'];
        let cookieHeader = '';
        if (Array.isArray(setCookie)) {
          cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
        }
        res.resume();
        resolve(cookieHeader);
      }
    );
    req.on('error', () => resolve(''));
    req.write(payload);
    req.end();
  });
}

function singleRequest(endpoint, cookieHeader) {
  const startTime = performance.now();
  return new Promise((resolve) => {
    const headers = {
      Host: endpoint.host,
      Accept: 'application/json',
    };
    if (cookieHeader && endpoint.needsAuth) {
      headers.Cookie = cookieHeader;
    }

    const req = http.request(
      `${API_BASE}${endpoint.path}`,
      {
        method: endpoint.method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const duration = performance.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            durationMs: duration,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      }
    );

    req.on('error', (err) => {
      const duration = performance.now() - startTime;
      resolve({
        statusCode: 0,
        durationMs: duration,
        success: false,
        error: err.message,
      });
    });

    req.end();
  });
}

async function benchmarkEndpoint(endpoint, cookieHeader) {
  // 1. Warm-up
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await singleRequest(endpoint, cookieHeader);
  }

  // 2. Controlled concurrent load test
  const latencies = [];
  let successCount = 0;
  let failCount = 0;
  let inFlight = 0;
  let completed = 0;

  const testStartTime = performance.now();

  await new Promise((resolve) => {
    function launchWorker() {
      while (inFlight < CONCURRENCY && completed + inFlight < TOTAL_REQUESTS) {
        inFlight++;
        singleRequest(endpoint, cookieHeader).then((res) => {
          inFlight--;
          completed++;
          latencies.push(res.durationMs);
          if (res.success) successCount++;
          else failCount++;

          if (completed >= TOTAL_REQUESTS) {
            resolve();
          } else {
            launchWorker();
          }
        });
      }
    }
    launchWorker();
  });

  const totalDurationSeconds = (performance.now() - testStartTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const throughput = Number((TOTAL_REQUESTS / totalDurationSeconds).toFixed(1));

  return {
    name: endpoint.name,
    endpoint: endpoint.path,
    host: endpoint.host,
    totalRequests: TOTAL_REQUESTS,
    concurrency: CONCURRENCY,
    successCount,
    failCount,
    throughputRps: throughput,
    minMs: Number(min.toFixed(2)),
    p50Ms: Number(p50.toFixed(2)),
    p90Ms: Number(p90.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    p99Ms: Number(p99.toFixed(2)),
    maxMs: Number(max.toFixed(2)),
    targetMet: p95 <= 500 && failCount === 0,
  };
}

async function runApiBenchmarks() {
  console.log('========================================================================');
  console.log(' Day 19: API Performance & Controlled Load Benchmark');
  console.log(` Target Base: ${API_BASE} | Concurrency: ${CONCURRENCY} virtual users`);
  console.log(` Requests per endpoint: ${TOTAL_REQUESTS} | Roadmap Target: p95 <= 500ms`);
  console.log('========================================================================\n');

  let apiProcess = null;
  const serverAlreadyRunning = await checkServerReady(`${API_BASE}/health`);

  if (!serverAlreadyRunning) {
    console.log('[Setup] Starting API server on port 4000...');
    apiProcess = spawn('node', ['apps/api/dist/server.js'], {
      stdio: 'ignore',
      shell: true,
      detached: process.platform !== 'win32',
      env: { ...process.env, PORT: '4000', NODE_ENV: 'development' },
    });
    await waitForPort(`${API_BASE}/health`);
    console.log('[Setup] API server is ready!\n');
  } else {
    console.log('[Setup] Reusing existing running API server on port 4000.\n');
  }

  const cleanup = () => {
    if (apiProcess && apiProcess.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${apiProcess.pid} /T /F`, { stdio: 'ignore' });
        } else {
          process.kill(-apiProcess.pid, 'SIGKILL');
        }
      } catch {}
    }
  };

  try {
    console.log('[Auth] Authenticating Oxford Admin for protected read benchmarks...');
    const cookieHeader = await authenticateOxfordAdmin();
    if (cookieHeader) {
      console.log('[Auth] Oxford Admin authenticated successfully.\n');
    } else {
      console.warn('[Auth Warning] Oxford Admin authentication failed; proceeding with public checks.\n');
    }

    const results = [];
    let allTargetsMet = true;

    for (const ep of ENDPOINTS) {
      process.stdout.write(`Testing ${ep.name}... `);
      try {
        const metrics = await benchmarkEndpoint(ep, cookieHeader);
        results.push(metrics);
        const status = metrics.targetMet ? 'PASSED' : 'MISSED';
        if (!metrics.targetMet) allTargetsMet = false;
        console.log(`[${status}] p50: ${metrics.p50Ms}ms, p95: ${metrics.p95Ms}ms (${metrics.throughputRps} req/s, ${metrics.successCount}/${metrics.totalRequests} ok)`);
      } catch (err) {
        console.log(`[FAILED: ${err.message}]`);
        allTargetsMet = false;
      }
    }

    // Print Summary Table
    console.log('\n--------------------------------------------------------------------------------------------------------------------');
    console.log('| Endpoint Name                 | Host                    | Reqs | Success | p50 (ms) | p90 (ms) | p95 (ms) | Req/s | Status |');
    console.log('--------------------------------------------------------------------------------------------------------------------');
    for (const r of results) {
      const status = r.targetMet ? 'GREEN ' : 'REVIEW';
      console.log(
        `| ${r.name.padEnd(29)} | ${r.host.padEnd(23)} | ${String(r.totalRequests).padStart(4)} | ${String(r.successCount).padStart(7)} | ${String(r.p50Ms).padStart(8)} | ${String(r.p90Ms).padStart(8)} | ${String(r.p95Ms).padStart(8)} | ${String(r.throughputRps).padStart(5)} | ${status} |`
      );
    }
    console.log('--------------------------------------------------------------------------------------------------------------------\n');

    const summary = {
      timestamp: new Date().toISOString(),
      apiBase: API_BASE,
      concurrency: CONCURRENCY,
      requestsPerEndpoint: TOTAL_REQUESTS,
      allTargetsMet,
      targetP95Ms: 500,
      results,
    };

    const outputPath = path.resolve(process.cwd(), 'benchmark-results-api.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`[Report] API benchmark results saved to: ${outputPath}\n`);

    cleanup();

    if (!allTargetsMet) {
      console.warn('[Notice] One or more endpoints exceeded p95 target of 500ms.');
      process.exit(1);
    } else {
      console.log('[SUCCESS] All representative paginated read endpoints achieved p95 <= 500ms under pilot load!');
    }
  } catch (err) {
    cleanup();
    console.error('[API Benchmark Error]', err);
    process.exit(1);
  }
}

runApiBenchmarks();
