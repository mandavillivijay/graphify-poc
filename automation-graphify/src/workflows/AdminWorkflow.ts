/**
 * AdminWorkflow.ts — Admin-level test scenarios for product and order management.
 *
 * Drives the admin dashboard UI to add/edit/delete products and update order
 * statuses. Used by admin feature tests and data-setup helpers.
 */

import { Page } from '@playwright/test';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ApiService } from '../services/ApiService';
import { ConfigManager } from '../config/ConfigManager';
import type { ProductData } from '../models/Product';

export class AdminWorkflow {
  private adminPage: AdminDashboardPage;
  private apiService: ApiService;
  private config: ConfigManager;

  constructor(
    private page: Page,
  ) {
    this.adminPage = new AdminDashboardPage(page);
    this.apiService = new ApiService();
    this.config = ConfigManager.getInstance();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigates to the /admin dashboard and waits for it to load.
   * Asserts the URL contains /admin.
   */
  async navigateToAdmin(): Promise<void> {
    await this.adminPage.goto();
    await this.adminPage.assertOnAdminPage();
    console.log('[AdminWorkflow] Navigated to admin dashboard');
  }

  // ── Product management ─────────────────────────────────────────────────────

  /**
   * Performs an admin product catalog action:
   *   - 'add':    Navigates to products tab, opens the add product form, fills it in.
   *   - 'edit':   Finds the product by name and opens the edit form.
   *   - 'delete': Finds the product by name and confirms deletion.
   *
   * @param action  - 'add' | 'edit' | 'delete'
   * @param data    - ProductData used for add/edit; only .name is needed for delete.
   */
  async manageProductCatalog(
    action: 'add' | 'edit' | 'delete',
    data?: ProductData,
  ): Promise<void> {
    await this.navigateToAdmin();
    await this.adminPage.navigateToProducts();

    switch (action) {
      case 'add': {
        if (!data) throw new Error('[AdminWorkflow] ProductData is required for add action');
        await this.adminPage.addProduct(data);
        console.log(`[AdminWorkflow] Added product: ${data.name}`);
        break;
      }
      case 'edit': {
        if (!data?.name) throw new Error('[AdminWorkflow] ProductData.name is required for edit action');
        await this.adminPage.editProduct(data.name, data);
        console.log(`[AdminWorkflow] Edited product: ${data.name}`);
        break;
      }
      case 'delete': {
        if (!data?.name) throw new Error('[AdminWorkflow] ProductData.name is required for delete action');
        await this.adminPage.deleteProduct(data.name);
        console.log(`[AdminWorkflow] Deleted product: ${data.name}`);
        break;
      }
    }
  }

  // ── Order management ───────────────────────────────────────────────────────

  /**
   * Navigates to the admin orders tab, finds the order with the given ID,
   * and updates its status to the provided value.
   *
   * @param orderId   - The order ID to update (first 8 chars are used for matching).
   * @param newStatus - One of: pending | confirmed | processing | shipped | delivered | cancelled | refunded
   */
  async processOrder(orderId: string, newStatus: string): Promise<void> {
    await this.navigateToAdmin();
    await this.adminPage.navigateToOrders();
    await this.adminPage.updateOrderStatus(orderId, newStatus);
    console.log(`[AdminWorkflow] Updated order ${orderId} → ${newStatus}`);
  }

  /**
   * Updates order status via the API (faster than UI).
   * Requires admin credentials to be configured.
   */
  async processOrderViaApi(orderId: string, newStatus: string): Promise<void> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);

    // The admin API endpoint is PUT /api/admin/orders/:id/status
    // ApiService doesn't have a dedicated updateOrderStatus method,
    // so we use the internal request mechanism via the public API.
    // We'll call updateProduct-like approach using the existing request infra.
    // Since ApiService exposes request as private, create a subclass approach:
    const baseUrl = this.config.getApiBaseUrl();
    const token = this.apiService.getToken();
    const response = await fetch(`${baseUrl}/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        `AdminWorkflow.processOrderViaApi: ${response.status} — ${body['message'] ?? response.statusText}`,
      );
    }

    console.log(`[AdminWorkflow API] Updated order ${orderId} → ${newStatus}`);
  }

  // ── Dashboard stats ────────────────────────────────────────────────────────

  /**
   * Navigates to the admin dashboard and returns the key stats displayed
   * on the dashboard overview panel.
   *
   * @returns { totalProducts: number, totalOrders: number }
   */
  async verifyDashboardStats(): Promise<{ totalProducts: number; totalOrders: number }> {
    await this.navigateToAdmin();
    const stats = await this.adminPage.getDashboardStats();
    console.log(
      `[AdminWorkflow] Dashboard stats — products: ${stats.totalProducts}, orders: ${stats.totalOrders}`,
    );
    return stats;
  }

  /**
   * Returns dashboard stats via the admin API (faster than UI scraping).
   */
  async getDashboardStatsViaApi(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    revenue: number;
    pendingOrders: number;
  }> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);

    const baseUrl = this.config.getApiBaseUrl();
    const token = this.apiService.getToken();
    const response = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `AdminWorkflow.getDashboardStatsViaApi: ${response.status} — ${response.statusText}`,
      );
    }

    const body = await response.json() as {
      data: {
        total_products: number;
        total_orders: number;
        total_users: number;
        revenue: number;
        pending_orders: number;
      };
    };

    return {
      totalProducts: body.data.total_products,
      totalOrders: body.data.total_orders,
      totalUsers: body.data.total_users,
      revenue: body.data.revenue,
      pendingOrders: body.data.pending_orders,
    };
  }

  // ── Product CRUD via API ───────────────────────────────────────────────────

  /**
   * Creates a product via the admin API. Returns the created product data.
   */
  async createProductViaApi(data: Partial<ProductData>): Promise<ProductData> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);
    const product = await this.apiService.createProduct(data);
    console.log(`[AdminWorkflow API] Created product: ${product.name} id=${product.id}`);
    return product;
  }

  /**
   * Updates a product via the admin API. Returns the updated product data.
   */
  async updateProductViaApi(
    productId: string,
    updates: Partial<ProductData>,
  ): Promise<ProductData> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);
    const product = await this.apiService.updateProduct(productId, updates);
    console.log(`[AdminWorkflow API] Updated product id=${productId}`);
    return product;
  }

  /**
   * Soft-deletes a product via the admin API.
   */
  async deleteProductViaApi(productId: string): Promise<void> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);
    await this.apiService.deleteProduct(productId);
    console.log(`[AdminWorkflow API] Deleted product id=${productId}`);
  }
}
