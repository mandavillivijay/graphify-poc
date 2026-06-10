/**
 * checkout.smoke.spec.ts — Smoke tests for the V2 3-step checkout wizard.
 *
 * V2 CHANGE-2: Checkout is now 3 steps:
 *   Step 1 (Shipping) → Step 2 (Payment) → Step 3 (Review + Place Order)
 * Tests must navigate through all steps.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@smoke @checkout Checkout Smoke Tests', () => {

  // TC043 — Logged-in user can navigate from cart to checkout
  test('TC043 - logged-in user can navigate from cart to checkout', async ({
    pageWithCart: page,
    checkoutPage,
  }) => {
    await expect(page).toHaveURL(/\/cart/);

    const cartPage = await import('../../src/pages/CartPage');
    const cart = new cartPage.CartPage(page);
    await cart.proceedToCheckout();

    // V2: assertOnCheckoutPage checks step 1 container is visible
    await checkoutPage.assertOnCheckoutPage();
    await expect(page).toHaveURL(/\/checkout/);
    // Step indicator confirms we're in the wizard
    await expect(checkoutPage.stepIndicator).toBeVisible();
  });

  // TC044 — Checkout form accepts valid shipping data and continues to step 2
  test('TC044 - checkout form accepts valid shipping data', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPage = await import('../../src/pages/CartPage');
    const cart = new cartPage.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnStep(1);

    const shippingData = config.getShippingData();
    await checkoutPage.fillShippingForm(shippingData);
    // In V2, continue to step 2 after filling shipping
    await checkoutPage.continueToStep2();
    await checkoutPage.assertOnStep(2);

    // Fill payment and continue to step 3
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();
    await checkoutPage.assertOnStep(3);

    // Place Order button on Step 3 should be enabled
    const isEnabled = await checkoutPage.isPlaceOrderEnabled();
    expect(isEnabled).toBe(true);
  });

  // TC045 — Order is created successfully with valid data
  test('TC045 - order is created successfully with valid data', async ({
    pageWithCart: page,
    checkoutWorkflow,
  }) => {
    // runFullCheckout handles all 3 steps
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

    // V2: go through all 3 steps
    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();

    const orderId = await checkoutPage.placeOrder();

    await checkoutPage.assertOrderSuccess();
    expect(orderId).toBeTruthy();
    expect(orderId.length).toBeGreaterThan(0);

    const confirmation = await checkoutPage.getOrderConfirmation();
    expect(confirmation.orderId).toBeTruthy();
    expect(confirmation.message).toBeTruthy();
  });

});
