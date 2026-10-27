import { test, expect } from '@playwright/test';

test.describe('Day 13: Enquiry Forms & Validated Routing (FR-CON-001, FR-CON-002)', () => {
  const testRunId = Date.now();
  const testFormTitle = `Departmental Enquiry ${testRunId}`;
  const testFormSlug = `dept-enquiry-${testRunId}`;

  test('Submits department enquiry with reference code, configures routing in admin, reviews delivery status and retries notification', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // ------------------------------------------------------------------------
    // Step 1: Public Contact Form Submission with Reference Code (FR-CON-001)
    // ------------------------------------------------------------------------
    await page.goto('/contact');
    await expect(page).toHaveTitle(/Contact/i);

    const contactForm = page.locator('#public-form-contact-us');
    await expect(contactForm).toBeVisible({ timeout: 15000 });

    await contactForm.locator('input[name="fullName"]').fill(`Elena Day 13 ${testRunId}`);
    await contactForm.locator('input[name="email"]').fill(`elena.${testRunId}@example.com`);
    await contactForm.locator('input[name="phone"]').fill('+44 20 7946 0888');
    await contactForm.locator('select[name="department"]').selectOption('admissions');
    await contactForm.locator('textarea[name="message"]').fill(
      'Automated Day 13 enquiry routing test message regarding admissions procedure and validated delivery.'
    );

    // Submit the form
    await contactForm.locator('#form-submit-btn').click();

    // Verify submission success and reference code badge
    const successBanner = page.locator('[role="alert"]').first();
    await expect(successBanner).toBeVisible({ timeout: 15000 });
    await expect(successBanner).toContainText('Submission Successful');

    const refBadge = page.locator('#submission-reference-badge');
    await expect(refBadge).toBeVisible({ timeout: 10000 });
    await expect(refBadge).toContainText('Reference Code:');

    // ------------------------------------------------------------------------
    // Step 2: Admin Dashboard - Configure Category Routing Rules (FR-CON-002)
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    await expect(page.locator('#auth-user-badge')).toBeVisible({ timeout: 15000 });

    // Open Forms Builder tab
    const formsTabBtn = page.locator('#tab-forms-btn');
    await formsTabBtn.click();
    await expect(page.locator('#forms-heading')).toBeVisible();

    // Open Create Form modal
    await page.locator('#create-form-btn').click();
    await expect(page.locator('#form-modal-title')).toBeVisible();

    await page.locator('#form-builder-title').fill(testFormTitle);
    await page.locator('#form-builder-slug').fill(testFormSlug);
    await page.locator('#form-builder-desc').fill('Configurable institutional enquiry form with category routing rules.');

    // Add a Department & Category Routing Rule
    const addRuleBtn = page.locator('#add-routing-rule-btn');
    await expect(addRuleBtn).toBeVisible();
    await addRuleBtn.click();

    // Fill the routing rule
    const ruleCategoryInput = page.locator('input[placeholder="e.g. ADMISSIONS"]').first();
    await expect(ruleCategoryInput).toBeVisible();
    await ruleCategoryInput.fill('ADMISSIONS');

    const ruleLabelInput = page.locator('input[placeholder="e.g. Admissions Office"]').first();
    await ruleLabelInput.fill('Admissions Office');

    const ruleEmailsInput = page.locator('input[placeholder="admissions@school.edu"]').first();
    await ruleEmailsInput.fill('admissions-dept@oxford.school.example');

    // Save the new form with routing rules
    await page.locator('#save-form-btn').click();

    // Verify form created and displayed in table
    await expect(page.locator('#form-modal-title')).not.toBeVisible({ timeout: 15000 });
    const newFormRow = page.locator(`#form-row-${testFormSlug}`);
    await expect(newFormRow).toBeVisible({ timeout: 15000 });

    // ------------------------------------------------------------------------
    // Step 3: Admin Submissions Review & Notification Dispatch Retry
    // ------------------------------------------------------------------------
    const submissionsTabBtn = page.locator('#tab-submissions-btn');
    await submissionsTabBtn.click();
    await expect(page.locator('#submissions-heading')).toBeVisible();

    // Locate the first submission row
    const firstReviewBtn = page.locator('button[id^="review-sub-"]').first();
    await expect(firstReviewBtn).toBeVisible({ timeout: 15000 });
    await firstReviewBtn.click();

    // Verify Submission Review Modal opens
    const reviewModalTitle = page.locator('#review-modal-title');
    await expect(reviewModalTitle).toBeVisible({ timeout: 10000 });

    // Verify Delivery Status and Category are rendered in the review banner
    await expect(page.locator('text=Notification Delivery')).toBeVisible();
    await expect(page.locator('text=Enquiry Category')).toBeVisible();

    // Click Retry Notification Dispatch button
    const retryBtn = page.locator('#retry-notification-btn');
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Verify global success notice confirms retry dispatch
    const globalNotice = page.locator('.alert-success');
    await expect(globalNotice).toBeVisible({ timeout: 15000 });
    await expect(globalNotice).toContainText('Notification retried successfully');
  });
});
