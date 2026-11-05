import { test, expect } from '@playwright/test';

test.describe('Day 15: Public Website Frontends & Tenant-Aware Delivery', () => {
  // 1. Institutional Homepage Rendering & Branding (SRS 5.1, 5.2, FR-TEN-001, FR-TEN-002)
  test('1. Institutional Homepage resolves branding, highlights, and navigation', async ({ page }) => {
    await page.goto('/');

    // Verify title and main brand heading
    await expect(page).toHaveTitle(/Oxford International School/i);
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('Oxford International School');

    // Verify Quick Directory Navigation links
    await expect(page.locator('a[href="/academics"]').first()).toBeVisible();
    await expect(page.locator('a[href="/staff"]').first()).toBeVisible();
    await expect(page.locator('a[href="/news"]').first()).toBeVisible();
    await expect(page.locator('a[href="/events"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admissions"]').first()).toBeVisible();
    await expect(page.locator('a[href="/contact"]').first()).toBeVisible();

    // Verify Academic Highlights section
    const acadHeading = page.locator('#programmes-heading');
    await expect(acadHeading).toBeVisible();
    await expect(
      page.locator('text=Cambridge IGCSE Programme').or(page.locator('text=Cambridge International A-Levels')).first()
    ).toBeVisible();

    // Verify News section
    const newsHeading = page.locator('#news-heading');
    await expect(newsHeading).toBeVisible();

    // Verify Events section
    const eventsHeading = page.locator('#events-heading');
    await expect(eventsHeading).toBeVisible();

    // Verify internal engineering status section is removed from public view (Day 21 P0)
    const statusHeading = page.locator('#status-heading');
    await expect(statusHeading).not.toBeVisible();

    // Verify Architectural Decision Two: zero admin/staff links on public pages
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  });

  // 2. Strict Multi-Tenant Host-Based Branding & Content Isolation (SEC-TEN-001, BR-001)
  test('2. Multi-tenant host isolation: Kindergarten host renders Kindergarten branding without leaking Oxford data', async ({ browser }) => {
    // Create an isolated context with x-forwarded-host set to kindergarten.localhost
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'kindergarten.localhost:3000',
      },
    });
    const page = await context.newPage();

    await page.goto('/');

    // Verify Kindergarten institutional branding
    const brandName = page.locator('.public-brand-name');
    await expect(brandName).toContainText('Little Explorers Kindergarten');

    const heroHeading = page.locator('h1');
    await expect(heroHeading).toContainText('Little Explorers Kindergarten');

    // Verify Kindergarten-specific content is presented
    await expect(page.locator('h3:has-text("Little Explorers Full-Day Kindergarten")')).toBeVisible();

    // Strict Negative Isolation Check: Oxford's secondary programmes must NOT be present
    const oxfordProgramme = page.locator('text=Cambridge International A-Levels');
    await expect(oxfordProgramme).toHaveCount(0);

    // Negative check on staff: Oxford faculty (Dr. Eleanor Vance) must NOT appear on Kindergarten site
    const oxfordFaculty = page.locator('text=Dr. Eleanor Vance');
    await expect(oxfordFaculty).toHaveCount(0);

    await context.close();
  });

  // 3. Shared Header Active Navigation, Mobile Toggle & Search Link (FR-NAV-001, Accessibility)
  test('3. Shared Header navigation active states, search shortcut, and mobile toggle', async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Persistent Search Button in navbar
    const searchBtn = page.locator('#nav-search-button');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await expect(page).toHaveURL(/\/search/);

    // Navigate to Academics from navbar
    const academicsNavLink = page.locator('#primary-navigation a[href="/academics"]');
    await academicsNavLink.click();
    await expect(page).toHaveURL(/\/academics/);
    await expect(academicsNavLink).toHaveClass(/is-active/);

    // Mobile Viewport Check
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const mobileToggle = page.locator('button.mobile-nav-toggle');
    await expect(mobileToggle).toBeVisible();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');

    // Click toggle to open navigation
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
    const navMenu = page.locator('#primary-navigation');
    await expect(navMenu).toHaveClass(/is-open/);

    // Click toggle to close navigation
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
  });

  // 4. Academic Catalogue to Programme Detail Journey (UC-PUB-01, FR-ACAD-001)
  test('4. Academic Catalogue to Programme Detail journey', async ({ page }) => {
    await page.goto('/academics');

    // Verify catalogue header
    await expect(page.locator('h1')).toContainText('Academic Programmes');

    // Click on a programme card
    const programmeLink = page.locator('a[href="/academics/international-a-levels"]').first();
    await expect(programmeLink).toBeVisible();
    await programmeLink.click();

    // Verify programme detail page
    await expect(page).toHaveURL(/\/academics\/international-a-levels/);
    await expect(page.locator('h1')).toContainText('Cambridge International A-Levels');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
  });

  // 5. Staff Directory to Staff Profile Journey (FR-ACAD-003, FR-ACAD-004)
  test('5. Staff Directory to Staff Profile detail journey', async ({ page }) => {
    await page.goto('/staff');

    // Verify directory header
    await expect(page.locator('h1')).toContainText('Faculty & Professional Staff');

    // Search or find staff card
    const profileLink = page.locator('a[href="/staff/dr-eleanor-vance"]').first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    // Verify staff profile page
    await expect(page).toHaveURL(/\/staff\/dr-eleanor-vance/);
    await expect(page.locator('h1')).toContainText('Dr. Eleanor Vance');
    await expect(page.locator('text=Dean & Head of Science & Mathematics')).toBeVisible();
  });

  // 6. News Stories and Announcements Anchor Navigation (FR-COM-001, FR-COM-002)
  test('6. News & Announcements page with operational advisories anchor navigation', async ({ page }) => {
    await page.goto('/news');

    // Verify News and Announcements page title
    await expect(page.locator('h1')).toContainText('Institutional News & Announcements');

    // Verify operational notices section
    const noticesHeading = page.locator('#announcements-section-heading');
    await expect(noticesHeading).toBeVisible();

    // Verify emergency announcement card is visible
    const emergencyNotice = page.locator('h3:has-text("Adverse Weather Alert")').first();
    await expect(emergencyNotice).toBeVisible();

    // Navigate to news article detail
    const articleLink = page.locator('a[href="/news/annual-science-symposium-winners-2026"]').first();
    await expect(articleLink).toBeVisible();
    await articleLink.click();

    await expect(page).toHaveURL(/\/news\/annual-science-symposium-winners-2026/);
    await expect(page.locator('h1')).toContainText('Winners Announced for 2026 Annual Science & Mathematics Symposium');
  });

  // 7. Events Calendar & Event Detail Journey (FR-EVT-001, FR-EVT-002)
  test('7. Events Calendar to Event Detail navigation with iCalendar link', async ({ page }) => {
    await page.goto('/events');

    await expect(page.locator('h1')).toContainText('Events & Academic Milestones');

    // Find and click on open house event
    const eventLink = page.locator('a[href="/events/oxford-autumn-open-house-2026"]').first();
    await expect(eventLink).toBeVisible();
    await eventLink.click();

    await expect(page).toHaveURL(/\/events\/oxford-autumn-open-house-2026/);
    await expect(page.locator('h1')).toContainText('Oxford Autumn Campus Open Day');

    // Verify iCal download link exists
    const icalLink = page.locator('a[href$="/ics"]').first();
    await expect(icalLink).toBeVisible();
  });

  // 8. Contact & General Enquiries Page with Dynamic Institutional Profile (FR-CON-001)
  test('8. Contact page displays institutional contact details and processes enquiry submission', async ({ page }) => {
    await page.goto('/contact');

    // Verify dynamic contact headings and stored institution details
    await expect(page.locator('h1')).toContainText('Get in Touch With Us');
    await expect(page.locator('h1')).toContainText('Oxford International School');
    await expect(page.locator('text=+44 1865 200100').first()).toBeVisible();
    await expect(page.locator('text=Direct Communications').first()).toBeVisible();

    // Fill and submit the embedded dynamic contact form
    await page.fill('input[name="fullName"]', 'David Evans');
    await page.fill('input[name="email"]', 'david.evans@example.com');
    await page.selectOption('select[name="department"]', 'general');
    await page.fill('textarea[name="message"]', 'I would like to inquire about student enrollment for the upcoming academic session.');

    const submitBtn = page.locator('button[type="submit"]:has-text("Send Message")');
    await submitBtn.click();

    // Verify submission confirmation reference code
    const successMsg = page.locator('text=Thank you');
    await expect(successMsg).toBeVisible({ timeout: 10000 });
  });

  // 9. Public Documents and Resources Repository (SRS 5.1, Media Delivery)
  test('9. Public Documents repository lists official publications with direct download', async ({ page }) => {
    await page.goto('/documents');

    await expect(page.locator('h1')).toContainText('Official Documents & Prospectuses');

    // Check for seeded prospectus document
    const prospectusCard = page.locator('h3:has-text("Official School Prospectus 2026-2027")');
    await expect(prospectusCard).toBeVisible();

    // Verify direct file download link
    const downloadBtn = page.locator('a:has-text("Download File")').first();
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toHaveAttribute('href', /\/api\/v1\/tenant\/public\/media\//);
  });
});

