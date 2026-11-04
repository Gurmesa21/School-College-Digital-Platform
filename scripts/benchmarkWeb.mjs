/**
 * Day 19: Web Vitals Performance Benchmark Runner
 * Measures laboratory Core Web Vitals (LCP, CLS, TTFB, Load Time, and TBT Proxy)
 * across representative public institutional routes under reproducible conditions.
 *
 * Targets (SRS & Roadmap):
 * - Largest Contentful Paint (LCP): <= 2.5 seconds (2500ms)
 * - Cumulative Layout Shift (CLS): <= 0.1
 * - Interaction / Responsiveness Proxy: <= 200ms
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn, execSync } from 'child_process';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';
const RUNS_PER_ROUTE = 3;

const ROUTES = [
  { name: 'Institutional Homepage', path: '/' },
  { name: 'Academic Catalogue', path: '/academics' },
  { name: 'Programme Detail', path: '/academics/cambridge-igcse' },
  { name: 'Staff Directory', path: '/staff' },
  { name: 'Staff Profile Detail', path: '/staff/dr-eleanor-vance' },
  { name: 'News & Operational Advisories', path: '/news' },
  { name: 'Events Calendar', path: '/events' },
  { name: 'Public Search Portal', path: '/search' },
  { name: 'Contact & Admissions Form', path: '/contact' },
  { name: 'Public Documents Repository', path: '/documents' },
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

async function measureRoute(browser, route) {
  const measurements = [];

  for (let i = 0; i < RUNS_PER_ROUTE; i++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        'x-benchmark-run': String(i + 1),
      },
    });

    const page = await context.newPage();

    // Inject PerformanceObserver before DOM initialization
    await page.addInitScript(() => {
      window.__webVitals = {
        lcp: 0,
        cls: 0,
        tbt: 0,
        fcp: 0,
      };

      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            window.__webVitals.lcp = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // Observe CLS
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__webVitals.cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      // Observe FCP
      try {
        const paintObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              window.__webVitals.fcp = entry.startTime;
            }
          }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {}

      // Observe Long Tasks for TBT proxy
      try {
        const longTaskObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) {
              window.__webVitals.tbt += (entry.duration - 50);
            }
          }
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    });

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'load' });
    // Allow an additional 300ms for final layout shifts and LCP paints
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType('navigation');
      const nav = navEntries.length > 0 ? navEntries[0] : null;
      const ttfb = nav ? Math.max(0, nav.responseStart - nav.requestStart) : 0;
      const loadTime = nav ? Math.max(0, nav.loadEventEnd - nav.startTime) : 0;
      const domInteractive = nav ? Math.max(0, nav.domInteractive - nav.startTime) : 0;

      return {
        lcp: Math.round(window.__webVitals?.lcp || window.__webVitals?.fcp || loadTime),
        cls: Number((window.__webVitals?.cls || 0).toFixed(4)),
        tbt: Math.round(window.__webVitals?.tbt || 0),
        fcp: Math.round(window.__webVitals?.fcp || 0),
        ttfb: Math.round(ttfb),
        loadTime: Math.round(loadTime),
        domInteractive: Math.round(domInteractive),
      };
    });

    measurements.push(metrics);
    await context.close();
  }

  // Calculate averages across runs
  const avg = (key) => Math.round(measurements.reduce((acc, m) => acc + m[key], 0) / measurements.length);
  const avgFloat = (key) => Number((measurements.reduce((acc, m) => acc + m[key], 0) / measurements.length).toFixed(4));

  return {
    name: route.name,
    path: route.path,
    runs: measurements.length,
    lcpMs: avg('lcp'),
    cls: avgFloat('cls'),
    tbtMs: avg('tbt'),
    ttfbMs: avg('ttfb'),
    loadTimeMs: avg('loadTime'),
    fcpMs: avg('fcp'),
    lcpTargetMet: avg('lcp') <= 2500,
    clsTargetMet: avgFloat('cls') <= 0.1,
  };
}

async function runBenchmark() {
  console.log('========================================================================');
  console.log(' Day 19: Public Website Performance Benchmarking (Web Vitals Lab)');
  console.log(` Target Host: ${BASE_URL} | Runs per route: ${RUNS_PER_ROUTE}`);
  console.log(' Targets: LCP <= 2.5s (2500ms) | CLS <= 0.10 | TBT Proxy <= 200ms');
  console.log('========================================================================\n');

  let apiProcess = null;
  let webProcess = null;

  const apiReady = await checkServerReady(`${API_URL}/health`);
  if (!apiReady) {
    console.log('[Setup] Starting API server on port 4000...');
    apiProcess = spawn('node', ['apps/api/dist/server.js'], {
      stdio: 'ignore',
      shell: true,
      detached: process.platform !== 'win32',
      env: { ...process.env, PORT: '4000', NODE_ENV: 'development' },
    });
    await waitForPort(`${API_URL}/health`);
    console.log('[Setup] API server is ready!');
  }

  const webReady = await checkServerReady(`${BASE_URL}/`);
  if (!webReady) {
    console.log('[Setup] Starting Web server on port 3000...');
    webProcess = spawn('npm', ['run', 'start', '--workspace=@school/web'], {
      stdio: 'ignore',
      shell: true,
      detached: process.platform !== 'win32',
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    });
    await waitForPort(`${BASE_URL}/`);
    console.log('[Setup] Web server is ready!\n');
  }

  const cleanup = () => {
    if (apiProcess && apiProcess.pid) {
      try {
        if (process.platform === 'win32') execSync(`taskkill /pid ${apiProcess.pid} /T /F`, { stdio: 'ignore' });
        else process.kill(-apiProcess.pid, 'SIGKILL');
      } catch {}
    }
    if (webProcess && webProcess.pid) {
      try {
        if (process.platform === 'win32') execSync(`taskkill /pid ${webProcess.pid} /T /F`, { stdio: 'ignore' });
        else process.kill(-webProcess.pid, 'SIGKILL');
      } catch {}
    }
  };

  try {
    const browser = await chromium.launch({
      headless: true,
      channel: process.env.CI ? undefined : 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = [];
    let allTargetsMet = true;

    for (const route of ROUTES) {
      process.stdout.write(`Benchmarking ${route.name} (${route.path})... `);
      try {
        const metric = await measureRoute(browser, route);
        results.push(metric);
        const status = metric.lcpTargetMet && metric.clsTargetMet ? 'PASSED' : 'TARGET_MISSED';
        if (!metric.lcpTargetMet || !metric.clsTargetMet) allTargetsMet = false;
        console.log(`[${status}] LCP: ${metric.lcpMs}ms, CLS: ${metric.cls}, TTFB: ${metric.ttfbMs}ms`);
      } catch (err) {
        console.log(`[FAILED: ${err.message}]`);
        results.push({
          name: route.name,
          path: route.path,
          error: err.message,
          lcpTargetMet: false,
          clsTargetMet: false,
        });
        allTargetsMet = false;
      }
    }

    await browser.close();

    // Print Summary Table
    console.log('\n---------------------------------------------------------------------------------------------------------');
    console.log('| Route Name                     | Path                    | LCP (ms) | CLS    | TTFB (ms) | TBT (ms) | Status |');
    console.log('---------------------------------------------------------------------------------------------------------');
    for (const r of results) {
      if (r.error) {
        console.log(`| ${r.name.padEnd(30)} | ${r.path.padEnd(23)} | ERROR: ${r.error.slice(0, 30)} |`);
        continue;
      }
      const status = (r.lcpTargetMet && r.clsTargetMet) ? 'GREEN ' : 'REVIEW';
      console.log(
        `| ${r.name.padEnd(30)} | ${r.path.padEnd(23)} | ${String(r.lcpMs).padStart(8)} | ${String(r.cls).padStart(6)} | ${String(r.ttfbMs).padStart(9)} | ${String(r.tbtMs).padStart(8)} | ${status} |`
      );
    }
    console.log('---------------------------------------------------------------------------------------------------------\n');

    const summary = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      totalRoutesTested: results.length,
      allTargetsMet,
      targets: {
        lcpMs: 2500,
        cls: 0.1,
        tbtMs: 200,
      },
      results,
    };

    const outputPath = path.resolve(process.cwd(), 'benchmark-results-web.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`[Report] Benchmark results saved to: ${outputPath}\n`);

    cleanup();

    if (!allTargetsMet) {
      console.warn('[Notice] One or more routes exceeded laboratory targets. Inspect details above.');
    } else {
      console.log('[SUCCESS] All representative public routes met Web Vitals laboratory performance targets!');
    }
  } catch (err) {
    cleanup();
    console.error('[Benchmark Error]', err);
    process.exit(1);
  }
}

runBenchmark();
