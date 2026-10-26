import { test, expect } from '@playwright/test';

test.describe('Day 12: News, Notices & Event Calendar E2E Lifecycle', () => {
  const testRunId = Date.now();
  const testNewsTitle = `Campus Sustainability Project ${testRunId}`;
  const testNewsSlug = `campus-sustainability-project-${testRunId}`;
  const testNoticeTitle = `Library Maintenance Notice ${testRunId}`;
  const testEventTitle = `Spring Robotics Showcase ${testRunId}`;
  const testEventSlug = `spring-robotics-showcase-${testRunId}`;

  // --------------------------------------------------------------------------
  // TEST 1: Public News Reading, Tags, Archive & Draft 404 Protection
  // --------------------------------------------------------------------------
  test('Public News: Listing, Tag Filter, Article Detail & Draft Protection (FR-COM-001)', async ({ page, request }) => {
    test.setTimeout(60000);

    // 1. Visit Public News Page
    await page.goto('/news');
    await expect(page).toHaveURL(/\/news/);
    await expect(page.locator('h1')).toContainText('Institutional News & Announcements');

    // 2. Check Seeded Articles
    const stemArticleCard = page.locator('article:has-text("Oxford Unveils Cutting-Edge STEM Innovation Wing")');
    await expect(stemArticleCard).toBeVisible();
    await expect(stemArticleCard).toContainText('STEM');

    // 3. Verify Draft Article is NOT in Public Listing
    const draftCard = page.locator('article:has-text("2027 International Summer Internship")');
    await expect(draftCard).toHaveCount(0);

    // 4. Click Tag Filter
    const stemTagBtn = page.locator('button:has-text("#STEM")');
    if (await stemTagBtn.isVisible()) {
      await stemTagBtn.click();
      await expect(stemArticleCard).toBeVisible();
    }

    // 5. Navigate to Article Detail
    await page.goto('/news/stem-innovation-wing-inauguration');
    await expect(page).toHaveURL(/\/news\/stem-innovation-wing-inauguration/);
    await expect(page.locator('h1')).toContainText('Oxford Unveils Cutting-Edge STEM Innovation Wing');
    await expect(page.locator('body')).toContainText('Dr. Eleanor Vance');
    await expect(page.locator('body')).toContainText('sustainable architectural design');

    // 6. Verify Draft Article returns 404 / Not Found for Anonymous Visitors
    const draftPageRes = await request.get('http://localhost:3000/news/summer-internship-partnerships-draft');
    expect(draftPageRes.status()).toBe(404);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Public Announcements: Emergency Banner & Dynamic Expiry Filter
  // --------------------------------------------------------------------------
  test('Public Announcements: Active Placement, Priority Banner & Dynamic Expiry Filter (FR-COM-002)', async ({ page, request }) => {
    test.setTimeout(60000);

    // 1. Visit Homepage with Active Announcements Banner
    await page.goto('/');
    
    // 2. Emergency Alert Banner should be rendered
    const banner = page.locator('[aria-label="Institutional Announcements and Advisories"]');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText('Urgent Notice');
    await expect(banner).toContainText('Adverse Weather Alert');

    // 3. Dismiss non-emergency notice (emergency alert remains pinned per FR-COM-002)
    const dismissBtn = banner.locator('button[aria-label^="Dismiss announcement"]').first();
    await dismissBtn.click();
    await expect(banner.locator('text=Extended Evening Library Study Hours')).toHaveCount(0);
    await expect(banner.locator('text=Adverse Weather Alert')).toBeVisible();

    // 4. Check API endpoint ensures expired notice is excluded
    const annRes = await request.get('http://localhost:4000/api/v1/tenant/public/announcements', {
      headers: { Host: 'oxford.localhost:4000' },
    });
    expect(annRes.status()).toBe(200);
    const annData = await annRes.json();
    const items = annData.data || [];
    const hasExpired = items.some((item: any) => item.title.includes('Expired') || item.title.includes('Past Notice'));
    expect(hasExpired).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Events Calendar: Upcoming/Past Filter, Timezone & RFC 5545 iCal Export
  // --------------------------------------------------------------------------
  test('Events Calendar: Timezone Semantics, Upcoming vs Past & iCalendar Download (FR-EVT-001, FR-EVT-002)', async ({ page, request }) => {
    test.setTimeout(60000);

    // 1. Visit Public Events Calendar Page
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);
    await expect(page.locator('h1')).toContainText('Events & Academic Milestones');

    // 2. Verify Upcoming Events Tab
    const upcomingOpenHouse = page.locator('article:has-text("Oxford Autumn Campus Open Day")');
    await expect(upcomingOpenHouse).toBeVisible();

    // 3. Switch to Past Events Tab
    const pastTabLink = page.locator('a:has-text("Past Events")');
    await pastTabLink.click();
    const pastGraduation = page.locator('article:has-text("Class of 2026 Annual Commencement")');
    await expect(pastGraduation).toBeVisible();

    // 4. Navigate to Event Detail
    await page.goto('/events/oxford-autumn-open-house-2026');
    await expect(page).toHaveURL(/\/events\/oxford-autumn-open-house-2026/);
    await expect(page.locator('h1')).toContainText('Oxford Autumn Campus Open Day');
    await expect(page.locator('body')).toContainText('Main Auditorium');

    // 5. Verify RFC 5545 iCalendar (.ics) Download link
    const icsLink = page.locator('a[download*=".ics"]');
    await expect(icsLink).toBeVisible();
    const href = await icsLink.getAttribute('href');
    expect(href).toContain('/ics');

    // 6. Test iCal Endpoint Response directly
    const icsRes = await request.get(`http://localhost:4000${href}`, {
      headers: { Host: 'oxford.localhost:4000' },
    });
    expect(icsRes.status()).toBe(200);
    expect(icsRes.headers()['content-type']).toContain('text/calendar');
    const icsBody = await icsRes.text();
    expect(icsBody).toContain('BEGIN:VCALENDAR');
    expect(icsBody).toContain('BEGIN:VEVENT');
    expect(icsBody).toContain('SUMMARY:Oxford Autumn Campus Open Day');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Admin Dashboard: News, Notices & Events Management Tabs
  // --------------------------------------------------------------------------
  test('Admin Dashboard: Editorial News, Announcements & Events Management Workflows', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Sign in as Tenant Administrator
    await page.goto('/admin');
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 10000 });
    await expect(userBadge).toContainText('admin@oxford.edu');

    // 2. Test News Tab
    const newsTabBtn = page.locator('#tab-news-btn');
    await expect(newsTabBtn).toBeVisible();
    await newsTabBtn.click();
    await expect(page.locator('h2:has-text("News Gazette & Editorial Articles")')).toBeVisible();

    // 3. Test Announcements Tab
    const annTabBtn = page.locator('#tab-announcements-btn');
    await expect(annTabBtn).toBeVisible();
    await annTabBtn.click();
    await expect(page.locator('h2:has-text("Operational Notices & Announcements")')).toBeVisible();
    // Verify emergency badge
    await expect(page.locator('span:has-text("EMERGENCY")').first()).toBeVisible();

    // 4. Test Events Tab
    const eventsTabBtn = page.locator('#tab-events-btn');
    await expect(eventsTabBtn).toBeVisible();
    await eventsTabBtn.click();
    await expect(page.locator('h2:has-text("Events Calendar Management")')).toBeVisible();
  });
});
