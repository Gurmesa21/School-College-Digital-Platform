import { test, expect } from '@playwright/test';

test.describe('Day 7: Dynamic Forms, Public Submissions & Admissions Review Lifecycle', () => {
  const testRunId = Date.now();
  const testFormTitle = `Campus Scholarship ${testRunId}`;
  const testFormSlug = `scholarship-${testRunId}`;

  test('Public Contact Form, Admissions Application, Dynamic Form Builder & Admin Review Workflow', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // ------------------------------------------------------------------------
    // Step 1: Public Contact Us Form (/contact)
    // ------------------------------------------------------------------------
    await page.goto('/contact');
    await expect(page).toHaveTitle(/Contact/i);
    await expect(page.locator('h1')).toContainText('Get in Touch With Us');

    // Fill contact form
    const contactForm = page.locator('#public-form-contact-us');
    await expect(contactForm).toBeVisible({ timeout: 15000 });

    await contactForm.locator('input[name="fullName"]').fill(`Test Contact User ${testRunId}`);
    await contactForm.locator('input[name="email"]').fill(`contact.${testRunId}@example.com`);
    await contactForm.locator('input[name="phone"]').fill('+1-555-019-2834');
    await contactForm.locator('select[name="department"]').selectOption('Admissions & Enrollment');
    await contactForm.locator('textarea[name="message"]').fill(
      'This is an automated E2E test inquiry regarding upcoming enrollment deadlines and academic requirements.'
    );

    // Submit contact form
    await contactForm.locator('#form-submit-btn').click();

    // Verify submission success state
    const successBanner = page.locator('[role="alert"]').first();
    await expect(successBanner).toBeVisible({ timeout: 15000 });
    await expect(successBanner).toContainText('Submission Successful');

    // ------------------------------------------------------------------------
    // Step 2: Public Admissions Application Form (/admissions)
    // ------------------------------------------------------------------------
    await page.goto('/admissions');
    await expect(page).toHaveTitle(/Admissions/i);
    await expect(page.locator('h1')).toContainText('Admissions & Student Applications');

    // Verify admissions form is rendered
    const admissionsForm = page.locator('#public-form-admissions-application');
    await expect(admissionsForm).toBeVisible({ timeout: 15000 });

    await admissionsForm.locator('input[name="studentFullName"]').fill(`Student Candidate ${testRunId}`);
    await admissionsForm.locator('input[name="dateOfBirth"]').fill('2010-09-15');
    await admissionsForm.locator('select[name="gradeApplying"]').selectOption('HIGH');
    await admissionsForm.locator('input[name="parentFullName"]').fill(`Parent Guardian ${testRunId}`);
    await admissionsForm.locator('input[name="parentEmail"]').fill(`guardian.${testRunId}@example.com`);
    await admissionsForm.locator('input[name="parentPhone"]').fill('+1-555-837-9921');
    await admissionsForm.locator('input[name="previousSchool"]').fill('Addis International Academy');
    await admissionsForm.locator('textarea[name="specialNeeds"]').fill(
      'Passionate about STEM, robotics, and cross-country athletics. No learning accommodations needed.'
    );

    // Submit admissions application
    await admissionsForm.locator('#form-submit-btn').click();

    // Verify confirmation banner
    const admissionsSuccessBanner = page.locator('[role="alert"]').first();
    await expect(admissionsSuccessBanner).toBeVisible({ timeout: 15000 });
    await expect(admissionsSuccessBanner).toContainText('Submission Successful');

    // ------------------------------------------------------------------------
    // Step 3: Admin Sign-in & Dynamic Forms Management (/admin)
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    await page.locator('#auth-email').fill('admin@oxford.edu');
    await page.locator('#auth-password').fill('AdminPassword123!');
    await page.locator('#auth-signin-btn').click();

    const userBadge = page.locator('#auth-user-badge');
    await expect(userBadge).toBeVisible({ timeout: 15000 });

    // Switch to Dynamic Forms tab
    const formsTabBtn = page.locator('#tab-forms-btn');
    await expect(formsTabBtn).toBeVisible();
    await formsTabBtn.click();

    await expect(page.locator('#forms-heading')).toBeVisible();

    // Verify seeded forms exist in table
    await expect(page.locator('#form-row-contact-us')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#form-row-admissions-application')).toBeVisible();

    // ------------------------------------------------------------------------
    // Step 4: Build a New Dynamic Form via Form Builder Modal
    // ------------------------------------------------------------------------
    await page.locator('#create-form-btn').click();
    await expect(page.locator('#form-modal-title')).toBeVisible();

    await page.locator('#form-builder-title').fill(testFormTitle);
    await page.locator('#form-builder-slug').fill(testFormSlug);
    await page.locator('#form-builder-desc').fill('Merit-based scholarship opportunities for distinguished incoming students.');
    await page.locator('#form-builder-btn-text').fill('Submit Scholarship Application');
    await page.locator('#form-builder-success-msg').fill('Your scholarship application has been logged for faculty review.');

    // Save the new form
    await page.locator('#save-form-btn').click();

    // Verify modal closes and form appears in list
    await expect(page.locator('#form-modal-title')).not.toBeVisible({ timeout: 15000 });
    const newFormRow = page.locator(`#form-row-${testFormSlug}`);
    await expect(newFormRow).toBeVisible({ timeout: 15000 });
    await expect(newFormRow).toContainText(testFormTitle);

    // ------------------------------------------------------------------------
    // Step 5: Test the newly created Dynamic Form Public Route (/forms/:slug)
    // ------------------------------------------------------------------------
    await page.goto(`/forms/${testFormSlug}`);
    const customForm = page.locator(`#public-form-${testFormSlug}`);
    await expect(customForm).toBeVisible({ timeout: 15000 });

    // Fill standard seeded fields of new form (fullName, email, message)
    await customForm.locator('input[name="fullName"]').fill(`Scholar Applicant ${testRunId}`);
    await customForm.locator('input[name="email"]').fill(`scholar.${testRunId}@example.com`);
    await customForm.locator('textarea[name="message"]').fill('National science olympiad medalist seeking fellowship grant.');

    await customForm.locator('#form-submit-btn').click();

    // Verify custom success message
    const customSuccessBanner = page.locator('[role="alert"]').first();
    await expect(customSuccessBanner).toBeVisible({ timeout: 15000 });
    await expect(customSuccessBanner).toContainText('Submission Successful');

    // ------------------------------------------------------------------------
    // Step 6: Review & Transition Submission Status in Admin Dashboard
    // ------------------------------------------------------------------------
    await page.goto('/admin');
    const submissionsTabBtn = page.locator('#tab-submissions-btn');
    await expect(submissionsTabBtn).toBeVisible({ timeout: 15000 });
    await submissionsTabBtn.click();

    await expect(page.locator('#submissions-heading')).toBeVisible();

    // Locate the contact or admissions submission row
    const reviewBtn = page.locator('button[id^="review-sub-"]').first();
    await expect(reviewBtn).toBeVisible({ timeout: 15000 });
    await reviewBtn.click();

    // Verify Review Modal opens
    const reviewModalTitle = page.locator('#review-modal-title');
    await expect(reviewModalTitle).toBeVisible({ timeout: 10000 });

    // Transition status to UNDER_REVIEW and add notes
    await page.locator('#review-status-select').selectOption('UNDER_REVIEW');
    await page.locator('#review-notes-textarea').fill(`Reviewed by admissions officer: verified documents for ${testRunId}.`);
    await page.locator('#save-review-decision-btn').click();

    // Verify modal closes and notice confirms status update
    await expect(reviewModalTitle).not.toBeVisible({ timeout: 15000 });
    const globalNotice = page.locator('.alert-success');
    await expect(globalNotice).toBeVisible({ timeout: 10000 });
    await expect(globalNotice).toContainText('Submission status updated to UNDER_REVIEW');
  });
});
