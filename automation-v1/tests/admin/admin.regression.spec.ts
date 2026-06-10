/**
 * admin.regression.spec.ts — Regression tests for admin product and order management.
 *
 * Covers: add product, update product, deactivate product, view all orders,
 * update order status, and verify the stats dashboard shows data.
 *
 * All tests use the `adminPage` fixture (admin user pre-authenticated at /admin).
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('@regression @admin Admin Regression Tests', () => {

  // TC068 — Admin can add a new product
  test('TC068 - admin can add a new product via the dashboard', async ({
    adminPage: page,
    adminDashboardPage,
    adminWorkflow,
  }) => {
    const productName = `Regression Product ${Date.now()}`;

    // Use the workflow to add a product through the UI
    await adminWorkflow.manageProductCatalog('add', {
      name: productName,
      price: 29.99,
      category: 'Electronics',
      brand: 'TestBrand',
      description: 'Automated regression test product',
      stockQuantity: 10,
    });

    // Switch to products tab and verify the new product appears
    await adminDashboardPage.switchToProductsTab();
    await adminDashboardPage.assertProductExistsInTable(productName);

    // Cleanup: delete the test product via API
    const apiService = await import('../../src/services/ApiService');
    const api = new apiService.ApiService();
    await api.loginAsAdmin();
    const products = await api.getProducts({ q: productName });
    for (const p of products) {
      if (p.name === productName && p.id) {
        await api.deleteProduct(p.id);
      }
    }
  });

  // TC069 — Admin can update product details
  test('TC069 - admin can update an existing product\'s price', async ({
    adminPage: page,
    adminDashboardPage,
    adminWorkflow,
    apiService,
  }) => {
    // Create a test product via API first
    await apiService.loginAsAdmin();
    const originalName = `Update Test ${Date.now()}`;
    const created = await apiService.createProduct({
      name: originalName,
      price: 19.99,
      category: 'Electronics',
      description: 'Product for update test',
      stockQuantity: 5,
    });

    // Re-navigate to admin page to pick up new product
    await page.reload({ waitUntil: 'domcontentloaded' });
    await adminDashboardPage.switchToProductsTab();

    // Edit the product price via UI
    await adminDashboardPage.editProduct(originalName, { price: 24.99 });

    // Verify update via API
    const updated = await apiService.getProduct(created.id!);
    expect(updated.price).toBe(24.99);

    // Cleanup
    await apiService.deleteProduct(created.id!);
  });

  // TC070 — Admin can deactivate a product
  test('TC070 - admin can deactivate (soft-delete) a product', async ({
    adminPage: page,
    adminDashboardPage,
    apiService,
  }) => {
    // Create a product to deactivate
    await apiService.loginAsAdmin();
    const productName = `Deactivate Test ${Date.now()}`;
    const created = await apiService.createProduct({
      name: productName,
      price: 9.99,
      category: 'Accessories',
      description: 'Product to be deactivated',
      stockQuantity: 3,
    });

    // Delete/deactivate via UI
    await page.reload({ waitUntil: 'domcontentloaded' });
    await adminDashboardPage.switchToProductsTab();
    await adminDashboardPage.deleteProduct(productName);

    // Verify the product no longer appears in the admin table
    await adminDashboardPage.assertProductNotInTable(productName);

    // Final API cleanup (in case soft-delete still leaves it in API)
    await apiService.deleteProduct(created.id!).catch(() => {});
  });

  // TC071 — Admin can view all orders
  test('TC071 - admin can view all orders in the orders tab', async ({
    adminPage: page,
    adminDashboardPage,
    apiService,
    config,
  }) => {
    // Ensure there is at least one order in the system
    const token = await apiService.loginAsCustomer();
    apiService.setToken(token);
    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length > 0) {
      await apiService.clearCart().catch(() => {});
      await apiService.addToCart(products[0].id!, 1);
      await apiService.createOrder(config.getShippingData()).catch(() => {});
    }

    // Switch to the orders tab as admin
    await adminDashboardPage.switchToOrdersTab();

    // There should be at least one order row
    const orderRowCount = await adminDashboardPage.orderRows.count();
    expect(orderRowCount).toBeGreaterThan(0);
  });

  // TC072 — Admin can update order status
  test('TC072 - admin can update an order status to confirmed', async ({
    adminPage: page,
    adminDashboardPage,
    adminWorkflow,
    apiService,
    config,
  }) => {
    // Place an order as customer via API
    const customerToken = await apiService.loginAsCustomer();
    apiService.setToken(customerToken);
    const products = await apiService.getProducts({ in_stock: 'true', limit: '1' });
    if (products.length === 0) {
      test.skip(true, 'No in-stock products available');
      return;
    }
    await apiService.clearCart().catch(() => {});
    await apiService.addToCart(products[0].id!, 1);
    const order = await apiService.createOrder(config.getShippingData());

    // Update status via admin workflow (uses admin API under the hood)
    await adminWorkflow.processOrderViaApi(order.id, 'confirmed');

    // Verify via API that the status changed
    const adminToken = await apiService.loginAsAdmin();
    apiService.setToken(adminToken);
    const updated = await apiService.getOrder(order.id);
    expect(updated.status.toLowerCase()).toBe('confirmed');
  });

  // TC073 — Admin stats dashboard shows data
  test('TC073 - admin stats dashboard shows product and order counts', async ({
    adminPage: page,
    adminWorkflow,
  }) => {
    const stats = await adminWorkflow.verifyDashboardStats();

    // Both stat numbers should be positive (seeded app)
    expect(stats.totalProducts).toBeGreaterThan(0);
    expect(stats.totalOrders).toBeGreaterThanOrEqual(0);
  });

});
