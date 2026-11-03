import { test, expect } from '@playwright/test';

test.describe('Day 16: SEO, Metadata, Sitemaps & Robots Policies', () => {
  // 1. Homepage SEO & OpenGraph Metadata
  test('1. Homepage contains tenant-branded title, meta description, canonical link, and OpenGraph tags', async ({ page }) => {
    await page.goto('/');

    // Page Title
    await expect(page).toHaveTitle(/Oxford International School/i);

    // Meta Description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /Oxford International School/i);

    // Canonical link tag
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /localhost:3000/);

    // OpenGraph Tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Oxford International School/i);

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    const ogImageSrc = await ogImage.getAttribute('content');
    expect(ogImageSrc).toBeTruthy();

    // Twitter Card Tags
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
  });

  // 2. Multi-Tenant Canonical URL Isolation (BR-001, BR-002)
  test('2. Multi-tenant canonical isolation: Kindergarten tenant emits Kindergarten canonical URL and OG title', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'kindergarten.localhost:3000',
      },
    });
    const page = await context.newPage();

    await page.goto('/');

    // Verify Title reflects Kindergarten
    await expect(page).toHaveTitle(/Little Explorers Kindergarten/i);

    // Canonical Link MUST contain kindergarten.localhost:3000 and NOT oxford
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /kindergarten\.localhost:3000/);

    // OpenGraph title reflects Kindergarten
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Little Explorers Kindergarten/i);

    // html lang attribute
    const htmlTag = page.locator('html');
    await expect(htmlTag).toHaveAttribute('lang', 'en');

    await context.close();
  });

  // 3. Detail Page Metadata and Canonical URLs
  test('3. Academic programme detail page emits canonical URL and structured metadata', async ({ page }) => {
    await page.goto('/academics/international-a-levels');

    // Title includes Programme title
    await expect(page).toHaveTitle(/Cambridge International A-Levels/i);

    // Canonical Link
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /\/academics\/international-a-levels/);

    // OpenGraph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Cambridge International A-Levels/i);
  });

  test('4. Staff detail page emits canonical URL and profile OpenGraph metadata', async ({ page }) => {
    await page.goto('/staff/dr-eleanor-vance');

    // Title includes Staff member
    await expect(page).toHaveTitle(/Dr\. Eleanor Vance/i);

    // Canonical Link
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /\/staff\/dr-eleanor-vance/);

    // OpenGraph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Dr\. Eleanor Vance/i);
  });

  test('5. Campus news article detail page emits canonical URL and article metadata', async ({ page }) => {
    await page.goto('/news/annual-science-symposium-winners-2026');

    // Title includes Article title
    await expect(page).toHaveTitle(/Science Symposium/i);

    // Canonical Link
    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', /\/news\/annual-science-symposium-winners-2026/);

    // OpenGraph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Science Symposium/i);
  });

  // 6. Dynamic XML Sitemap Route (/sitemap.xml)
  test('6. Dynamic XML Sitemap serves valid XML with tenant-scoped URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(/xml/i);

    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('<loc>');
    expect(body).toContain('http://oxford.localhost:3000');
    expect(body).toContain('/academics');
    expect(body).toContain('/staff');
    expect(body).toContain('/news');
    expect(body).toContain('/events');
    expect(body).toContain('/contact');
  });

  // 7. Dynamic Robots.txt Policy (/robots.txt)
  test('7. Dynamic robots.txt serves crawl policies and points to tenant sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(/text\/plain/i);

    const body = await response.text();
    expect(body.toLowerCase()).toContain('user-agent: *');
    expect(body.toLowerCase()).toContain('disallow: /admin');
    expect(body.toLowerCase()).toContain('sitemap: http://oxford.localhost:3000/sitemap.xml');
  });

  // 8. Dynamic OpenGraph Generator Route (/api/og)
  test('8. Dynamic OpenGraph image generator produces PNG image response', async ({ request }) => {
    const response = await request.get('/api/og?title=Oxford%20Admissions&subtitle=Apply%20Now&type=portal', {
      headers: {
        'x-forwarded-host': 'oxford.localhost:3000',
      },
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toMatch(/image\/png/i);

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(100);
  });
});

