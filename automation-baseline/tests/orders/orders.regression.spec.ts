/**
 * orders.regression.spec.ts — Regression tests for order history and order detail.
 *
 * Covers empty-state for new users, multiple orders in history,
 * shipping address accuracy, cost breakdown, item matching, and initial status.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@regression @orders Order Regression Tests', () => {

  // TC059 — Order history is empty for a new user
  test('TC059 - order history is empty for a brand-new user', async ({
    page,
    authService,
    apiService,
    orderHistoryPage,
    config,
  }) => {
    // Register a new unique user via the UI or API, then check orders
    const timestamp = Date.now();
    const newEmail = `testuser_${timestamp}@regression.test`;
    const registerPage = await import('../../src/pages/RegisterPage');
    const reg = new registerPage.RegisterPage(page);

    await reg.navigate();
    await reg.registerWithData({
      name: `Test User ${timestamp}`,
      email: newEmail,
      password: 'Password123!',
    });

    // After registration the user might be redirected; navigate to /orders
    await page.goto(config.buildUrl('/orders'), { waitUntil: 'domcontentloaded' });
    await orderHistoryPage.waitForPageLoad();

    const isEmpty = await orderHistoryPage.isEmpty();
    expect(isEmpty, 'New user should have an empty order history').toBe(true);
  });

  // TC060 — Multiple orders appear in history
  test('TC060 - multiple placed orders all appear in order history', async ({
    page,
    apiService,
    authService,
    orderHistoryPage,
    config,
  }) => {
    // Place two orders via API
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '2' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    // Order 1
    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order1 = await apiService.createOrder(config.getShippingData());

    // Order 2
    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order2 = await apiService.createOrder(config.getShippingData());

    // Inject token and go to orders page
    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await orderHistoryPage.goto();

    const orderCount = await orderHistoryPage.getOrderCount();
    expect(orderCount).toBeGreaterThanOrEqual(2);

    // Both order IDs should be visible in the list
    await orderHistoryPage.assertHasOrder(order1.id);
    await orderHistoryPage.assertHasOrder(order2.id);
  });

  // TC061 — Order detail shows shipping address correctly
  test('TC061 - order detail shows shipping address from checkout', async ({
    page,
    apiService,
    authService,
    orderHistoryPage,
    orderDetailPage,
    config,
  }) => {
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    const shippingData = config.getShippingData();
    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order = await apiService.createOrder(shippingData);

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await orderDetailPage.goto(order.id);

    const shippingAddress = await orderDetailPage.getShippingAddress();

    // The email used at checkout should appear in the shipping address section
    const pageText = await page.locator('body').textContent() ?? '';
    expect(pageText).toContain(shippingData.city);
  });

  // TC062 — Order detail shows correct cost breakdown
  test('TC062 - order detail shows correct cost breakdown', async ({
    page,
    apiService,
    authService,
    orderDetailPage,
    config,
  }) => {
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order = await apiService.createOrder(config.getShippingData());

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await orderDetailPage.goto(order.id);

    const subtotal = await orderDetailPage.getSubtotal();
    const tax = await orderDetailPage.getTax();
    const shipping = await orderDetailPage.getShipping();
    const total = await orderDetailPage.getTotal();

    // All amounts should be non-negative
    expect(subtotal).toBeGreaterThanOrEqual(0);
    expect(tax).toBeGreaterThanOrEqual(0);
    expect(shipping).toBeGreaterThanOrEqual(0);
    expect(total).toBeGreaterThan(0);

    // Total should equal subtotal + tax + shipping (within rounding)
    const expectedTotal = Math.round((subtotal + tax + shipping) * 100) / 100;
    expect(Math.abs(total - expectedTotal)).toBeLessThanOrEqual(0.05);
  });

  // TC063 — Order items match what was in cart
  test('TC063 - order items match the products added to cart', async ({
    page,
    apiService,
    authService,
    orderDetailPage,
    config,
  }) => {
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    const product = products[0];
    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(product.id!, 1);
    const order = await apiService.createOrder(config.getShippingData());

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await orderDetailPage.goto(order.id);

    // The product we added should appear in the order detail
    const hasItem = await orderDetailPage.hasItemWithName(product.name);
    expect(hasItem, `Expected "${product.name}" in order items`).toBe(true);

    const items = await orderDetailPage.getItems();
    expect(items.length).toBeGreaterThan(0);
  });

  // TC064 — Order status is 'pending' initially
  test('TC064 - newly placed order has pending status', async ({
    page,
    apiService,
    authService,
    orderDetailPage,
    config,
  }) => {
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }

    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order = await apiService.createOrder(config.getShippingData());

    await page.goto(config.getBaseUrl(), { waitUntil: 'domcontentloaded' });
    await authService.injectAuthToken(page, token);
    await orderDetailPage.goto(order.id);

    const status = await orderDetailPage.getOrderStatus();
    expect(status.toLowerCase()).toContain('pending');
  });

});
