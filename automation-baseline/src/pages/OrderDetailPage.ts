/**
 * OrderDetailPage — Page object for the ShopHub /orders/:id route.
 *
 * Covers order metadata (ID, status, timestamps), line items,
 * financial totals, and shipping address details.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ShippingAddressInfo {
  name: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderDetailInfo {
  orderId: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: ShippingAddressInfo;
}

export class OrderDetailPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Header
  // ---------------------------------------------------------------------------

  readonly orderId: Locator;
  readonly orderStatus: Locator;
  readonly orderDate: Locator;
  readonly pageHeading: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Line items
  // ---------------------------------------------------------------------------

  readonly orderItems: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Totals
  // ---------------------------------------------------------------------------

  readonly subtotalDisplay: Locator;
  readonly taxDisplay: Locator;
  readonly shippingDisplay: Locator;
  readonly orderTotal: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Shipping address
  // ---------------------------------------------------------------------------

  readonly shippingAddressSection: Locator;
  readonly shippingName: Locator;
  readonly shippingEmail: Locator;
  readonly shippingAddress: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Navigation
  // ---------------------------------------------------------------------------

  readonly backToOrdersLink: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /order/i }).first();
    this.orderId = page.locator('[style*="monospace"], [data-testid="order-id"], .order-id').first();
    this.orderStatus = page
      .locator('span[style*="borderRadius: 20px"], .status-badge, [class*="status-badge"]')
      .first();
    this.orderDate = page
      .locator('p, span, td')
      .filter({ hasText: /\d{4}.*\d{2}.*\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/ })
      .first();

    // Line items
    this.orderItems = page.locator(
      '[data-testid="order-item"], .order-item, [style*="flex"][style*="gap"]'
    ).filter({ has: page.locator('span, p') });

    // Totals
    this.subtotalDisplay = page
      .locator('span, p, td')
      .filter({ hasText: /Subtotal/i })
      .locator('..')
      .locator('span, p, td')
      .last();
    this.taxDisplay = page
      .locator('span, p, td')
      .filter({ hasText: /^Tax/i })
      .locator('..')
      .locator('span, p, td')
      .last();
    this.shippingDisplay = page
      .locator('span, p, td')
      .filter({ hasText: /^Shipping/i })
      .locator('..')
      .locator('span, p, td')
      .last();
    this.orderTotal = page
      .locator('span[style*="fontWeight: 700"], .order-total, [data-testid="order-total"]')
      .last();

    // Shipping address
    this.shippingAddressSection = page
      .locator('[data-testid="shipping-address"], .shipping-address, section')
      .filter({ hasText: /shipping/i })
      .first();
    this.shippingName = page.locator('p, span').filter({ hasText: /name/i }).first();
    this.shippingEmail = page.locator('p, span').filter({ hasText: /@/ }).first();
    this.shippingAddress = page
      .locator('p, span, address')
      .filter({ hasText: /street|ave|blvd|road|drive|lane|\d{3,}/i })
      .first();

    // Navigation
    this.backToOrdersLink = page.locator('a, button').filter({ hasText: /← Back|back to orders|My Orders/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/orders';
  }

  async goto(orderId: string): Promise<void> {
    await this.page.goto(this.config.buildUrl(`/orders/${orderId}`));
    await this.waitForPageLoad();
    await this.waitForElement(this.pageHeading);
  }

  // ---------------------------------------------------------------------------
  // Order metadata
  // ---------------------------------------------------------------------------

  /**
   * Returns the order ID text (may be truncated with "..." in some layouts).
   */
  async getOrderId(): Promise<string> {
    try {
      await this.waitForElement(this.orderId, 5000);
      return (await this.getTextContent(this.orderId)).replace('...', '').trim();
    } catch {
      // Fall back to extracting from URL
      const url = await this.getCurrentUrl();
      const match = url.match(/\/orders\/([^/?#]+)/);
      return match ? match[1] : '';
    }
  }

  /**
   * Returns the order status label (e.g. "Processing", "Shipped", "Delivered").
   */
  async getStatus(): Promise<string> {
    await this.waitForElement(this.orderStatus);
    return this.getTextContent(this.orderStatus);
  }

  /** Alias for getStatus. */
  async getOrderStatus(): Promise<string> {
    return this.getStatus();
  }

  /**
   * Returns the order date string as displayed.
   */
  async getOrderDate(): Promise<string> {
    try {
      await this.waitForElement(this.orderDate, 5000);
      return this.getTextContent(this.orderDate);
    } catch {
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Line items
  // ---------------------------------------------------------------------------

  /**
   * Scrapes all order line items from the page.
   */
  async getItems(): Promise<OrderItem[]> {
    const items: OrderItem[] = [];
    const count = await this.orderItems.count();

    for (let i = 0; i < count; i++) {
      const row = this.orderItems.nth(i);
      const rowText = (await row.textContent()) ?? '';

      // Name
      const nameEl = row
        .locator('span, p, td, [data-testid="item-name"]')
        .filter({ hasText: /\w{3,}/ })
        .first();
      let name = '';
      try {
        name = ((await nameEl.textContent()) ?? '').trim();
      } catch {
        // ignore
      }
      if (!name || name.length < 2) continue;

      // Quantity — look for "Qty: N" or "×N" patterns
      let quantity = 1;
      const qtyMatch = rowText.match(/[Qq]ty[:\s]*(\d+)|×\s*(\d+)|(\d+)\s*×/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3], 10) || 1;
      }

      // Prices
      const prices = rowText.match(/\$[\d,.]+/g) ?? [];
      const unitPrice = prices.length > 0 ? parseFloat((prices[0] ?? '').replace(/[^0-9.]/g, '')) : 0;
      const lineTotal =
        prices.length > 1
          ? parseFloat(prices[prices.length - 1].replace(/[^0-9.]/g, ''))
          : unitPrice * quantity;

      items.push({ name, quantity, unitPrice, lineTotal });
    }

    return items;
  }

  /**
   * Returns true if any line item's name matches the given product name.
   */
  async hasItemWithName(productName: string): Promise<boolean> {
    const count = await this.orderItems.count();
    for (let i = 0; i < count; i++) {
      const text = (await this.orderItems.nth(i).textContent()) ?? '';
      if (text.toLowerCase().includes(productName.toLowerCase())) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  async getSubtotal(): Promise<number> {
    return this.parseMoneyLocator(this.subtotalDisplay);
  }

  async getTax(): Promise<number> {
    return this.parseMoneyLocator(this.taxDisplay);
  }

  async getShipping(): Promise<number> {
    return this.parseMoneyLocator(this.shippingDisplay);
  }

  async getTotal(): Promise<number> {
    try {
      const text = (await this.orderTotal.textContent()) ?? '0';
      return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  /** Alias for getTotal. */
  async getOrderTotal(): Promise<number> {
    return this.getTotal();
  }

  /** Alias for getOrderId — preserves backward compatibility with service layer. */
  async getOrderIdText(): Promise<string> {
    return this.getOrderId();
  }

  // ---------------------------------------------------------------------------
  // Shipping address
  // ---------------------------------------------------------------------------

  /**
   * Returns a structured object with all shipping address fields found on the page.
   */
  async getShippingAddress(): Promise<ShippingAddressInfo> {
    const sectionText = await this.shippingAddressSection
      .textContent()
      .catch(() => this.page.locator('body').textContent() ?? '');

    // Attempt to extract structured data from the section text
    const lines = (sectionText ?? '')
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Simple heuristic extraction — robust enough for test assertions
    const emailMatch = (sectionText ?? '').match(/\S+@\S+\.\S+/);
    const zipMatch = (sectionText ?? '').match(/\b\d{5}(?:-\d{4})?\b/);

    return {
      name: lines[1] ?? '',
      email: emailMatch ? emailMatch[0] : '',
      addressLine1: lines[2] ?? '',
      city: lines[3] ?? '',
      state: zipMatch ? lines[3]?.split(',')[1]?.trim() ?? '' : '',
      zip: zipMatch ? zipMatch[0] : '',
      country: lines[4] ?? '',
    };
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigates back to the order history list.
   */
  async backToOrders(): Promise<void> {
    await this.clickWithRetry(this.backToOrdersLink);
    await this.page.waitForURL('**/orders', { timeout: this.config.getDefaultTimeout() });
  }

  // ---------------------------------------------------------------------------
  // Comprehensive getter
  // ---------------------------------------------------------------------------

  /**
   * Returns all order detail data in a single typed object.
   */
  async getOrderDetailInfo(): Promise<OrderDetailInfo> {
    return {
      orderId: await this.getOrderId(),
      status: await this.getStatus(),
      items: await this.getItems(),
      subtotal: await this.getSubtotal(),
      tax: await this.getTax(),
      shipping: await this.getShipping(),
      total: await this.getTotal(),
      shippingAddress: await this.getShippingAddress(),
    };
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertStatusIs(status: string): Promise<void> {
    const actual = await this.getStatus();
    expect(actual.toLowerCase()).toContain(status.toLowerCase());
  }

  async assertHasItem(productName: string): Promise<void> {
    const found = await this.hasItemWithName(productName);
    expect(found, `Expected order to contain item "${productName}"`).toBe(true);
  }

  async assertTotalIs(expectedTotal: number, tolerance = 0.01): Promise<void> {
    const actual = await this.getTotal();
    expect(
      Math.abs(actual - expectedTotal),
      `Expected total ${expectedTotal}, got ${actual}`
    ).toBeLessThanOrEqual(tolerance);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async parseMoneyLocator(locator: Locator): Promise<number> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      const text = (await locator.textContent()) ?? '0';
      return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    } catch {
      return 0;
    }
  }
}
