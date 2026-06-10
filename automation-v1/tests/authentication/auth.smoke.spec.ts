/**
 * auth.smoke.spec.ts — Smoke tests for the ShopHub authentication flows.
 *
 * These tests verify the core, happy-path and basic error-path behaviour of
 * login, logout, and protected-route redirection.  Run on every CI push.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Authentication Smoke Tests', () => {

  // ── TC001 — Customer login (happy path) ─────────────────────────────────────

  test('@smoke @auth TC001 - Customer can login with valid credentials', async ({
    loginPage,
    page,
    config,
  }) => {
    const creds = config.getUserCredentials('customer');

    await loginPage.navigate();
    await loginPage.login(creds.email, creds.password);

    // Should redirect away from /login after successful authentication
    await expect(page).not.toHaveURL(/\/login/);

    // The logout button proves the session is active in the navbar
    const logoutBtn = page.locator('button').filter({ hasText: /logout/i });
    await expect(logoutBtn).toBeVisible({ timeout: 8000 });
  });

  // ── TC002 — Admin login (happy path) ────────────────────────────────────────

  test('@smoke @auth TC002 - Admin can login with valid credentials', async ({
    loginPage,
    page,
    config,
  }) => {
    const creds = config.getUserCredentials('admin');

    await loginPage.navigate();
    await loginPage.login(creds.email, creds.password);

    // Admin is redirected away from /login
    await expect(page).not.toHaveURL(/\/login/);

    // Navbar shows an authenticated state
    const logoutBtn = page.locator('button').filter({ hasText: /logout/i });
    await expect(logoutBtn).toBeVisible({ timeout: 8000 });
  });

  // ── TC003 — Invalid credentials show error ───────────────────────────────────

  test('@smoke @auth TC003 - Login fails with invalid credentials', async ({
    loginPage,
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login('wrong@email.com', 'wrongpassword');

    // An error/alert element must appear
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error.length).toBeGreaterThan(0);

    // Must stay on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  // ── TC004 — Logout ───────────────────────────────────────────────────────────

  test('@smoke @auth TC004 - User can logout successfully', async ({
    authenticatedPage,
  }) => {
    // authenticatedPage fixture delivers a pre-authenticated customer session
    const logoutBtn = authenticatedPage.locator('button').filter({ hasText: /logout/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 8000 });

    await logoutBtn.click();

    // After logout the app must redirect to /login or to the home page root
    await expect(authenticatedPage).toHaveURL(/\/login|^http:\/\/localhost:3000\/?$/, {
      timeout: 10000,
    });

    // Logout button must no longer be visible
    await expect(logoutBtn).toBeHidden({ timeout: 5000 });
  });

  // ── TC005 — Protected routes redirect unauthenticated users ─────────────────

  test('@smoke @auth TC005 - Protected routes redirect to login when unauthenticated', async ({
    page,
    config,
  }) => {
    // Navigate without any auth token in the session
    await page.goto(config.buildUrl('/orders'));

    // The app must redirect to the login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Login form must be rendered so the user can authenticate
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

});
