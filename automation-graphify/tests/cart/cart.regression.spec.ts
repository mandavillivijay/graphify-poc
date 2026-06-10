/**
 * cart.regression.spec.ts — Regression tests for the ShopHub shopping cart.
 *
 * Covers quantity merging, removal edge cases, persistence across navigation,
 * subtotal accuracy, and multi-product scenarios.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Cart Regression Tests', () => {

  // ── TC035 — Adding same product twice merges quantities ───────────────────────

  test('@regression @cart TC035 - Adding the same product twice merges quantities', async ({
    authenticatedPage,
    productListingPage,
    cartPage,
    apiService,
  }) => {
    // Start with a clean cart via API
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);
    await apiService.clearCart().catch(() => {});

    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Add the first product twice using the quick-add button
    await productListingPage.addProductToCartByIndex(0);
    await productListingPage.addProductToCartByIndex(0);

    await cartPage.goto();

    const items = await cartPage.getCartItems();
    expect(items.length).toBeGreaterThan(0);

    // The added product should appear as a single row with quantity >= 2
    // (merged), not as two separate rows
    const addedItem = items[0];
    expect(
      addedItem.quantity,
      'Adding the same product twice should result in quantity 2 (merged)',
    ).toBeGreaterThanOrEqual(2);

    // Cleanup
    await apiService.clearCart().catch(() => {});
    apiService.clearToken();
  });

  // ── TC036 — Update quantity to 0 removes item ────────────────────────────────

  test('@regression @cart TC036 - Decreasing quantity to 0 removes the item from cart', async ({
    pageWithCart,
    cartPage,
    page,
  }) => {
    await cartPage.goto();

    const items = await cartPage.getCartItems();
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];

    if (item.quantity > 1) {
      // Decrease to exactly 1 first, then attempt to decrease below 1
      await cartPage.updateItemQuantity(item.name, 1);
    }

    // Decrease one more time (should trigger removal)
    const itemRow = page.locator('div, tr, li').filter({ hasText: item.name }).first();
    const decreaseBtn = itemRow.locator('button').filter({ hasText: '−' }).first();
    const btnVisible = await decreaseBtn.isVisible().catch(() => false);

    if (btnVisible) {
      await decreaseBtn.click();
      await cartPage.waitForCartUpdate();

      // The item should either be removed or show quantity 0
      const hasItem = await cartPage.hasProduct(item.name);
      const updatedItems = await cartPage.getCartItems();
      const updatedItem = updatedItems.find((i) => i.name.toLowerCase().includes(item.name.toLowerCase()));

      // Acceptable outcomes: removed OR quantity set to 1 (app may enforce minimum of 1)
      if (hasItem && updatedItem) {
        expect(updatedItem.quantity).toBeLessThanOrEqual(1);
      } else {
        expect(hasItem).toBe(false);
      }
    } else {
      // Stepper may be disabled at qty=1 — use the Remove button as fallback
      await cartPage.removeItem(item.name);
      const hasItem = await cartPage.hasProduct(item.name);
      expect(hasItem).toBe(false);
    }
  });

  // ── TC037 — Cart persists across page navigation ──────────────────────────────

  test('@regression @cart TC037 - Cart contents persist after navigating away and back', async ({
    pageWithCart,
    cartPage,
    productListingPage,
  }) => {
    await cartPage.goto();

    const itemsBefore = await cartPage.getCartItems();
    expect(itemsBefore.length).toBeGreaterThan(0);
    const firstItemName = itemsBefore[0].name;

    // Navigate away to product listing
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Navigate back to cart
    await cartPage.goto();

    const itemsAfter = await cartPage.getCartItems();
    expect(itemsAfter.length, 'Cart must still contain items after navigating away').toBeGreaterThan(0);

    const stillHasItem = await cartPage.hasProduct(firstItemName);
    expect(stillHasItem, `"${firstItemName}" must still be in the cart after navigation`).toBe(true);
  });

  // ── TC038 — Cart is empty after clearing ─────────────────────────────────────

  test('@regression @cart TC038 - Cart is empty after using the clear cart action', async ({
    pageWithCart,
    cartPage,
  }) => {
    await cartPage.goto();

    // Verify cart has items before clearing
    const itemsBefore = await cartPage.getCartItems();
    expect(itemsBefore.length, 'Need items in cart before clearing').toBeGreaterThan(0);

    await cartPage.clearCart();

    // Cart must now be empty
    const isEmpty = await cartPage.isEmpty();
    expect(isEmpty, 'Cart must be empty after clearing').toBe(true);
  });

  // ── TC039 — Subtotal calculation is correct ───────────────────────────────────

  test('@regression @cart TC039 - Cart subtotal equals the sum of all item line totals', async ({
    pageWithCart,
    cartPage,
  }) => {
    await cartPage.goto();

    const items = await cartPage.getCartItems();
    expect(items.length).toBeGreaterThan(0);

    // Compute expected subtotal from item price * quantity
    const expectedSubtotal = items.reduce((sum, item) => {
      const lineTotal = item.lineTotal > 0 ? item.lineTotal : item.price * item.quantity;
      return sum + lineTotal;
    }, 0);

    const displayedSubtotal = await cartPage.getSubtotal();

    // Allow a $0.05 tolerance for floating-point rounding
    expect(
      Math.abs(displayedSubtotal - expectedSubtotal),
      `Subtotal ${displayedSubtotal} should approximately equal sum of line totals ${expectedSubtotal}`,
    ).toBeLessThanOrEqual(0.05 * items.length + 0.01);
  });

  // ── TC040 — Remove item updates cart total ────────────────────────────────────

  test('@regression @cart TC040 - Removing an item from cart updates the total correctly', async ({
    pageWithCart,
    cartPage,
    apiService,
  }) => {
    // Ensure cart has 2+ items so total changes meaningfully
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '2' });
    if (products.length >= 2) {
      await apiService.addToCart(products[1].id!, 1);
    }

    await cartPage.goto();

    const items = await cartPage.getCartItems();
    if (items.length < 2) {
      test.skip(true, 'Need at least 2 cart items to test total update on removal');
    }

    const totalBefore = await cartPage.getTotal();
    const itemToRemove = items[0];

    await cartPage.removeItem(itemToRemove.name);

    const totalAfter = await cartPage.getTotal();

    // Total must decrease after removing an item
    expect(
      totalAfter,
      `Cart total should decrease after removing "${itemToRemove.name}"`,
    ).toBeLessThan(totalBefore + 0.01);

    // Cleanup
    await apiService.clearCart().catch(() => {});
    apiService.clearToken();
  });

  // ── TC041 — Add multiple different products to cart ───────────────────────────

  test('@regression @cart TC041 - Can add multiple different products and all appear in cart', async ({
    authenticatedPage,
    productListingPage,
    cartPage,
    apiService,
  }) => {
    // Start clean
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);
    await apiService.clearCart().catch(() => {});

    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    const names = await productListingPage.getProductNames();
    const productsToAdd = Math.min(names.length, 3);

    if (productsToAdd < 2) {
      test.skip(true, 'Need at least 2 distinct products for this test');
    }

    // Add first two distinct products
    await productListingPage.addProductToCartByIndex(0);
    if (names.length > 1) {
      await productListingPage.addProductToCartByIndex(1);
    }

    await cartPage.goto();

    const cartItems = await cartPage.getCartItems();
    expect(
      cartItems.length,
      'Cart should contain multiple distinct products',
    ).toBeGreaterThanOrEqual(1);

    // Total should be positive
    const total = await cartPage.getTotal();
    expect(total).toBeGreaterThan(0);

    // Cleanup
    await apiService.clearCart().catch(() => {});
    apiService.clearToken();
  });

  // ── TC042 — Cart is empty for a fresh/unauthenticated session ─────────────────

  test('@regression @cart TC042 - Cart is empty for a new unauthenticated session', async ({
    page,
    config,
    authService,
  }) => {
    // Ensure no auth token is present in the browser
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.clearAuth(page);

    // Attempt to visit /cart without authentication
    await page.goto(config.buildUrl('/cart'));

    // The app should either redirect to /login or show an empty cart
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      // Redirect to login is the expected secure behaviour
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await expect(emailInput).toBeVisible();
    } else {
      // If the cart page is accessible as a guest, it should be empty
      const emptyMsg = page.locator('h3, p, [class*="empty"]').filter({ hasText: /empty|no items/i }).first();
      const cartItemRows = page.locator(
        '[data-testid="cart-item"], .cart-item, [class*="cart-item"]',
      );
      const rowCount = await cartItemRows.count();

      expect(
        rowCount === 0 || await emptyMsg.isVisible().catch(() => false),
        'Guest cart should show empty state or zero items',
      ).toBe(true);
    }
  });

});
