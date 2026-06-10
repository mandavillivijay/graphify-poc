/**
 * admin.smoke.spec.ts — Smoke tests for the admin dashboard.
 *
 * Verifies that an admin user can access /admin, that a non-admin user
 * is blocked, and that the product list is visible on the dashboard.
 *
 * Uses the `adminPage` fixture for TC065 and TC067.
 * TC066 uses the `authenticatedPage` (customer) fixture.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@smoke @admin Admin Smoke Tests', () => {

  // TC065 — Admin can access admin dashboard
  test('TC065 - admin user can access the admin dashboard', async ({
    adminPage: page,
    adminDashboardPage,
  }) => {
    // adminPage fixture already navigates to /admin
    await expect(page).toHaveURL(/\/admin/);
    await adminDashboardPage.assertOnAdminPage();

    // Page heading should be visible
    await expect(adminDashboardPage.pageHeading).toBeVisible();
  });

  // TC066 — Non-admin user cannot access /admin
  test('TC066 - non-admin customer user cannot access /admin route', async ({
    authenticatedPage: page,
    config,
  }) => {
    // Navigate directly to /admin as a customer
    await page.goto(config.buildUrl('/admin'), { waitUntil: 'domcontentloaded' });

    const currentUrl = page.url();

    // Either redirected away from /admin or an access-denied message is shown
    const isRedirected = !currentUrl.endsWith('/admin') && !currentUrl.includes('/admin?');
    const accessDeniedVisible = await page
      .locator('h1, h2, h3, p')
      .filter({ hasText: /forbidden|unauthorized|access denied|not allowed/i })
      .first()
      .isVisible()
      .catch(() => false);
    const redirectedToHome = currentUrl === config.getBaseUrl() + '/' || currentUrl === config.getBaseUrl();

    expect(
      isRedirected || accessDeniedVisible || redirectedToHome,
      `Customer should not be able to access /admin. Current URL: ${currentUrl}`
    ).toBe(true);
  });

  // TC067 — Admin dashboard shows product list
  test('TC067 - admin dashboard displays the product list', async ({
    adminPage: page,
    adminDashboardPage,
  }) => {
    // Navigate to the Products tab
    await adminDashboardPage.switchToProductsTab();

    // Product rows should be visible
    const rowCount = await adminDashboardPage.getProductRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

});
