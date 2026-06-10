/**
 * checkout.smoke.spec.ts — Smoke tests for the checkout flow.
 *
 * Covers the critical happy-path steps: navigating from cart to checkout,
 * filling valid shipping data, placing an order, and confirming the result.
 *
 * Uses the `pageWithCart` fixture (authenticated customer with one item in cart).
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@smoke @checkout Checkout Smoke Tests', () => {

  // TC043 — Logged-in user can navigate from cart to checkout
  test('TC043 - logged-in user can navigate from cart to checkout', async ({
    pageWithCart: page,
    checkoutPage,
  }) => {
    // pageWithCart fixture lands on /cart with one item already in cart
    await expect(page).toHaveURL(/\/cart/);

    // Proceed to checkout
    const cartPage = await import('../../src/pages/CartPage');
    const cart = new cartPage.CartPage(page);
    await cart.proceedToCheckout();

    // Verify we landed on the checkout page
    await checkoutPage.assertOnCheckoutPage();
    await expect(page).toHaveURL(/\/checkout/);
  });

  // TC044 — Checkout form accepts valid shipping data
  test('TC044 - checkout form accepts valid shipping data', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPage = await import('../../src/pages/CartPage');
    const cart = new cartPage.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    // Fill with default valid shipping data
    const shippingData = config.getShippingData();
    await checkoutPage.fillShippingForm(shippingData);

    // No validation errors after filling valid data
    await checkoutPage.assertNoValidationErrors();

    // Place Order button should be enabled
    const isEnabled = await checkoutPage.isPlaceOrderEnabled();
    expect(isEnabled).toBe(true);
  });

  // TC045 — Order is created successfully with valid data
  test('TC045 - order is created successfully with valid data', async ({
    pageWithCart: page,
    checkoutWorkflow,
  }) => {
    const result = await checkoutWorkflow.runFullCheckout(undefined, false);

    expect(result.success).toBe(true);
    expect(result.orderId).toBeTruthy();
    expect(result.orderId.length).toBeGreaterThan(0);
  });

  // TC046 — Order confirmation shows order ID after purchase
  test('TC046 - order confirmation shows order ID after purchase', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();

    await checkoutPage.fillShippingForm(config.getShippingData());
    const orderId = await checkoutPage.placeOrder();

    // Success card and order ID must be visible
    await checkoutPage.assertOrderSuccess();
    expect(orderId).toBeTruthy();
    expect(orderId.length).toBeGreaterThan(0);

    // Confirmation object has both ID and message
    const confirmation = await checkoutPage.getOrderConfirmation();
    expect(confirmation.orderId).toBeTruthy();
    expect(confirmation.message).toBeTruthy();
  });

});
