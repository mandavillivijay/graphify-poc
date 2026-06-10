/**
 * checkout.regression.spec.ts — Regression tests for the V2 3-step checkout.
 *
 * V2 CHANGE-2: Checkout is a 3-step wizard. Tests that check the order summary
 * or place an order must navigate through all 3 steps.
 *
 * V2 CHANGE-4: /checkout is no longer a ProtectedRoute — guest checkout exists.
 * TC049 is updated to verify guest checkout is accessible (not a redirect).
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@regression @checkout Checkout Regression Tests', () => {

  // TC047 — Checkout form validation: required fields (Step 1)
  test('TC047 - checkout form validation shows errors for required fields', async ({
    pageWithCart: page,
    checkoutWorkflow,
  }) => {
    await checkoutWorkflow.proceedFromCartToCheckout();
    // validateShippingForm submits Step 1 with blanks and returns errors
    const errors = await checkoutWorkflow.validateShippingForm();
    expect(errors.length).toBeGreaterThan(0);
  });

  // TC048 — Checkout form validation: invalid email format (Step 1)
  test('TC048 - checkout form validation rejects invalid email format', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnStep(1);

    const shipping = config.getShippingData();
    await checkoutPage.fillShippingForm({ ...shipping, email: 'not-an-email' });
    // In V2, clicking Continue on Step 1 triggers step 1 validation
    await checkoutPage.step1ContinueButton.click();
    await page.waitForTimeout(500);

    const errors = await checkoutPage.getValidationErrors();
    const hasEmailError = errors.some((e) => /email|valid|format/i.test(e));
    expect(hasEmailError, `Expected email validation error. Got: ${errors.join(', ')}`).toBe(true);
  });

  // TC049 — V2: /checkout is accessible without login (guest checkout support)
  test('TC049 - unauthenticated user can access checkout as guest (CHANGE-4)', async ({
    page,
    config,
  }) => {
    // V2 CHANGE-4: /checkout is no longer a ProtectedRoute
    await page.goto(config.buildUrl('/checkout'), { waitUntil: 'domcontentloaded' });

    // Should NOT redirect to /login — should show the checkout page with guest toggle
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });

    // Guest checkout toggle should be visible for unauthenticated users
    const guestToggle = page.locator('[data-testid="checkout-mode-toggle"], [data-testid="checkout-as-guest-btn"]');
    const hasGuestOption = await guestToggle.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasGuestOption, 'Expected guest checkout toggle to be visible').toBe(true);
  });

  // TC050 — Order summary on checkout Step 3 matches cart contents
  test('TC050 - order summary on checkout matches cart contents', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    const cartItems = await cart.getCartItems();
    const cartProductNames = cartItems.map((i) => i.name);

    await cart.proceedToCheckout();

    // V2: navigate through all 3 steps to reach the summary on Step 3
    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();
    await checkoutPage.assertOnStep(3);

    const summaryItems = await checkoutPage.getOrderSummaryItems();
    expect(summaryItems.length).toBeGreaterThan(0);

    for (const cartName of cartProductNames) {
      const found = summaryItems.some((s) =>
        s.toLowerCase().includes(cartName.toLowerCase().slice(0, 10))
      );
      expect(found, `"${cartName}" not found in checkout summary`).toBe(true);
    }
  });

  // TC051 — Tax is 10% of subtotal (checked on Step 3)
  test('TC051 - tax on checkout is 10% of subtotal', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();

    // Navigate to Step 3 for order summary
    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();
    await checkoutPage.assertOnStep(3);

    const subtotal = await checkoutPage.getSubtotal();
    const tax = await checkoutPage.getTax();

    expect(subtotal).toBeGreaterThan(0);
    const expectedTax = Math.round(subtotal * 0.1 * 100) / 100;
    expect(Math.abs(tax - expectedTax)).toBeLessThanOrEqual(0.02);
  });

  // TC052 — Shipping cost is $5.99 (checked on Step 3)
  test('TC052 - shipping cost on checkout is $5.99', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();

    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();

    const shippingCost = await checkoutPage.getShippingCost();
    expect(shippingCost).toBe(5.99);
  });

  // TC053 — Order total = subtotal + tax + shipping (Step 3)
  test('TC053 - order total equals subtotal plus tax plus shipping', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();

    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();

    const subtotal = await checkoutPage.getSubtotal();
    const tax = await checkoutPage.getTax();
    const shipping = await checkoutPage.getShippingCost();
    const total = await checkoutPage.getOrderTotal();

    const expectedTotal = Math.round((subtotal + tax + shipping) * 100) / 100;
    expect(Math.abs(total - expectedTotal)).toBeLessThanOrEqual(0.05);
  });

  // TC054 — Cart is cleared after successful order
  test('TC054 - cart is cleared after successful order placement', async ({
    pageWithCart: page,
    checkoutWorkflow,
    config,
  }) => {
    const result = await checkoutWorkflow.runFullCheckout(undefined, false);
    expect(result.success).toBe(true);

    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.goto();
    const isEmpty = await cart.isEmpty();
    expect(isEmpty, 'Cart should be empty after order placement').toBe(true);
  });

  // TC055 — Multiple items in cart all appear in checkout summary (Step 3)
  test('TC055 - multiple cart items all appear in checkout order summary', async ({
    page,
    authService,
    apiService,
    checkoutPage,
    config,
  }) => {
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);
    await apiService.clearCart().catch(() => {});

    const products = await apiService.getProducts({ in_stock: 'true', limit: '5' });
    if (products.length < 2) {
      test.skip(true, 'Not enough in-stock products to run multi-item test');
      return;
    }

    await apiService.addToCart(products[0].id!, 1);
    await apiService.addToCart(products[1].id!, 1);

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await page.goto(config.buildUrl('/cart'), { waitUntil: 'domcontentloaded' });

    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();

    // Navigate through all 3 steps
    await checkoutPage.fillShippingForm(config.getShippingData());
    await checkoutPage.continueToStep2();
    await checkoutPage.fillPaymentForm();
    await checkoutPage.continueToStep3();
    await checkoutPage.assertOnStep(3);

    const summaryItems = await checkoutPage.getOrderSummaryItems();
    expect(summaryItems.length).toBeGreaterThanOrEqual(2);

    await apiService.clearCart().catch(() => {});
  });

});
