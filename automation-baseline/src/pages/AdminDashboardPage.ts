/**
 * AdminDashboardPage — Page object for the ShopHub /admin route.
 *
 * Covers:
 *   - Dashboard stats tab (product count, order count, user count, revenue)
 *   - Products tab: add, edit, delete products
 *   - Orders tab: view and update order status
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { ProductData } from '../models/Product';

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
}

export class AdminDashboardPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Stats
  // ---------------------------------------------------------------------------

  readonly totalProductsStat: Locator;
  readonly totalOrdersStat: Locator;
  readonly totalUsersStat: Locator;
  readonly revenueStat: Locator;
  readonly statCards: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Tabs
  // ---------------------------------------------------------------------------

  readonly productsTab: Locator;
  readonly ordersTab: Locator;
  readonly statsTab: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Products table
  // ---------------------------------------------------------------------------

  readonly addProductButton: Locator;
  readonly productRows: Locator;
  readonly productSearchInput: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Orders table
  // ---------------------------------------------------------------------------

  readonly orderRows: Locator;
  readonly orderSearchInput: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Shared modals
  // ---------------------------------------------------------------------------

  readonly confirmModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly modalCloseButton: Locator;
  readonly statusUpdateDropdown: Locator;

  // ---------------------------------------------------------------------------
  // Locators — General
  // ---------------------------------------------------------------------------

  readonly searchInput: Locator;
  readonly pageHeading: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Stats
    this.totalProductsStat = page.locator('[data-testid="stat-products"], h3').filter({ hasText: /products/i }).first();
    this.totalOrdersStat = page.locator('[data-testid="stat-orders"], h3').filter({ hasText: /orders/i }).first();
    this.totalUsersStat = page.locator('[data-testid="stat-users"], h3').filter({ hasText: /users/i }).first();
    this.revenueStat = page.locator('[data-testid="stat-revenue"], h3').filter({ hasText: /revenue/i }).first();
    this.statCards = page.locator(
      '[data-testid="stat-card"], .stat-card, [style*="backgroundColor: #fff"][style*="borderRadius"]'
    );

    // Tabs
    this.productsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /^Products$/i }).first();
    this.ordersTab = page.locator('button, a, [role="tab"]').filter({ hasText: /^Orders$/i }).first();
    this.statsTab = page.locator('button, a, [role="tab"]').filter({ hasText: /stats|overview/i }).first();

    // Products table
    this.addProductButton = page
      .locator('button')
      .filter({ hasText: /add product|new product|create product/i })
      .first();
    this.productRows = page.locator(
      '[data-testid="product-row"], table tbody tr, .product-row'
    );
    this.productSearchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    // Orders table
    this.orderRows = page.locator(
      '[data-testid="order-row"], table tbody tr, .order-row'
    );
    this.orderSearchInput = this.productSearchInput; // same element in most layouts

    // Shared modal
    this.confirmModal = page.locator('[role="dialog"], .modal, [data-testid="confirm-modal"]').first();
    this.confirmDeleteButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).last();
    this.modalCloseButton = page.locator('button[aria-label="Close"], button').filter({ hasText: /cancel|close/i }).first();
    this.statusUpdateDropdown = page.locator('select[name*="status"], [data-testid="status-select"]').first();

    // General
    this.searchInput = this.productSearchInput;
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /admin|dashboard/i }).first();
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, .spinner').first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/admin';
  }

  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
    await this.waitForElementHidden(this.loadingIndicator, 8000).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Tab navigation
  // ---------------------------------------------------------------------------

  async switchToProductsTab(): Promise<void> {
    const visible = await this.isVisible(this.productsTab);
    if (visible) {
      await this.clickWithRetry(this.productsTab);
      await this.page.waitForTimeout(500);
      await this.waitForElementHidden(this.loadingIndicator, 5000).catch(() => {});
    }
  }

  async switchToOrdersTab(): Promise<void> {
    const visible = await this.isVisible(this.ordersTab);
    if (visible) {
      await this.clickWithRetry(this.ordersTab);
      await this.page.waitForTimeout(500);
      await this.waitForElementHidden(this.loadingIndicator, 5000).catch(() => {});
    }
  }

  async switchToStatsTab(): Promise<void> {
    const visible = await this.isVisible(this.statsTab);
    if (visible) {
      await this.clickWithRetry(this.statsTab);
      await this.page.waitForTimeout(500);
    }
  }

  /** Aliases to match the spec interface. */
  async navigateToProducts(): Promise<void> {
    return this.switchToProductsTab();
  }

  async navigateToOrders(): Promise<void> {
    return this.switchToOrdersTab();
  }

  // ---------------------------------------------------------------------------
  // Dashboard stats
  // ---------------------------------------------------------------------------

  /**
   * Parses and returns all dashboard stat numbers.
   */
  async getStats(): Promise<DashboardStats> {
    let totalProducts = 0;
    let totalOrders = 0;
    let totalUsers = 0;
    let revenue = 0;

    try {
      const count = await this.statCards.count();
      for (let i = 0; i < count; i++) {
        const text = (await this.statCards.nth(i).textContent()) ?? '';
        const lowerText = text.toLowerCase();
        // Extract the first standalone number found in the card
        const num = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
        if (lowerText.includes('product')) totalProducts = num;
        else if (lowerText.includes('order')) totalOrders = num;
        else if (lowerText.includes('user')) totalUsers = num;
        else if (lowerText.includes('revenue') || lowerText.includes('$')) revenue = num;
      }
    } catch {
      // Stats may not be rendered yet — return zeros
    }

    return { totalProducts, totalOrders, totalUsers, revenue };
  }

  /**
   * Returns the product count displayed in the stats overview.
   */
  async getProductCount(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalProducts;
  }

  /**
   * Returns the order count displayed in the stats overview.
   */
  async getOrderCount(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalOrders;
  }

  /** Alias for getDashboardStats — preserves backward compatibility. */
  async getDashboardStats(): Promise<{ totalProducts: number; totalOrders: number }> {
    const stats = await this.getStats();
    return { totalProducts: stats.totalProducts, totalOrders: stats.totalOrders };
  }

  // ---------------------------------------------------------------------------
  // Products — row count
  // ---------------------------------------------------------------------------

  /**
   * Returns the number of product rows visible in the products table.
   */
  async getProductRowCount(): Promise<number> {
    try {
      await this.productRows.first().waitFor({ state: 'visible', timeout: 5000 });
      return this.productRows.count();
    } catch {
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Products — CRUD
  // ---------------------------------------------------------------------------

  /**
   * Opens the "Add Product" form/modal and fills in the provided fields.
   */
  async addProduct(data: Partial<ProductData>): Promise<void> {
    await this.clickWithRetry(this.addProductButton);
    await this.page.waitForTimeout(400);

    const nameInput = this.page
      .locator('input[name="name"], #productName, input[placeholder*="product name" i]')
      .first();
    const priceInput = this.page
      .locator('input[name="price"], #price, input[placeholder*="price" i]')
      .first();
    const categoryInput = this.page
      .locator('input[name="category"], select[name="category"], #category')
      .first();
    const descriptionInput = this.page
      .locator('textarea[name="description"], #description, textarea[placeholder*="description" i]')
      .first();
    const stockInput = this.page
      .locator('input[name="stockQuantity"], input[name="stock"], #stock')
      .first();

    if (data.name) await this.fillInput(nameInput, data.name);
    if (data.price !== undefined) await this.fillInput(priceInput, String(data.price));
    if (data.description) {
      const descVisible = await this.isVisible(descriptionInput);
      if (descVisible) await this.fillInput(descriptionInput, data.description);
    }
    if (data.category) {
      const isSelect = await categoryInput.evaluate((el) => el.tagName === 'SELECT');
      if (isSelect) {
        await categoryInput.selectOption({ label: data.category }).catch(() =>
          categoryInput.selectOption({ value: data.category! })
        );
      } else {
        await this.fillInput(categoryInput, data.category);
      }
    }
    if (data.stockQuantity !== undefined) {
      const stockVisible = await this.isVisible(stockInput);
      if (stockVisible) await this.fillInput(stockInput, String(data.stockQuantity));
    }

    const submitBtn = this.page.locator('button[type="submit"]').first();
    await this.clickWithRetry(submitBtn);
    await this.page.waitForTimeout(600);
  }

  /**
   * Finds the product row by name, opens the edit form, applies updates, and saves.
   */
  async editProduct(productNameOrId: string, updates: Partial<ProductData>): Promise<void> {
    const row = this.productRows.filter({ hasText: productNameOrId }).first();
    const editBtn = row.locator('button, a').filter({ hasText: /edit/i }).first();
    await this.waitForElement(editBtn);
    await this.clickWithRetry(editBtn);
    await this.page.waitForTimeout(400);

    if (updates.name) {
      const nameInput = this.page.locator('input[name="name"], #productName').first();
      await this.fillInput(nameInput, updates.name);
    }
    if (updates.price !== undefined) {
      const priceInput = this.page.locator('input[name="price"], #price').first();
      await this.fillInput(priceInput, String(updates.price));
    }
    if (updates.stockQuantity !== undefined) {
      const stockInput = this.page.locator('input[name="stockQuantity"], #stock').first();
      const stockVisible = await this.isVisible(stockInput);
      if (stockVisible) await this.fillInput(stockInput, String(updates.stockQuantity));
    }
    if (updates.description) {
      const descInput = this.page.locator('textarea[name="description"], #description').first();
      const descVisible = await this.isVisible(descInput);
      if (descVisible) await this.fillInput(descInput, updates.description);
    }

    const submitBtn = this.page.locator('button[type="submit"]').first();
    await this.clickWithRetry(submitBtn);
    await this.page.waitForTimeout(600);
  }

  /**
   * Deletes a product by name. Confirms any delete modal that appears.
   */
  async deleteProduct(productName: string): Promise<void> {
    const row = this.productRows.filter({ hasText: productName }).first();
    const deleteBtn = row.locator('button, a').filter({ hasText: /delete|remove/i }).first();
    await this.waitForElement(deleteBtn);
    await this.clickWithRetry(deleteBtn);

    const modalVisible = await this.isVisible(this.confirmModal);
    if (modalVisible) {
      await this.clickWithRetry(this.confirmDeleteButton);
    }
    await this.page.waitForTimeout(600);
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  /**
   * Updates the status of the order matching the given ID fragment.
   * Handles both inline select and edit-modal patterns.
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    const row = this.orderRows.filter({ hasText: orderId.slice(0, 8) }).first();
    await this.waitForElement(row);

    // Strategy 1: inline <select> in the row
    const inlineSelect = row.locator('select').first();
    const hasInlineSelect = (await inlineSelect.count()) > 0;
    if (hasInlineSelect) {
      await inlineSelect
        .selectOption({ label: newStatus })
        .catch(() => inlineSelect.selectOption({ value: newStatus }));
      // Some implementations auto-save; others need a button
      const saveBtn = row.locator('button').filter({ hasText: /save|update/i }).first();
      const saveBtnVisible = await this.isVisible(saveBtn);
      if (saveBtnVisible) await this.clickWithRetry(saveBtn);
      await this.page.waitForTimeout(500);
      return;
    }

    // Strategy 2: edit button opens a modal/dialog
    const editBtn = row.locator('button, a').filter({ hasText: /edit|update/i }).first();
    await this.clickWithRetry(editBtn);
    await this.page.waitForTimeout(300);

    const dialog = this.page.locator('[role="dialog"], .modal').first();
    const dialogSelect = dialog.locator('select').first();
    await dialogSelect
      .selectOption({ label: newStatus })
      .catch(() => dialogSelect.selectOption({ value: newStatus }));

    const confirmBtn = dialog
      .locator('button[type="submit"], button')
      .filter({ hasText: /save|update/i })
      .first();
    await this.clickWithRetry(confirmBtn);
    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertOnAdminPage(): Promise<void> {
    const url = this.page.url();
    expect(url).toContain('/admin');
  }

  async assertProductExistsInTable(productName: string): Promise<void> {
    const row = this.productRows.filter({ hasText: productName }).first();
    await expect(row, `Expected product "${productName}" in admin table`).toBeVisible();
  }

  async assertProductNotInTable(productName: string): Promise<void> {
    const row = this.productRows.filter({ hasText: productName }).first();
    await expect(row, `Expected product "${productName}" to NOT be in admin table`).toBeHidden();
  }
}
