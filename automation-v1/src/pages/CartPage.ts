/**
 * CartPage — HIGH-CENTRALITY page object for the ShopHub /cart route.
 *
 * Covers the cart item list, quantity controls, remove/clear actions,
 * order summary totals (subtotal, tax, shipping, grand total),
 * and the "Proceed to Checkout" CTA.
 *
 * Many test workflows (add-to-cart → checkout, order placement, cart
 * management) depend on this page object.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CartItem {
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export class CartPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Header / state
  // ---------------------------------------------------------------------------

  readonly cartTitle: Locator;
  readonly emptyCartMessage: Locator;
  readonly continueShoppingLink: Locator;
  readonly itemCountLabel: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Item rows
  // ---------------------------------------------------------------------------

  readonly cartItemRows: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Order summary
  // ---------------------------------------------------------------------------

  readonly subtotalDisplay: Locator;
  readonly taxDisplay: Locator;
  readonly shippingDisplay: Locator;
  readonly totalDisplay: Locator;
  readonly orderSummarySection: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Actions
  // ---------------------------------------------------------------------------

  readonly proceedToCheckoutButton: Locator;
  readonly clearCartButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header / state
    this.cartTitle = page.locator('h1').filter({ hasText: /cart/i }).first();
    this.emptyCartMessage = page
      .locator('h3, p, [class*="empty"]')
      .filter({ hasText: /empty|no items/i })
      .first();
    this.continueShoppingLink = page.locator('a').filter({ hasText: /Continue Shopping/i }).first();
    this.itemCountLabel = page.locator('[data-testid="item-count"], .item-count').first();

    // Item rows — broad selector covering common cart table/list patterns
    this.cartItemRows = page.locator(
      '[data-testid="cart-item"], .cart-item, [class*="cart-item"], tr[data-item-id], .cart-row'
    );

    // Order summary
    this.subtotalDisplay = page
      .locator('span, td, p')
      .filter({ hasText: /Subtotal/i })
      .locator('..')
      .locator('span, td, p')
      .last();
    this.taxDisplay = page
      .locator('span, td, p')
      .filter({ hasText: /^Tax/i })
      .locator('..')
      .locator('span, td, p')
      .last();
    this.shippingDisplay = page
      .locator('span, td, p')
      .filter({ hasText: /^Shipping/i })
      .locator('..')
      .locator('span, td, p')
      .last();
    this.totalDisplay = page
      .locator('span, td, p')
      .filter({ hasText: /^Total$/i })
      .locator('..')
      .locator('span, td, p')
      .last();
    this.orderSummarySection = page.locator(
      '[data-testid="order-summary"], .order-summary, [class*="order-summary"]'
    );

    // Actions
    this.proceedToCheckoutButton = page
      .locator('button')
      .filter({ hasText: /Proceed to Checkout/i });
    this.clearCartButton = page
      .locator('button')
      .filter({ hasText: /Clear Cart|Empty Cart/i });
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/cart';
  }

  /**
   * Navigates to /cart and waits for the page to fully load.
   */
  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // State queries
  // ---------------------------------------------------------------------------

  /**
   * Returns true when the cart has no items.
   */
  async isEmpty(): Promise<boolean> {
    return this.isVisible(this.emptyCartMessage);
  }

  /**
   * Returns the total item count shown in the cart heading.
   * Parses "Shopping Cart (3)" → 3.
   * Falls back to counting rendered rows.
   */
  async getItemCount(): Promise<number> {
    try {
      const text = (await this.cartTitle.textContent()) ?? '';
      const match = text.match(/\((\d+)/);
      if (match) return parseInt(match[1], 10);
    } catch {
      // ignore
    }
    return this.cartItemRows.count();
  }

  // ---------------------------------------------------------------------------
  // Cart items
  // ---------------------------------------------------------------------------

  /**
   * Scrapes all cart item rows and returns structured data.
   * Uses robust multi-selector strategy to handle different cart layouts.
   */
  async getCartItems(): Promise<CartItem[]> {
    const items: CartItem[] = [];

    // Strategy 1: semantic data-testid or class-based rows
    let rows = this.cartItemRows;
    let count = await rows.count();

    // Strategy 2: fallback — flex rows containing both a product name and a Remove button
    if (count === 0) {
      rows = this.page
        .locator('[style*="flex"][style*="gap: 16px"]')
        .filter({ has: this.page.locator('button') });
      count = await rows.count();
    }

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      // Name
      const nameEl = row
        .locator(
          '[data-testid="item-name"], .item-name, p[style*="fontWeight: 600"], p[class*="font-semibold"]'
        )
        .first();
      const name = ((await nameEl.textContent()) ?? '').trim();
      if (!name) continue;

      // Price
      const priceEl = row
        .locator(
          '[data-testid="item-price"], .item-price, p[style*="4f46e5"], p[class*="price"]'
        )
        .first();
      const priceText = (await priceEl.textContent()) ?? '0';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

      // Quantity
      const qtyEl = row
        .locator(
          '[data-testid="item-qty"], .item-qty, span[style*="fontWeight: 600"], span[class*="qty"]'
        )
        .first();
      const qtyText = (await qtyEl.textContent()) ?? '1';
      const quantity = parseInt(qtyText, 10) || 1;

      // Line total
      const lineTotalEl = row
        .locator(
          '[data-testid="item-total"], .item-total, p[style*="fontWeight: 700"], p[class*="font-bold"]'
        )
        .first();
      const lineTotalText = (await lineTotalEl.textContent()) ?? '0';
      const lineTotal = parseFloat(lineTotalText.replace(/[^0-9.]/g, '')) || price * quantity;

      items.push({ name, price, quantity, lineTotal });
    }

    return items;
  }

  /**
   * Returns the locator for the cart item row matching the given product name.
   * Throws if the product is not found in the cart.
   */
  async getItemByName(name: string): Promise<Locator> {
    const row = this.cartItemRows.filter({ hasText: name }).first();
    await this.waitForElement(row);
    return row;
  }

  /**
   * Returns all product names currently in the cart.
   */
  async getProductNames(): Promise<string[]> {
    const items = await this.getCartItems();
    return items.map((i) => i.name);
  }

  /**
   * Returns true if the cart contains the given product (case-insensitive substring).
   */
  async hasProduct(productName: string): Promise<boolean> {
    const names = await this.getProductNames();
    return names.some((n) => n.toLowerCase().includes(productName.toLowerCase()));
  }

  /**
   * Returns the quantity of the specified product in the cart.
   * Returns 0 if the product is not present.
   */
  async getQuantityForProduct(productName: string): Promise<number> {
    const items = await this.getCartItems();
    const item = items.find((i) =>
      i.name.toLowerCase().includes(productName.toLowerCase())
    );
    return item?.quantity ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Quantity management
  // ---------------------------------------------------------------------------

  /**
   * Updates the quantity of a cart item by clicking the +/- stepper buttons.
   * @param productName - Item whose quantity to update.
   * @param newQty      - Target quantity (>= 1).
   */
  async updateItemQuantity(productName: string, newQty: number): Promise<void> {
    const itemRow = this.page
      .locator('div, tr, li')
      .filter({ hasText: productName })
      .first();

    const decreaseBtn = itemRow.locator('button').filter({ hasText: '−' }).first();
    const increaseBtn = itemRow.locator('button').filter({ hasText: '+' }).first();

    // Read current qty from the row
    const qtyEl = itemRow.locator('span[style*="fontWeight: 600"], .qty-display, [data-testid="qty"]').first();
    const qtyText = (await qtyEl.textContent()) ?? '1';
    const currentQty = parseInt(qtyText, 10) || 1;

    const diff = newQty - currentQty;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await this.clickWithRetry(increaseBtn);
        await this.page.waitForTimeout(200);
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        await this.clickWithRetry(decreaseBtn);
        await this.page.waitForTimeout(200);
      }
    }
    await this.waitForCartUpdate();
  }

  // ---------------------------------------------------------------------------
  // Remove / clear
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Remove" button on the cart row matching the given product name.
   */
  async removeItem(productName: string): Promise<void> {
    const itemRow = this.page
      .locator('div, tr, li')
      .filter({ hasText: productName })
      .first();
    const removeBtn = itemRow.locator('button').filter({ hasText: /Remove/i }).first();
    await this.waitForElement(removeBtn);
    await this.clickWithRetry(removeBtn);
    await this.waitForCartUpdate();
  }

  /** Alias for removeItem. */
  async removeItemByName(productName: string): Promise<void> {
    return this.removeItem(productName);
  }

  /**
   * Removes all items from the cart via the "Clear Cart" button.
   * Falls back to removing items one-by-one if the button is absent.
   */
  async clearCart(): Promise<void> {
    const clearVisible = await this.isVisible(this.clearCartButton);
    if (clearVisible) {
      await this.clickWithRetry(this.clearCartButton);
      await this.waitForCartUpdate();
      return;
    }
    // Fallback: remove items one by one
    let count = await this.getItemCount();
    while (count > 0) {
      const names = await this.getProductNames();
      if (names.length === 0) break;
      await this.removeItem(names[0]);
      count = await this.getItemCount();
    }
  }

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  /**
   * Returns the parsed subtotal amount.
   */
  async getSubtotal(): Promise<number> {
    return this.parseMoneyLocator(this.subtotalDisplay);
  }

  /**
   * Returns the parsed tax amount.
   */
  async getTax(): Promise<number> {
    return this.parseMoneyLocator(this.taxDisplay);
  }

  /**
   * Returns the parsed shipping amount.
   */
  async getShipping(): Promise<number> {
    return this.parseMoneyLocator(this.shippingDisplay);
  }

  /**
   * Returns the parsed grand total amount.
   */
  async getTotal(): Promise<number> {
    return this.parseMoneyLocator(this.totalDisplay);
  }

  /** Alias for getTotal — used in some test utility assertions. */
  async getTotalAmount(): Promise<number> {
    return this.getTotal();
  }

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Proceed to Checkout" button and waits for navigation to /checkout.
   */
  async proceedToCheckout(): Promise<void> {
    await this.waitForElement(this.proceedToCheckoutButton);
    await this.clickWithRetry(this.proceedToCheckoutButton);
    await this.page.waitForURL('**/checkout', {
      timeout: this.config.getDefaultTimeout(),
    });
  }

  // ---------------------------------------------------------------------------
  // Wait
  // ---------------------------------------------------------------------------

  /**
   * Waits for the cart to finish updating after a quantity change or removal.
   * Waits for any loading indicator to disappear and for the total to be visible.
   */
  async waitForCartUpdate(): Promise<void> {
    const loadingSpinner = this.page.locator('[aria-busy="true"], .loading, .spinner');
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Continue Shopping" link to return to the product listing.
   */
  async continueShopping(): Promise<void> {
    await this.clickWithRetry(this.continueShoppingLink);
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertHasItem(productName: string): Promise<void> {
    const hasIt = await this.hasProduct(productName);
    expect(hasIt, `Expected cart to contain "${productName}"`).toBe(true);
  }

  async assertDoesNotHaveItem(productName: string): Promise<void> {
    const hasIt = await this.hasProduct(productName);
    expect(hasIt, `Expected cart NOT to contain "${productName}"`).toBe(false);
  }

  async assertIsEmpty(): Promise<void> {
    await expect(this.emptyCartMessage).toBeVisible();
  }

  async assertItemCount(expected: number): Promise<void> {
    const count = await this.getItemCount();
    expect(count, `Expected ${expected} cart items, found ${count}`).toBe(expected);
  }

  async assertTotalGreaterThan(min: number): Promise<void> {
    const total = await this.getTotal();
    expect(total, `Expected cart total > ${min}, got ${total}`).toBeGreaterThan(min);
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
