/**
 * CheckoutPage — HIGH-CENTRALITY page object for the ShopHub /checkout route.
 *
 * Covers the shipping information form, order summary panel,
 * order placement, confirmation, and validation error feedback.
 *
 * Central to many test scenarios: happy-path orders, validation,
 * guest checkout, and order history verification flows.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { ShippingData } from '../models/Product';

export interface OrderConfirmation {
  orderId: string;
  message: string;
}

export interface CheckoutSummaryItem {
  name: string;
  quantity: number;
  lineTotal: number;
}

export class CheckoutPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Shipping form (specific IDs from observed app HTML)
  // ---------------------------------------------------------------------------

  readonly shippingNameInput: Locator;
  readonly shippingEmailInput: Locator;
  readonly shippingAddressInput: Locator;
  readonly shippingCityInput: Locator;
  readonly shippingStateInput: Locator;
  readonly shippingZipInput: Locator;
  readonly shippingCountryInput: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Order summary
  // ---------------------------------------------------------------------------

  readonly orderSummaryItems: Locator;
  readonly orderSummaryItemNames: Locator;
  readonly orderSummaryTotal: Locator;
  readonly subtotalDisplay: Locator;
  readonly taxDisplay: Locator;
  readonly shippingCostDisplay: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Submit & feedback
  // ---------------------------------------------------------------------------

  readonly placeOrderButton: Locator;
  readonly orderSuccessCard: Locator;
  readonly orderIdDisplay: Locator;
  readonly viewOrdersButton: Locator;
  readonly errorBanner: Locator;
  readonly fieldValidationErrors: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);

    // Shipping form — ID-based selectors first, fall back to name/placeholder
    this.shippingNameInput = page.locator('#shippingName, input[name="name"], input[placeholder*="full name" i]').first();
    this.shippingEmailInput = page.locator('#shippingEmail, input[type="email"], input[name="email"]').first();
    this.shippingAddressInput = page.locator('#shippingAddressLine1, input[name="address"], input[placeholder*="address" i]').first();
    this.shippingCityInput = page.locator('#shippingCity, input[name="city"], input[placeholder*="city" i]').first();
    this.shippingStateInput = page.locator('#shippingState, input[name="state"], input[placeholder*="state" i]').first();
    this.shippingZipInput = page.locator('#shippingZip, input[name="zip"], input[placeholder*="zip" i]').first();
    this.shippingCountryInput = page.locator('#shippingCountry, input[name="country"], input[placeholder*="country" i]').first();

    // Order summary
    this.orderSummaryItems = page.locator(
      '[data-testid="summary-item"], .order-summary-item, [style*="flex"][style*="justifyContent: space-between"]'
    ).filter({ has: page.locator('span') });
    this.orderSummaryItemNames = page.locator(
      '[data-testid="summary-item-name"], .summary-item-name'
    );
    this.orderSummaryTotal = page.locator('span[style*="fontWeight: 700"][style*="16px"]').last();
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
    this.shippingCostDisplay = page
      .locator('span, p, td')
      .filter({ hasText: /^Shipping/i })
      .locator('..')
      .locator('span, p, td')
      .last();

    // Submit & feedback
    this.placeOrderButton = page.locator('button[type="submit"], button:has-text("Place Order")').first();
    this.orderSuccessCard = page.locator('[style*="f0fdf4"], .order-success, [class*="success"]').first();
    this.orderIdDisplay = page.locator('strong[style*="monospace"], [data-testid="order-id"], .order-id').first();
    this.viewOrdersButton = page.locator('button, a').filter({ hasText: /View My Orders|View Orders/i }).first();
    this.errorBanner = page.locator('[style*="fef2f2"], [role="alert"], .error-banner').filter({
      has: page.locator(':text-matches("Failed|Error", "i")'),
    }).first();
    this.fieldValidationErrors = page.locator(
      'p[style*="dc2626"], .field-error, .validation-error, [class*="error"]'
    );
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /checkout/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/checkout';
  }

  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Form filling — individual fields
  // ---------------------------------------------------------------------------

  async fillName(name: string): Promise<void> {
    await this.fillInput(this.shippingNameInput, name);
  }

  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.shippingEmailInput, email);
  }

  async fillAddress(addressLine1: string): Promise<void> {
    await this.fillInput(this.shippingAddressInput, addressLine1);
  }

  async fillCity(city: string): Promise<void> {
    await this.fillInput(this.shippingCityInput, city);
  }

  async fillState(state: string): Promise<void> {
    const tagName = await this.shippingStateInput.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await this.shippingStateInput
        .selectOption({ value: state })
        .catch(() => this.shippingStateInput.selectOption({ label: state }));
    } else {
      await this.fillInput(this.shippingStateInput, state);
    }
  }

  async fillZip(zip: string): Promise<void> {
    await this.fillInput(this.shippingZipInput, zip);
  }

  async fillCountry(country: string): Promise<void> {
    const tagName = await this.shippingCountryInput.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await this.shippingCountryInput
        .selectOption({ value: country })
        .catch(() => this.shippingCountryInput.selectOption({ label: country }));
    } else {
      await this.fillInput(this.shippingCountryInput, country);
    }
  }

  // ---------------------------------------------------------------------------
  // Form filling — complete shipping info
  // ---------------------------------------------------------------------------

  /**
   * Fills all shipping information fields from a ShippingData object.
   * Uses ConfigManager defaults when called without args.
   */
  async fillShippingForm(data?: ShippingData): Promise<void> {
    const shippingData = data ?? this.config.getShippingData();
    await this.fillName(shippingData.name);
    await this.fillEmail(shippingData.email);
    await this.fillAddress(shippingData.addressLine1);
    await this.fillCity(shippingData.city);
    await this.fillState(shippingData.state);
    await this.fillZip(shippingData.zip);
    await this.fillCountry(shippingData.country);
  }

  /** Alias for fillShippingForm — matches the spec method name. */
  async fillShippingInfo(data?: ShippingData): Promise<void> {
    return this.fillShippingForm(data);
  }

  // ---------------------------------------------------------------------------
  // Order summary queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the names of all line items shown in the order summary panel.
   */
  async getOrderSummaryItems(): Promise<string[]> {
    try {
      await this.orderSummaryItemNames.first().waitFor({ state: 'visible', timeout: 5000 });
      return this.getAllTextContents(this.orderSummaryItemNames);
    } catch {
      return this.getAllTextContents(this.orderSummaryItems);
    }
  }

  /**
   * Returns the grand order total as a number.
   */
  async getOrderTotal(): Promise<number> {
    try {
      const text = await this.orderSummaryTotal.textContent() ?? '0';
      return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Returns the subtotal from the order summary.
   */
  async getSubtotal(): Promise<number> {
    return this.parseMoneyLocator(this.subtotalDisplay);
  }

  /**
   * Returns the tax amount from the order summary.
   */
  async getTax(): Promise<number> {
    return this.parseMoneyLocator(this.taxDisplay);
  }

  /**
   * Returns the shipping cost from the order summary.
   */
  async getShippingCost(): Promise<number> {
    return this.parseMoneyLocator(this.shippingCostDisplay);
  }

  // ---------------------------------------------------------------------------
  // Order placement
  // ---------------------------------------------------------------------------

  /**
   * Clicks "Place Order" and waits for confirmation.
   * Returns the order ID from the confirmation screen.
   * Throws if the order fails (error banner visible).
   */
  async placeOrder(): Promise<string> {
    await this.clickWithRetry(this.placeOrderButton);
    // Wait for either success state or error banner
    await Promise.race([
      this.orderSuccessCard.waitFor({ state: 'visible', timeout: 15000 }),
      this.errorBanner.waitFor({ state: 'visible', timeout: 15000 }),
    ]);
    const isSuccess = await this.isVisible(this.orderSuccessCard);
    if (!isSuccess) {
      const errMsg = await this.getErrorMessage();
      throw new Error(`Order placement failed: ${errMsg}`);
    }
    return this.getOrderId();
  }

  /**
   * Extracts and returns the displayed order ID text from the confirmation.
   */
  async getOrderId(): Promise<string> {
    try {
      await this.orderIdDisplay.waitFor({ state: 'visible', timeout: 10000 });
      const shortId = await this.getTextContent(this.orderIdDisplay);
      return shortId.replace('...', '').trim();
    } catch {
      // Try parsing from URL
      const url = await this.getCurrentUrl();
      const match = url.match(/\/orders\/([^/?#]+)/);
      return match ? match[1] : '';
    }
  }

  /**
   * Returns the full order confirmation { orderId, message }.
   */
  async getOrderConfirmation(): Promise<OrderConfirmation> {
    const orderId = await this.getOrderId();
    const messageEl = this.page.locator('h2, h3, p').filter({ hasText: /order|success|thank/i }).first();
    let message = '';
    try {
      await messageEl.waitFor({ state: 'visible', timeout: 5000 });
      message = await this.getTextContent(messageEl);
    } catch {
      message = 'Order placed successfully';
    }
    return { orderId, message };
  }

  /**
   * Returns true when the order confirmation / success state is visible.
   */
  async isOrderSuccessful(): Promise<boolean> {
    const successVisible = await this.isVisible(this.orderSuccessCard);
    if (successVisible) return true;
    const url = await this.getCurrentUrl();
    return /\/orders\//.test(url) || /confirmation|success/i.test(url);
  }

  // ---------------------------------------------------------------------------
  // Error / validation
  // ---------------------------------------------------------------------------

  /**
   * Returns the error banner message text.
   */
  async getErrorMessage(): Promise<string> {
    try {
      return await this.getTextContent(this.errorBanner);
    } catch {
      return '';
    }
  }

  /**
   * Returns all visible field validation error messages as a string array.
   */
  async getValidationErrors(): Promise<string[]> {
    try {
      await this.fieldValidationErrors.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      return [];
    }
    return this.getAllTextContents(this.fieldValidationErrors);
  }

  /** Alias for getValidationErrors. */
  async getFieldValidationErrors(): Promise<string[]> {
    return this.getValidationErrors();
  }

  /**
   * Returns true if any validation error is currently visible.
   */
  async hasValidationErrors(): Promise<boolean> {
    return this.isVisible(this.fieldValidationErrors);
  }

  /**
   * Returns the "Place Order" button text (may change to "Placing…" during submit).
   */
  async getPlaceOrderButtonText(): Promise<string> {
    return this.getTextContent(this.placeOrderButton);
  }

  /**
   * Returns true if the "Place Order" button is enabled.
   */
  async isPlaceOrderEnabled(): Promise<boolean> {
    return this.isEnabled(this.placeOrderButton);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Clicks "View My Orders" on the confirmation screen.
   */
  async goToOrderHistory(): Promise<void> {
    await this.clickWithRetry(this.viewOrdersButton);
    await this.page.waitForURL('**/orders', { timeout: this.config.getDefaultTimeout() });
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertOnCheckoutPage(): Promise<void> {
    await expect(this.shippingNameInput).toBeVisible();
    await expect(this.placeOrderButton).toBeVisible();
  }

  async assertOrderSuccess(): Promise<void> {
    await expect(this.orderSuccessCard).toBeVisible({ timeout: 15000 });
  }

  async assertNoValidationErrors(): Promise<void> {
    const errors = await this.getValidationErrors();
    expect(errors, 'Expected no validation errors').toHaveLength(0);
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
