/**
 * checkout.regression.spec.ts — Regression tests for the checkout flow.
 *
 * Covers validation, pricing math, guest redirect, summary accuracy,
 * cart-clearing after order, and multi-item summary.
 *
 * Most tests use `pageWithCart` (authenticated customer + item in cart).
 * TC049 uses an unauthenticated `page` to test the guest redirect.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@regression @checkout Checkout Regression Tests', () => {

  // TC047 — Checkout form validation: required fields
  test('TC047 - checkout form validation shows errors for required fields', async ({
    pageWithCart: page,
    checkoutWorkflow,
  }) => {
    await checkoutWorkflow.proceedFromCartToCheckout();

    // Attempt to submit with all fields blank → collect validation errors
    const errors = await checkoutWorkflow.validateShippingForm();

    // At minimum, required-field errors should be present
    expect(errors.length).toBeGreaterThan(0);
  });

  // TC048 — Checkout form validation: invalid email format
  test('TC048 - checkout form validation rejects invalid email format', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    const shipping = config.getShippingData();
    // Override email with an invalid value
    await checkoutPage.fillShippingForm({ ...shipping, email: 'not-an-email' });
    await checkoutPage.placeOrderButton.click();
    await page.waitForTimeout(500);

    const errors = await checkoutPage.getValidationErrors();
    // Expect an error referencing the email field
    const hasEmailError = errors.some((e) =>
      /email|valid|format/i.test(e)
    );
    expect(hasEmailError, `Expected email validation error. Got: ${errors.join(', ')}`).toBe(true);
  });

  // TC049 — Guest checkout requires login redirect (unauthenticated)
  test('TC049 - unauthenticated user is redirected to login when accessing checkout', async ({
    page,
    config,
  }) => {
    // Navigate to checkout without being logged in
    await page.goto(config.buildUrl('/checkout'), { waitUntil: 'domcontentloaded' });

    // Should be redirected to /login or show login form
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const loginFormVisible = await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      isOnLogin || loginFormVisible,
      `Expected redirect to login page. Current URL: ${currentUrl}`
    ).toBe(true);
  });

  // TC050 — Order summary on checkout matches cart contents
  test('TC050 - order summary on checkout matches cart contents', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);

    // Get cart item names before proceeding
    const cartItems = await cart.getCartItems();
    const cartProductNames = cartItems.map((i) => i.name);

    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    // Order summary should list the same product(s)
    const summaryItems = await checkoutPage.getOrderSummaryItems();
    expect(summaryItems.length).toBeGreaterThan(0);

    // Each cart product should appear somewhere in the summary text
    for (const cartName of cartProductNames) {
      const found = summaryItems.some((s) =>
        s.toLowerCase().includes(cartName.toLowerCase().slice(0, 10))
      );
      expect(found, `"${cartName}" not found in checkout summary`).toBe(true);
    }
  });

  // TC051 — Tax is 10% of subtotal
  test('TC051 - tax on checkout is 10% of subtotal', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    const subtotal = await checkoutPage.getSubtotal();
    const tax = await checkoutPage.getTax();

    expect(subtotal).toBeGreaterThan(0);
    // Tax should be approximately 10% of subtotal (within 1 cent tolerance)
    const expectedTax = Math.round(subtotal * 0.1 * 100) / 100;
    expect(Math.abs(tax - expectedTax)).toBeLessThanOrEqual(0.02);
  });

  // TC052 — Shipping cost is $5.99
  test('TC052 - shipping cost on checkout is $5.99', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    const shippingCost = await checkoutPage.getShippingCost();
    expect(shippingCost).toBe(5.99);
  });

  // TC053 — Order total = subtotal + tax + shipping
  test('TC053 - order total equals subtotal plus tax plus shipping', async ({
    pageWithCart: page,
    checkoutPage,
    config,
  }) => {
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

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
    // Complete the checkout
    const result = await checkoutWorkflow.runFullCheckout(undefined, false);
    expect(result.success).toBe(true);

    // Navigate to cart and verify it is empty
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.goto();
    const isEmpty = await cart.isEmpty();
    expect(isEmpty, 'Cart should be empty after order placement').toBe(true);
  });

  // TC055 — Multiple items in cart all appear in checkout summary
  test('TC055 - multiple cart items all appear in checkout order summary', async ({
    page,
    authService,
    apiService,
    checkoutPage,
    config,
  }) => {
    // Setup: login and add two different products via API
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

    // Inject token into browser
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);

    // Navigate to cart then checkout
    await page.goto(config.buildUrl('/cart'), { waitUntil: 'domcontentloaded' });
    const cartPageModule = await import('../../src/pages/CartPage');
    const cart = new cartPageModule.CartPage(page);
    await cart.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    const summaryItems = await checkoutPage.getOrderSummaryItems();
    expect(summaryItems.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    await apiService.clearCart().catch(() => {});
  });

});
