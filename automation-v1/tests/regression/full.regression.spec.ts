/**
 * full.regression.spec.ts — Consolidated cross-feature regression suite.
 *
 * Covers the major user journeys that span multiple features:
 *   1. Browsing products without authentication
 *   2. Full login → add to cart → checkout → verify order journey
 *   3. Cart state preserved after login
 *   4. Profile update persists across page loads
 *   5. Admin product changes are visible in the customer catalog
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@regression Cross-Feature Regression Tests', () => {

  // ── RF001 — User can browse products without authentication ────────────────
  test('@regression @catalog RF001 - unauthenticated user can browse product catalog', async ({
    page,
    productListingPage,
    config,
  }) => {
    // Navigate without any authentication
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });

    await productListingPage.waitForProducts();
    const productCount = await productListingPage.getProductCount();

    expect(productCount).toBeGreaterThan(0);

    // Should be able to navigate to a product detail page
    await productListingPage.clickProductByIndex(0);
    const productDetailModule = await import('../../src/pages/ProductDetailPage');
    const detail = new productDetailModule.ProductDetailPage(page);
    await expect(detail.productName).toBeVisible();

    const name = await detail.getProductName();
    expect(name.length).toBeGreaterThan(0);
  });

  // ── RF002 — Full journey: login, add to cart, checkout, verify order ───────
  test('@regression @checkout @orders RF002 - full login → checkout → order verification journey', async ({
    page,
    authService,
    shoppingJourney,
    orderHistoryPage,
  }) => {
    // Login via API token injection
    await authService.setupCustomerSession(page);

    // Complete a full shopping journey
    const result = await shoppingJourney.completeShoppingJourney({
      loginFirst: false,
      searchTerm: 'Laptop',
      quantity: 1,
    });

    expect(result.success, `Journey failed: ${result.message}`).toBe(true);
    expect(result.orderId).toBeTruthy();

    // Verify the order appears in history
    await orderHistoryPage.goto();
    const orderCount = await orderHistoryPage.getOrderCount();
    expect(orderCount).toBeGreaterThan(0);

    await orderHistoryPage.assertHasOrder(result.orderId);
  });

  // ── RF003 — Cart state preserved after login ───────────────────────────────
  test('@regression @cart @auth RF003 - cart contents are preserved after user logs in', async ({
    page,
    apiService,
    authService,
    config,
  }) => {
    // Step 1: Add a product to cart as a guest (can't do anonymous cart in most
    // implementations, so we simulate by adding via API then checking the UI)
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);
    await apiService.clearCart().catch(() => {});

    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    const product = products[0];
    await apiService.addToCart(product.id!, 1);

    // Step 2: Inject token into browser (simulates post-login state)
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);

    // Step 3: Navigate to cart — the item added via API should still be there
    await page.goto(config.buildUrl('/cart'), { waitUntil: 'domcontentloaded' });

    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    const isEmpty = await cart.isEmpty();
    expect(isEmpty, 'Cart should not be empty after login').toBe(false);

    const hasProduct = await cart.hasProduct(product.name);
    expect(hasProduct, `Expected "${product.name}" in cart after login`).toBe(true);

    // Cleanup
    await apiService.clearCart().catch(() => {});
  });

  // ── RF004 — Profile update persists ───────────────────────────────────────
  test('@regression @auth RF004 - profile update persists across page reload', async ({
    authenticatedPage: page,
    profilePage,
    config,
  }) => {
    await profilePage.goto();

    const updatedPhone = `555-${Date.now().toString().slice(-7)}`;
    await profilePage.fillPhone(updatedPhone);
    await profilePage.save();

    // Verify success feedback
    const successVisible = await profilePage.successMessage.isVisible().catch(() => false);
    // Some apps show a toast that disappears quickly; reload to confirm persistence
    if (!successVisible) {
      await page.waitForTimeout(800);
    }

    // Reload the profile page and confirm the phone persists
    await page.goto(config.buildUrl('/profile'), { waitUntil: 'domcontentloaded' });
    await profilePage.waitForPageLoad();

    const savedPhone = await profilePage.getPhone();
    // Compare the digit-only portions to avoid formatting differences
    const savedDigits = savedPhone.replace(/\D/g, '');
    const expectedDigits = updatedPhone.replace(/\D/g, '');
    expect(savedDigits).toContain(expectedDigits.slice(-7));
  });

  // ── RF005 — Admin product changes visible in customer catalog ─────────────
  test('@regression @admin @catalog RF005 - admin-added product is visible in customer catalog', async ({
    page,
    apiService,
    authService,
    productListingPage,
    config,
  }) => {
    // Admin creates a product via API
    await apiService.loginAsAdmin();
    const productName = `Catalog Visibility Test ${Date.now()}`;
    const created = await apiService.createProduct({
      name: productName,
      price: 49.99,
      category: 'Electronics',
      description: 'Cross-feature regression test product',
      stockQuantity: 10,
      isActive: true,
    });

    // Switch to customer and search for the new product
    const customerToken = await apiService.loginAsCustomer();
    apiService.setToken(customerToken);
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, customerToken);
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });

    await productListingPage.search(productName);
    await productListingPage.waitForProducts();

    const count = await productListingPage.getProductCount();
    expect(
      count,
      `Expected to find "${productName}" in catalog but got ${count} results`
    ).toBeGreaterThan(0);

    // Cleanup: delete the test product via admin API
    await apiService.loginAsAdmin();
    await apiService.deleteProduct(created.id!);
  });

});
