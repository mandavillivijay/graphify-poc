/**
 * auth.smoke.spec.ts — Smoke tests for the ShopHub authentication flows.
 *
 * Updated for App V2 CHANGE-6: Logout is now inside the user dropdown menu
 * ([data-testid="user-menu-btn"] → [data-testid="user-menu-logout"]).
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

    // V2 CHANGE-6: auth state shown by user-menu-btn in navbar (not a direct logout button)
    const userMenuBtn = page.locator('[data-testid="user-menu-btn"]');
    await expect(userMenuBtn).toBeVisible({ timeout: 8000 });
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

    await expect(page).not.toHaveURL(/\/login/);

    // V2: authenticated state shows the user menu button
    const userMenuBtn = page.locator('[data-testid="user-menu-btn"]');
    await expect(userMenuBtn).toBeVisible({ timeout: 8000 });
  });

  // ── TC003 — Invalid credentials show error ───────────────────────────────────

  test('@smoke @auth TC003 - Login fails with invalid credentials', async ({
    loginPage,
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login('wrong@email.com', 'wrongpassword');

    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error.length).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/login/);
  });

  // ── TC004 — Logout ───────────────────────────────────────────────────────────

  test('@smoke @auth TC004 - User can logout successfully', async ({
    authenticatedPage,
  }) => {
    // V2 CHANGE-6: must open user dropdown before clicking logout
    const userMenuBtn = authenticatedPage.locator('[data-testid="user-menu-btn"]');
    await expect(userMenuBtn).toBeVisible({ timeout: 8000 });
    await userMenuBtn.click();

    const logoutMenuItem = authenticatedPage.locator('[data-testid="user-menu-logout"]');
    await expect(logoutMenuItem).toBeVisible({ timeout: 5000 });
    await logoutMenuItem.click();

    await expect(authenticatedPage).toHaveURL(/\/login|^http:\/\/localhost:3000\/?$/, {
      timeout: 10000,
    });

    // User menu btn must no longer be visible
    await expect(userMenuBtn).toBeHidden({ timeout: 5000 });
  });

  // ── TC005 — Protected routes redirect unauthenticated users ─────────────────

  test('@smoke @auth TC005 - Protected routes redirect to login when unauthenticated', async ({
    page,
    config,
  }) => {
    await page.goto(config.buildUrl('/orders'));
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

});
