/**
 * critical.smoke.spec.ts — Consolidated critical-path smoke suite.
 *
 * These three tests represent the absolute minimum signal for a healthy
 * deployment: full shopping journey, product search + cart, and API health.
 * Run these after every deployment or as a pre-merge gate.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Critical Path Smoke Tests', () => {

  test('@smoke @critical CS001 - End-to-end shopping journey', async ({
    page,
    authService,
    shoppingJourney,
  }) => {
    // Setup: login as customer
    await authService.setupCustomerSession(page);

    // Execute: complete shopping journey
    const result = await shoppingJourney.completeShoppingJourney({
      loginFirst: false,
      searchTerm: 'Laptop',
      quantity: 1,
    });

    // Assert: order was placed
    expect(result.success).toBe(true);
    expect(result.orderId).toBeTruthy();
  });

  test('@smoke @critical CS002 - Product search and add to cart', async ({
    authenticatedPage: page,
    productListingPage,
  }) => {
    await productListingPage.navigate();
    await productListingPage.search('Laptop');
    await productListingPage.waitForProducts();
    const count = await productListingPage.getProductCount();
    expect(count).toBeGreaterThan(0);
  });

  test('@smoke @critical CS003 - API health check', async ({ apiService }) => {
    const products = await apiService.getProducts();
    expect(products.length).toBeGreaterThan(0);
  });

});
