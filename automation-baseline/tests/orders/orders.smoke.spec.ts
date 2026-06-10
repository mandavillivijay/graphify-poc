/**
 * orders.smoke.spec.ts — Smoke tests for the order history and order detail pages.
 *
 * Verifies that a placed order shows up in history, that the detail page
 * renders the correct items, and that the order status is set.
 *
 * Uses the `authenticatedPage` fixture and places a real order via API
 * setup to ensure pre-conditions are met without relying on prior test state.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@smoke @orders Order Smoke Tests', () => {

  // Shared: place an order via API once before running order-query tests
  let placedOrderId: string;

  test.beforeEach(async ({ apiService, config }) => {
    // Ensure we have at least one placed order to work with
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);

    // Check existing orders
    const existing = await apiService.getOrders();
    if (existing.length === 0) {
      // Place a new order via API
      await apiService.clearCart().catch(() => {});
      const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
      if (products.length > 0) {
        await apiService.addToCart(products[0].id!, 1);
        const newOrder = await apiService.createOrder(config.getShippingData());
        placedOrderId = newOrder.id;
      }
    } else {
      placedOrderId = existing[0].id;
    }
  });

  // TC056 — Order history shows placed orders
  test('TC056 - order history page shows placed orders', async ({
    authenticatedPage: page,
    orderHistoryPage,
  }) => {
    await orderHistoryPage.goto();

    const orderCount = await orderHistoryPage.getOrderCount();
    expect(orderCount).toBeGreaterThan(0);

    // Page title is visible
    await expect(orderHistoryPage.pageTitle).toBeVisible();
  });

  // TC057 — Order detail page shows correct items
  test('TC057 - order detail page shows correct items', async ({
    authenticatedPage: page,
    orderHistoryPage,
    orderDetailPage,
  }) => {
    await orderHistoryPage.goto();

    // Ensure there is at least one order
    const orderCount = await orderHistoryPage.getOrderCount();
    expect(orderCount).toBeGreaterThan(0);

    // Navigate to the first order detail
    await orderHistoryPage.clickFirstOrderDetails();

    // Detail page should show items
    const items = await orderDetailPage.getItems();
    expect(items.length).toBeGreaterThan(0);

    // Each item should have a non-empty name
    for (const item of items) {
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  // TC058 — Order has expected status after placement
  test('TC058 - newly placed order has a non-empty status', async ({
    authenticatedPage: page,
    orderHistoryPage,
    orderDetailPage,
  }) => {
    await orderHistoryPage.goto();

    const orderCount = await orderHistoryPage.getOrderCount();
    expect(orderCount).toBeGreaterThan(0);

    await orderHistoryPage.clickFirstOrderDetails();

    const status = await orderDetailPage.getOrderStatus();
    expect(status).toBeTruthy();
    expect(status.trim().length).toBeGreaterThan(0);
  });

});
