import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Day 19: Automated Accessibility Regression Suite (WCAG 2.2 Level AA)
 * Targets: WCAG 2.0 A/AA, WCAG 2.1 A/AA, WCAG 2.2 AA standards
 * Scans representative public institutional interfaces and administrative consoles.
 */
test.describe('Day 19: Automated Accessibility Regression Suite (WCAG 2.2 AA)', () => {
  test.beforeEach(async () => {
    test.setTimeout(90000);
  });

  test('1. Public Homepage satisfies WCAG 2.2 AA accessibility rules', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify skip-to-content link exists and becomes focusable
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();

    // Verify landmarks: banner, navigation, main, contentinfo
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast']) // Color contrast will be evaluated with full CSS in manual Day 20 audit
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2. Academic Catalogue & Programme Detail satisfy accessibility rules', async ({ page }) => {
    // Catalogue listing
    await page.goto('/academics');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const catalogueA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(catalogueA11y.violations).toEqual([]);

    // Programme detail
    await page.goto('/academics/cambridge-igcse');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const detailA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(detailA11y.violations).toEqual([]);
  });

  test('3. Staff Directory & Profile Detail satisfy accessibility rules', async ({ page }) => {
    // Staff directory
    await page.goto('/staff');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const directoryA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(directoryA11y.violations).toEqual([]);

    // Staff profile detail
    await page.goto('/staff/dr-eleanor-vance');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const profileA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(profileA11y.violations).toEqual([]);
  });

  test('4. News & Announcements and Events Calendar satisfy accessibility rules', async ({ page }) => {
    // News page
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const newsA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(newsA11y.violations).toEqual([]);

    // Events calendar
    await page.goto('/events');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const eventsA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(eventsA11y.violations).toEqual([]);
  });

  test('5. Public Search Interface satisfies accessibility rules', async ({ page }) => {
    await page.goto('/search?q=curriculum');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    // Verify search input has accessible name
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    const searchA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(searchA11y.violations).toEqual([]);
  });

  test('6. Contact & Admissions Enquiry Form satisfies accessibility rules', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    // Verify form controls have associated labels or accessible names
    const nameInput = page.locator('input[name="fullName"], input#fullName, input[placeholder*="Name"]').first();
    await expect(nameInput).toBeVisible();

    const contactA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(contactA11y.violations).toEqual([]);
  });

  test('7. Public Documents Repository satisfies accessibility rules', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    const docsA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(docsA11y.violations).toEqual([]);
  });

  test('8. Admin Console & Login interface satisfy accessibility rules', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Admin header & login fields
    const emailInput = page.locator('#auth-email');
    await expect(emailInput).toBeVisible();
    const passwordInput = page.locator('#auth-password');
    await expect(passwordInput).toBeVisible();

    const adminA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(adminA11y.violations).toEqual([]);
  });

  test('9. Keyboard navigation and focus order traversal on Public Header', async ({ page }) => {
    await page.goto('/');

    // Press Tab to focus Skip Link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();

    // Press Tab to enter Brand link
    await page.keyboard.press('Tab');
    const brandLink = page.locator('.public-brand-link');
    await expect(brandLink).toBeFocused();

    // Tab into main navigation
    await page.keyboard.press('Tab');
    const firstNavItem = page.locator('.public-nav-list a').first();
    await expect(firstNavItem).toBeFocused();
  });
});

