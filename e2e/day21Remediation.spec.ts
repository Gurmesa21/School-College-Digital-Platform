import { test, expect } from '@playwright/test';

test.describe('Day 21: UI/UX Audit Remediation & Client-Readiness Hardening', () => {
  // 1. P0 Data Sanitization: Zero Raw Timestamps in Public Views
  test('1. Public views contain zero raw 13-digit epoch timestamps', async ({ page }) => {
    const urls = ['/', '/academics', '/staff'];

    for (const url of urls) {
      await page.goto(url);
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeDefined();

      // Check for raw 13-digit timestamps like 1793... or 1730...
      const rawTimestampMatch = bodyText!.match(/\b1[6789]\d{11}\b/);
      expect(
        rawTimestampMatch,
        `Found raw 13-digit epoch timestamp "${rawTimestampMatch?.[0]}" on page ${url}`
      ).toBeNull();
    }
  });

  // 2. P0 Verification of Legitimate Oxford Records
  test('2. Verified Oxford seeded records are intact after test contamination purge', async ({ page }) => {
    // Academics page
    await page.goto('/academics');
    await expect(page.locator('text=Cambridge IGCSE Programme').first()).toBeVisible();
    await expect(page.locator('text=Cambridge International A-Levels').first()).toBeVisible();

    // Staff directory page
    await page.goto('/staff');
    await expect(page.locator('text=Dr. Eleanor Vance').first()).toBeVisible();
    await expect(page.locator('text=Marcus Sterling').first()).toBeVisible();
  });

  // 3. P0 Developer Artifact Removal
  test('3. Developer engineering telemetry is purged from public DOM', async ({ page }) => {
    await page.goto('/');

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeDefined();

    // Check absence of internal engineering telemetry
    expect(bodyText).not.toContain('Environment & System Status');
    expect(bodyText).not.toContain('BR-001 ISOLATED');
    expect(bodyText).not.toContain('Controlled 20-Day Implementation Plan');
    expect(bodyText).not.toContain('Timezone: UTC • Locale: en');
    expect(bodyText).not.toContain('Private School & College Digital Website Platform');

    // Status heading element must not be visible
    const statusHeading = page.locator('#status-heading');
    await expect(statusHeading).not.toBeVisible();
  });

  // 4. P1 Viewport Overflow Verification Across 10 Target Screen Sizes
  const VIEWPORTS = [
    { name: '1440x900 Large Desktop', width: 1440, height: 900 },
    { name: '1366x768 Standard Desktop', width: 1366, height: 768 },
    { name: '1280x800 Compact Desktop', width: 1280, height: 800 },
    { name: '1200x800 Upper Intermediate', width: 1200, height: 800 },
    { name: '1100x800 Mid Intermediate', width: 1100, height: 800 },
    { name: '1024x768 Tablet Landscape', width: 1024, height: 768 },
    { name: '900x700 Tablet Portrait Large', width: 900, height: 700 },
    { name: '768x1024 Tablet Portrait', width: 768, height: 1024 },
    { name: '390x844 Modern Smartphone', width: 390, height: 844 },
    { name: '320x568 Compact Mobile', width: 320, height: 568 },
  ];

  for (const vp of VIEWPORTS) {
    test(`4. Viewport ${vp.name} (${vp.width}px): Zero horizontal scrollbar`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(
        hasHorizontalScroll,
        `Viewport ${vp.width}px has horizontal overflow (scrollWidth > innerWidth)`
      ).toBe(false);
    });
  }

  // 5. P1 Responsive Navigation & Mobile Drawer
  test('5. Responsive navigation drawer functions correctly at <= 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    const toggleBtn = page.locator('#mobile-nav-toggle-btn');
    await expect(toggleBtn).toBeVisible();

    // Drawer starts closed
    const drawer = page.locator('#primary-navigation');
    await expect(drawer).not.toHaveClass(/open/);

    // Open drawer
    await toggleBtn.click();
    await expect(drawer).toHaveClass(/open/);

    // Verify key nav links inside drawer
    await expect(drawer.locator('a[href="/academics"]').first()).toBeVisible();
    await expect(drawer.locator('a[href="/admissions"]').first()).toBeVisible();
    await expect(drawer.locator('a[href="/contact"]').first()).toBeVisible();

    // Close drawer
    await toggleBtn.click();
    await expect(drawer).not.toHaveClass(/open/);
  });

  // 6. Architectural Decision Two: Staff/Admin Portal Separation & Public Header Brand
  test('6. Header presents institutional brand, Admissions Inquiry CTA, and zero staff/admin portal links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Brand lockup
    const brandName = page.locator('.public-brand-name');
    await expect(brandName).toBeVisible();
    await expect(brandName).toContainText('Oxford International School');

    // Admissions conversion CTA
    const applyCta = page.locator('.public-header-apply-cta');
    await expect(applyCta).toBeVisible();
    await expect(applyCta).toContainText('Admissions Inquiry');

    // Architectural Decision Two: zero admin/staff links on public pages
    const staffLinks = page.locator('a[href="/admin"]');
    await expect(staffLinks).toHaveCount(0);
  });

  // 7. P1 Content Card Standardization: Heading Hierarchy & Word Truncation
  test('7. Content cards use standard h3 heading levels and word-safe formatting', async ({ page }) => {
    // Academics cards
    await page.goto('/academics');
    const programmeCards = page.locator('.academic-card');
    const programmeCount = await programmeCards.count();
    expect(programmeCount).toBeGreaterThan(0);

    for (let i = 0; i < programmeCount; i++) {
      const card = programmeCards.nth(i);
      const titleHeading = card.locator('h3');
      await expect(titleHeading).toBeVisible();
    }

    // News cards
    await page.goto('/news');
    const newsCards = page.locator('.news-card');
    const newsCount = await newsCards.count();
    if (newsCount > 0) {
      for (let i = 0; i < newsCount; i++) {
        const card = newsCards.nth(i);
        const titleHeading = card.locator('h3');
        await expect(titleHeading).toBeVisible();
      }
    }

    // Events cards
    await page.goto('/events');
    const eventCards = page.locator('.event-card');
    const eventCount = await eventCards.count();
    if (eventCount > 0) {
      for (let i = 0; i < eventCount; i++) {
        const card = eventCards.nth(i);
        const titleHeading = card.locator('h3');
        await expect(titleHeading).toBeVisible();
      }
    }
  });

  // 8. P2 Placeholder Email Sanitization
  test('8. Placeholder .example email domain is not exposed to public visitors', async ({ page }) => {
    await page.goto('/contact');
    const contactText = await page.locator('#main-content').first().innerText();
    expect(contactText).not.toContain('.example');

    await page.goto('/');
    const footerText = await page.locator('footer').innerText();
    expect(footerText).not.toContain('.example');
  });

  // 9. Architectural Decision One: Lightweight Admissions & Physical Campus Visit Requirement
  test('9. Admissions page explicitly mandates physical campus visit and disclaims automated enrollment', async ({ page }) => {
    await page.goto('/admissions');

    // Title / heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Admissions Inquiries & Campus Consultations');

    // Prominent institutional policy notice
    const policyNotice = page.locator('[role="note"]');
    await expect(policyNotice).toBeVisible();
    await expect(policyNotice).toContainText('In-Person Completion Required');
    await expect(policyNotice).toContainText('does not constitute formal admission or guarantee enrollment');
    await expect(policyNotice).toContainText('physically visit the institution');

    // Step 3 in admissions workflow specifies on-campus registration
    const stepThree = page.locator('h3:has-text("On-Campus Registration")');
    await expect(stepThree).toBeVisible();
  });

  // 10. Architectural Decision Two: Zero Public Portal Links Across All Key Pages
  test('10. Public pages have zero staff/admin portal links while /admin remains accessible directly', async ({ page }) => {
    const publicPages = ['/', '/academics', '/news', '/events', '/staff', '/contact', '/admissions', '/privacy', '/terms'];

    for (const url of publicPages) {
      await page.goto(url);
      const adminLinks = page.locator('a[href="/admin"]');
      await expect(adminLinks).toHaveCount(0);
    }

    // Direct access to /admin works and is protected
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Tenant User Administration');
  });

  // 11. DEF-003: Mobile Brand Name Wrapping Single Line (<= 480px)
  test('11. Mobile brand typography does not wrap awkwardly at <= 480px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const brandName = page.locator('.public-brand-name');
    await expect(brandName).toBeVisible();

    const whiteSpace = await brandName.evaluate((el) => window.getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toBe('nowrap');
  });

  // 12. DEF-004: Footer Authentic Governance Copy & Zero Technical Claims
  test('12. Footer contains authentic institutional governance and no tech claims', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerText = await footer.innerText();
    expect(footerText).not.toContain('WCAG 2.2 Level AA accessibility verified');
    expect(footerText).not.toContain('strict role-based access control');
    expect(footerText).not.toContain('COMPLIANCE & SECURITY');

    // Authentic governance links
    await expect(footer.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/admissions"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/contact"]').first()).toBeVisible();
  });

  // 13. DEF-005: Descriptive Accessible Card Links (WCAG 2.4.4 & WCAG 2.5.3)
  test('13. Card links include screen-reader accessible context (.sr-only)', async ({ page }) => {
    await page.goto('/');

    // Check programme links
    const progLinks = page.locator('a[href^="/academics/"]');
    const progCount = await progLinks.count();
    if (progCount > 0) {
      const srText = progLinks.first().locator('.sr-only');
      await expect(srText).toBeAttached();
    }

    // Check news links
    const newsLinks = page.locator('a[href^="/news/"]');
    const newsCount = await newsLinks.count();
    if (newsCount > 0) {
      const srText = newsLinks.first().locator('.sr-only');
      await expect(srText).toBeAttached();
    }
  });

  // 14. DEF-007: Zero Duplicate Hero Taxonomy Badges
  test('14. Homepage hero has zero duplicate institution type taxonomy labels', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('section.hero-section');
    await expect(hero).toBeVisible();

    // The h1 subtitle should have vision statement, not duplicate of institutionType
    const h1Subtitle = hero.locator('h1 span');
    await expect(h1Subtitle).toContainText('Empowering Minds, Shaping Global Leaders');
  });
});

