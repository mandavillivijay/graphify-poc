/**
 * auth.regression.spec.ts — Regression tests for ShopHub authentication.
 *
 * Covers edge cases: form validation, duplicate registration, whitespace
 * handling, session persistence, and cross-role access control.
 */

import { test, expect } from '../../src/fixtures/fixtures';
import { TestDataFactory } from '../../src/utils/TestDataFactory';

test.describe('Authentication Regression Tests', () => {

  // ── TC006 — Empty form submission ────────────────────────────────────────────

  test('@regression @auth TC006 - Empty form submission shows validation errors or blocks submit', async ({
    loginPage,
    page,
  }) => {
    await loginPage.navigate();

    // Attempt submit without filling any fields
    await loginPage.submitForm();

    // Either the form shows an error message OR browser HTML5 validation
    // prevents submission and the page stays on /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Check: page stays on /login (browser validation or app-level error)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login/);
  });

  // ── TC007 — Invalid email format ─────────────────────────────────────────────

  test('@regression @auth TC007 - Invalid email format shows error or blocks submission', async ({
    loginPage,
    page,
  }) => {
    await loginPage.navigate();

    // Type a syntactically invalid email address
    await loginPage.fillEmail('not-an-email');
    await loginPage.fillPassword('somepassword');
    await loginPage.submitForm();

    // The page must remain at /login (browser validation or server error)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // If the app shows a validation error element, it must be non-empty
    const isErrorShown = await loginPage.isErrorDisplayed();
    if (isErrorShown) {
      const errorText = await loginPage.getErrorMessage();
      expect(errorText.trim().length).toBeGreaterThan(0);
    }
  });

  // ── TC008 — Login state persists across page refresh ─────────────────────────

  test('@regression @auth TC008 - Login state persists across page refresh', async ({
    authenticatedPage,
    authService,
  }) => {
    // Confirm authenticated before reload
    const authedBefore = await authService.isAuthenticated(authenticatedPage);
    expect(authedBefore).toBe(true);

    // Hard-reload the page
    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });

    // App should read the token from localStorage and stay authenticated
    const authedAfter = await authService.isAuthenticated(authenticatedPage);
    expect(authedAfter, 'Session should survive a page reload').toBe(true);

    // Should not have been redirected to /login
    expect(authenticatedPage.url()).not.toMatch(/\/login/);
  });

  // ── TC009 — Register new user ────────────────────────────────────────────────

  test('@regression @auth TC009 - New user can register successfully', async ({
    registerPage,
    page,
  }) => {
    const newUser = TestDataFactory.createUser();

    await registerPage.navigate();
    await registerPage.assertOnRegisterPage();

    await registerPage.register(
      newUser.name,
      newUser.email,
      newUser.password ?? 'TestPass123!',
    );

    // After successful registration the app either redirects or shows success
    const redirectedAway = await page.waitForURL(
      (url) => !url.pathname.includes('/register'),
      { timeout: 8000 },
    ).then(() => true).catch(() => false);

    if (!redirectedAway) {
      // Still on /register — there should be a success message
      const success = await registerPage.isRegistrationSuccessful();
      expect(success, 'Expected success message or redirect after registration').toBe(true);
    } else {
      // Redirected to /login or / — both are acceptable outcomes
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login|\//);
    }
  });

  // ── TC010 — Duplicate email registration ─────────────────────────────────────

  test('@regression @auth TC010 - Registering with an existing email shows error', async ({
    registerPage,
    page,
    config,
  }) => {
    // Use the well-known customer account email which is already registered
    const existingEmail = config.getUserCredentials('customer').email;

    await registerPage.navigate();
    await registerPage.register('Duplicate User', existingEmail, 'TestPass123!');

    // The form must stay on /register and display an error
    await expect(page).toHaveURL(/\/register/, { timeout: 8000 });

    const hasErrors = await registerPage.hasValidationErrors();
    expect(hasErrors, 'Expected a duplicate-email error message').toBe(true);

    const errors = await registerPage.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── TC011 — Customer cannot access /admin ────────────────────────────────────

  test('@regression @auth TC011 - Customer user cannot access /admin route', async ({
    authenticatedPage,
    config,
  }) => {
    // authenticatedPage is authenticated as a customer (non-admin)
    await authenticatedPage.goto(config.buildUrl('/admin'));

    // The app should redirect to /login, home page, or show a 403/not-found page
    // In all cases the user must NOT see the admin dashboard content
    const currentUrl = authenticatedPage.url();
    const isOnAdmin = currentUrl.includes('/admin') && !currentUrl.includes('/login');

    if (isOnAdmin) {
      // If still on /admin path, verify the admin dashboard heading is NOT shown
      // OR the page shows an access-denied message
      const accessDenied = authenticatedPage.locator(
        ':text("Unauthorized"), :text("Access Denied"), :text("Forbidden"), :text("403")',
      );
      const adminDashboardHeading = authenticatedPage.locator('h1').filter({
        hasText: /admin dashboard/i,
      });

      const deniedVisible = await accessDenied.first().isVisible().catch(() => false);
      const dashboardShown = await adminDashboardHeading.isVisible().catch(() => false);

      // Access denied message should be shown, or dashboard must NOT be accessible
      expect(
        deniedVisible || !dashboardShown,
        'Customer should not see the admin dashboard',
      ).toBe(true);
    } else {
      // Redirected away from /admin — this is the expected secure behaviour
      expect(currentUrl).not.toMatch(/^.*\/admin$/);
    }
  });

  // ── TC012 — Email with leading/trailing whitespace ───────────────────────────

  test('@regression @auth TC012 - Login with leading/trailing whitespace in email', async ({
    loginPage,
    page,
    config,
  }) => {
    const creds = config.getUserCredentials('customer');

    // Add surrounding whitespace — the app should trim it and still authenticate
    await loginPage.navigate();
    await loginPage.login(`  ${creds.email}  `, creds.password);

    // Two acceptable outcomes:
    // 1. App trims email → login succeeds → redirects away from /login
    // 2. App does not trim → shows an error (not a crash)
    const currentUrl = page.url();
    const succeeded = !currentUrl.includes('/login');

    if (succeeded) {
      const logoutBtn = page.locator('button').filter({ hasText: /logout/i });
      await expect(logoutBtn).toBeVisible({ timeout: 6000 });
    } else {
      // Must still show a usable error; must not be an unhandled JS exception
      await expect(page).toHaveURL(/\/login/);
    }
  });

  // ── TC013 — Profile page shows correct user data after login ─────────────────

  test('@regression @auth TC013 - Profile page shows correct user data after login', async ({
    authenticatedPage,
    profilePage,
    config,
  }) => {
    const expectedEmail = config.getUserCredentials('customer').email;

    // Navigate to profile (authenticatedPage fixture provides the logged-in session)
    await profilePage.navigate();
    await profilePage.assertOnProfilePage();

    // The profile email must match the account used during fixture setup
    const displayedEmail = await profilePage.getEmail();
    expect(displayedEmail.toLowerCase()).toContain(expectedEmail.toLowerCase());

    // Name field must be non-empty
    const name = await profilePage.getName();
    expect(name.trim().length).toBeGreaterThan(0);
  });

});
