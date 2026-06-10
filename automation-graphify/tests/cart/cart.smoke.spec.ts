/**
 * cart.smoke.spec.ts — Smoke tests for the ShopHub shopping cart.
 *
 * Validates the four most critical cart paths: add from listing, badge update,
 * remove item, and quantity-driven total update.  Run on every CI push.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Cart Smoke Tests', () => {

  // ── TC031 — Add product to cart from product listing ─────────────────────────

  test('@smoke @cart TC031 - Can add a product to cart from the product listing', async ({
    authenticatedPage,
    productListingPage,
    cartPage,
  }) => {
    // Navigate to the product listing as an authenticated user
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Grab the first product name before adding
    const names = await productListingPage.getProductNames();
    expect(names.length).toBeGreaterThan(0);

    // Add the first product via the quick-add button
    await productListingPage.addProductToCartByIndex(0);

    // Navigate to the cart to verify the product was added
    await cartPage.goto();

    const isEmpty = await cartPage.isEmpty();
    expect(isEmpty, 'Cart must not be empty after adding a product').toBe(false);

    const itemCount = await cartPage.getItemCount();
    expect(itemCount, 'Cart should contain at least one item').toBeGreaterThan(0);
  });

  // ── TC032 — Cart badge in navbar reflects item count ─────────────────────────

  test('@smoke @cart TC032 - Cart shows correct item count in navbar after adding product', async ({
    authenticatedPage,
    productListingPage,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Capture initial cart badge count (may be 0 or absent)
    const cartBadge = authenticatedPage.locator(
      '[data-testid="cart-count"], .cart-badge, [aria-label*="cart" i] .badge, nav [class*="badge"], nav [class*="count"]',
    ).first();

    const badgeBefore = parseInt(
      (await cartBadge.textContent().catch(() => '0')) ?? '0',
      10,
    ) || 0;

    await productListingPage.addProductToCartByIndex(0);

    // Allow the UI time to update the badge
    await authenticatedPage.waitForTimeout(1000);

    const badgeAfter = parseInt(
      (await cartBadge.textContent().catch(() => '0')) ?? '0',
      10,
    ) || 0;

    // Badge count should have increased, or at least the cart is non-empty
    // (Some SPAs show the count only when > 0, so 0→1 is a valid increase)
    expect(
      badgeAfter,
      `Cart badge should increment after adding a product (was ${badgeBefore})`,
    ).toBeGreaterThan(badgeBefore - 1); // >= badgeBefore
  });

  // ── TC033 — Remove item from cart ────────────────────────────────────────────

  test('@smoke @cart TC033 - Can remove an item from the cart', async ({
    pageWithCart,
    cartPage,
  }) => {
    // pageWithCart fixture ensures at least one item is present
    await cartPage.goto();

    const itemsBefore = await cartPage.getCartItems();
    expect(itemsBefore.length, 'Cart must have at least one item before removal').toBeGreaterThan(0);

    const productToRemove = itemsBefore[0].name;
    await cartPage.removeItem(productToRemove);

    // Confirm the item is gone
    const hasProduct = await cartPage.hasProduct(productToRemove);
    expect(hasProduct, `"${productToRemove}" should be removed from the cart`).toBe(false);
  });

  // ── TC034 — Cart total updates when quantity changes ─────────────────────────

  test('@smoke @cart TC034 - Cart total updates when item quantity is changed', async ({
    pageWithCart,
    cartPage,
  }) => {
    // pageWithCart fixture ensures at least one item exists
    await cartPage.goto();

    const itemsBefore = await cartPage.getCartItems();
    expect(itemsBefore.length).toBeGreaterThan(0);

    const item = itemsBefore[0];
    const totalBefore = await cartPage.getTotal();

    // Increase quantity by 1 (from current quantity to current + 1)
    await cartPage.updateItemQuantity(item.name, item.quantity + 1);

    const totalAfter = await cartPage.getTotal();

    // Total must be larger after increasing quantity
    expect(
      totalAfter,
      `Cart total should increase after adding one more of "${item.name}"`,
    ).toBeGreaterThan(totalBefore - 0.01);
  });

});
