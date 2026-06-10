/**
 * OrderHistoryPage — Page object for the ShopHub /orders route.
 *
 * Covers the list of historical orders, navigation to order details,
 * empty-state handling, and assertion helpers.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface OrderSummaryInfo {
  id: string;
  date: string;
  status: string;
  total: number;
  itemCount?: number;
}

export class OrderHistoryPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  readonly pageTitle: Locator;
  readonly orderCards: Locator;
  readonly emptyOrdersMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.locator('h1, h2').filter({ hasText: /orders|order history/i }).first();
    // Broad card selector — covers both card and table row layouts
    this.orderCards = page
      .locator(
        '[data-testid="order-card"], .order-card, [class*="order-card"], ' +
        '[style*="border: 1px solid #e5e7eb"][style*="borderRadius: 12px"]'
      )
      .filter({ has: page.locator('a[href*="/orders/"]') });
    this.emptyOrdersMessage = page
      .locator('h3, p, [class*="empty"]')
      .filter({ hasText: /No orders|no order/i })
      .first();
    this.errorMessage = page.locator('[style*="fef2f2"], [role="alert"], .error-message').first();
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, .spinner').first();
    this.refreshButton = page.locator('button').filter({ hasText: /refresh|reload/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/orders';
  }

  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
    await this.waitForElementHidden(this.loadingIndicator, 8000).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Order list queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the number of order cards currently visible.
   */
  async getOrderCount(): Promise<number> {
    try {
      await this.orderCards.first().waitFor({ state: 'visible', timeout: 5000 });
      return this.orderCards.count();
    } catch {
      return 0;
    }
  }

  /**
   * Returns true if the "No orders" empty state is visible.
   */
  async isEmpty(): Promise<boolean> {
    return this.isVisible(this.emptyOrdersMessage);
  }

  /**
   * Scrapes all visible order cards into OrderSummaryInfo objects.
   */
  async getOrders(): Promise<OrderSummaryInfo[]> {
    const results: OrderSummaryInfo[] = [];
    const count = await this.getOrderCount();
    if (count === 0) return results;

    for (let i = 0; i < count; i++) {
      const card = this.orderCards.nth(i);
      const cardText = (await card.textContent()) ?? '';

      // ID — look for monospace text or a short hex/uuid fragment
      const idEl = card.locator('p[style*="monospace"], [data-testid="order-id"], .order-id').first();
      let id = '';
      try {
        id = ((await idEl.textContent()) ?? '').replace('...', '').trim();
      } catch {
        const idMatch = cardText.match(/[A-F0-9\-]{8,}/i);
        id = idMatch ? idMatch[0] : `order-${i}`;
      }

      // Date
      const dateEl = card.locator('p, span').filter({ hasText: /\d{4}/ }).first();
      let date = '';
      try {
        date = ((await dateEl.textContent()) ?? '').trim();
      } catch {
        // ignore
      }

      // Status
      const statusEl = card.locator('span[style*="borderRadius: 20px"], .status-badge, [class*="status"]').first();
      let status = '';
      try {
        status = ((await statusEl.textContent()) ?? '').trim();
      } catch {
        // ignore
      }

      // Total
      const totalEl = card.locator('p[style*="fontWeight: 700"], .order-total, [class*="total"]').first();
      let total = 0;
      try {
        const totalText = (await totalEl.textContent()) ?? '0';
        total = parseFloat(totalText.replace(/[^0-9.]/g, '')) || 0;
      } catch {
        // ignore
      }

      results.push({ id, date, status, total });
    }

    return results;
  }

  /**
   * Returns the order at the given zero-based index.
   */
  async getOrderByIndex(index: number): Promise<OrderSummaryInfo> {
    const orders = await this.getOrders();
    if (index >= orders.length) {
      throw new Error(`Order index ${index} out of bounds. Found ${orders.length} orders.`);
    }
    return orders[index];
  }

  /**
   * Returns the order summary for the given order ID (partial match).
   * Returns null if not found.
   */
  async getOrderById(orderId: string): Promise<OrderSummaryInfo | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id.includes(orderId.slice(0, 8))) ?? null;
  }

  /**
   * Returns the ID text fragment from the most recent (first) order card.
   */
  async getLatestOrderId(): Promise<string> {
    await this.orderCards.first().waitFor({ state: 'visible', timeout: 10000 });
    const firstCard = this.orderCards.first();
    const idEl = firstCard.locator('p[style*="monospace"], .order-id').first();
    const idText = (await idEl.textContent()) ?? '';
    return idText.replace('...', '').trim();
  }

  /**
   * Returns true when the order list contains a card matching the given ID.
   */
  async hasOrder(orderId: string): Promise<boolean> {
    const count = await this.orderCards.count();
    for (let i = 0; i < count; i++) {
      const text = (await this.orderCards.nth(i).textContent()) ?? '';
      if (text.includes(orderId.slice(0, 8))) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "View Details" link on the card matching the given order ID.
   */
  async clickOrderById(orderId: string): Promise<void> {
    const count = await this.orderCards.count();
    for (let i = 0; i < count; i++) {
      const card = this.orderCards.nth(i);
      const text = (await card.textContent()) ?? '';
      if (text.includes(orderId.slice(0, 8))) {
        const link = card.locator('a').filter({ hasText: /View Details/i }).first();
        const linkVisible = await this.isVisible(link);
        if (linkVisible) {
          await this.clickWithRetry(link);
        } else {
          // Some layouts make the whole card clickable
          await this.clickWithRetry(card);
        }
        await this.waitForPageLoad();
        return;
      }
    }
    throw new Error(`Order ${orderId} not found in history`);
  }

  /**
   * Clicks "View Details" on the most recent (first) order.
   */
  async clickFirstOrderDetails(): Promise<void> {
    const link = this.orderCards.first().locator('a').filter({ hasText: /View Details/i }).first();
    const linkVisible = await this.isVisible(link);
    if (linkVisible) {
      await this.clickWithRetry(link);
    } else {
      await this.clickWithRetry(this.orderCards.first());
    }
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertHasOrder(orderId: string): Promise<void> {
    const found = await this.hasOrder(orderId);
    expect(found, `Expected order ${orderId} to appear in history`).toBe(true);
  }

  async assertOrderCountAtLeast(min: number): Promise<void> {
    const count = await this.getOrderCount();
    expect(count, `Expected at least ${min} orders, found ${count}`).toBeGreaterThanOrEqual(min);
  }

  async assertIsEmpty(): Promise<void> {
    await expect(this.emptyOrdersMessage).toBeVisible();
  }

  async assertLatestOrderStatus(status: string): Promise<void> {
    const latest = await this.getOrderByIndex(0);
    expect(latest.status.toLowerCase()).toContain(status.toLowerCase());
  }
}
