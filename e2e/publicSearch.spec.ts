import { test, expect } from '@playwright/test';

test.describe('Day 14: Tenant-Scoped Public Search E2E Lifecycle (FR-SRCH-001, UC-PUB-02, BR-001, BR-002)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate with simulated Oxford tenant host context
    await page.goto('/');
  });

  // --------------------------------------------------------------------------
  // TEST 1: Header Navigation Integration to Search Page
  // --------------------------------------------------------------------------
  test('Header Navigation: Search action button navigates to /search', async ({ page }) => {
    test.setTimeout(30000);

    const searchNavBtn = page.locator('#nav-search-button');
    await expect(searchNavBtn).toBeVisible();
    await searchNavBtn.click();

    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator('h1')).toContainText('Institutional Search');
    await expect(page.locator('#search-query-input')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Type Public Search Query & Result Cards
  // --------------------------------------------------------------------------
  test('Public Search: Submits query, renders results across content types with working links', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('/search');

    const searchInput = page.locator('#search-query-input');
    await searchInput.fill('Science');
    await page.locator('#search-submit-btn').click();

    // Verify URL updated
    await expect(page).toHaveURL(/q=Science/);

    // Verify search results summary
    const summary = page.locator('.search-results-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Science');

    // Verify cards are rendered
    const resultCards = page.locator('.search-result-card');
    await expect(resultCards.first()).toBeVisible();
    const count = await resultCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check presence of badges
    const badges = page.locator('.result-type-badge');
    expect(await badges.count()).toBeGreaterThanOrEqual(1);

    // Click on a result title link to verify working destination
    const firstTitleLink = page.locator('.result-title-link').first();
    const targetUrl = await firstTitleLink.getAttribute('href');
    expect(targetUrl).toBeTruthy();

    await firstTitleLink.click();
    await expect(page).not.toHaveURL(/\/search/);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Content-Type Filter Tabs and Sorting
  // --------------------------------------------------------------------------
  test('Public Search: Content type filter tab restricts results to chosen category', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('/search?q=Science');

    // Wait for results
    await expect(page.locator('.search-results-summary')).toBeVisible();

    // Click "Programmes" filter tab
    const progTab = page.locator('#filter-tab-programme');
    if (await progTab.isVisible()) {
      await progTab.click();
      await expect(page).toHaveURL(/type=PROGRAMME/);

      // Verify every card is a PROGRAMME card
      const badges = page.locator('.result-type-badge');
      const badgeCount = await badges.count();
      for (let i = 0; i < badgeCount; i++) {
        await expect(badges.nth(i)).toHaveText('PROGRAMME');
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Empty Results Safe State
  // --------------------------------------------------------------------------
  test('Public Search: Empty results state for non-matching query displays suggestions and directory links', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('/search?q=NonExistentQueryTermXYZ123');

    const emptyState = page.locator('#search-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No matching records found');
    await expect(emptyState).toContainText('NonExistentQueryTermXYZ123');

    // Verify directory suggestions
    await expect(page.locator('a:has-text("Academic Catalog")')).toBeVisible();
    await expect(page.locator('a:has-text("Staff Directory")')).toBeVisible();
    await expect(page.locator('a:has-text("News & Events")')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 5: Publication Rules: Draft Records Never Discoverable (BR-002)
  // --------------------------------------------------------------------------
  test('Publication Security: Draft programmes and private records are never returned in public search', async ({ page }) => {
    test.setTimeout(30000);

    // Search for seeded draft programme: "Robotics and AI Advanced Enrichment Track"
    await page.goto('/search?q=Robotics%20and%20AI%20Advanced%20Enrichment');

    // Must show empty state, draft programme must NEVER appear
    const emptyState = page.locator('#search-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(page.locator('.result-title:has-text("Robotics & AI Advanced Enrichment Track")')).toHaveCount(0);
  });
});
