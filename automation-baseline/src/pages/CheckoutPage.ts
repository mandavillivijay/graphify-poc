/**
 * CheckoutPage — Updated for App V2's 3-step checkout wizard.
 *
 * V2 Change: Single-page checkout replaced with:
 *   Step 1 — Shipping information
 *   Step 2 — Payment (mock)
 *   Step 3 — Review + Place Order
 *
 * Also supports guest checkout (CHANGE-4): unauthenticated users see
 * a guest/member toggle on Step 1.
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
  // Step indicator
  // ---------------------------------------------------------------------------

  readonly stepIndicator: Locator;
  readonly step1Container: Locator;
  readonly step2Container: Locator;
  readonly step3Container: Locator;

  // ---------------------------------------------------------------------------
  // Step 1 — Shipping form
  // ---------------------------------------------------------------------------

  readonly shippingNameInput: Locator;
  readonly shippingEmailInput: Locator;
  readonly shippingAddressInput: Locator;
  readonly shippingCityInput: Locator;
  readonly shippingStateInput: Locator;
  readonly shippingZipInput: Locator;
  readonly shippingCountryInput: Locator;
  readonly step1ContinueButton: Locator;

  // Guest checkout (CHANGE-4)
  readonly checkoutModeToggle: Locator;
  readonly checkoutAsGuestButton: Locator;
  readonly checkoutAsMemberButton: Locator;
  readonly guestEmailInput: Locator;

  // ---------------------------------------------------------------------------
  // Step 2 — Payment form
  // ---------------------------------------------------------------------------

  readonly cardNumberInput: Locator;
  readonly cardExpiryInput: Locator;
  readonly cardCvvInput: Locator;
  readonly cardNameInput: Locator;
  readonly step2ContinueButton: Locator;
  readonly step2BackButton: Locator;

  // ---------------------------------------------------------------------------
  // Step 3 — Review + Place Order
  // ---------------------------------------------------------------------------

  readonly orderSummaryItems: Locator;
  readonly orderSummaryItemNames: Locator;
  readonly orderSummaryTotal: Locator;
  readonly subtotalDisplay: Locator;
  readonly taxDisplay: Locator;
  readonly shippingCostDisplay: Locator;
  readonly placeOrderButton: Locator;
  readonly step3BackButton: Locator;

  // ---------------------------------------------------------------------------
  // Post-order confirmation
  // ---------------------------------------------------------------------------

  readonly orderSuccessCard: Locator;
  readonly orderIdDisplay: Locator;
  readonly viewOrdersButton: Locator;
  readonly errorBanner: Locator;
  readonly fieldValidationErrors: Locator;

  constructor(page: Page) {
    super(page);

    // Step containers
    this.stepIndicator = page.locator('[data-testid="checkout-step-indicator"]');
    this.step1Container = page.locator('[data-testid="checkout-step-1"]');
    this.step2Container = page.locator('[data-testid="checkout-step-2"]');
    this.step3Container = page.locator('[data-testid="checkout-step-3"]');

    // Step 1 — Shipping
    this.shippingNameInput = page.locator('#shippingName, input[name="name"], input[placeholder*="full name" i]').first();
    this.shippingEmailInput = page.locator('#shippingEmail, input[type="email"][name="email"]').first();
    this.shippingAddressInput = page.locator('#shippingAddressLine1, input[name="address"], input[placeholder*="address" i]').first();
    this.shippingCityInput = page.locator('#shippingCity, input[name="city"], input[placeholder*="city" i]').first();
    this.shippingStateInput = page.locator('#shippingState, input[name="state"], input[placeholder*="state" i]').first();
    this.shippingZipInput = page.locator('#shippingZip, input[name="zip"], input[placeholder*="zip" i]').first();
    this.shippingCountryInput = page.locator('#shippingCountry, input[name="country"], input[placeholder*="country" i]').first();
    this.step1ContinueButton = page.locator('[data-testid="step1-continue-btn"], button:has-text("Continue")').first();

    // Guest checkout
    this.checkoutModeToggle = page.locator('[data-testid="checkout-mode-toggle"]');
    this.checkoutAsGuestButton = page.locator('[data-testid="checkout-as-guest-btn"]');
    this.checkoutAsMemberButton = page.locator('[data-testid="checkout-as-member-btn"]');
    this.guestEmailInput = page.locator('[data-testid="guest-email-input"], input[placeholder*="guest email" i]');

    // Step 2 — Payment
    this.cardNumberInput = page.locator('#card-number, input[name="cardNumber"], input[placeholder*="card number" i]');
    this.cardExpiryInput = page.locator('#card-expiry, input[name="cardExpiry"], input[placeholder*="expiry" i]');
    this.cardCvvInput = page.locator('#card-cvv, input[name="cvv"], input[placeholder*="cvv" i]');
    this.cardNameInput = page.locator('#card-name, input[name="cardName"], input[placeholder*="name on card" i]');
    this.step2ContinueButton = page.locator('[data-testid="step2-continue-btn"], button:has-text("Continue")').first();
    this.step2BackButton = page.locator('[data-testid="step2-back-btn"], button:has-text("Back")').first();

    // Step 3 — Review
    this.orderSummaryItems = page.locator('[data-testid="order-summary-items"] li, [data-testid="summary-item"]');
    this.orderSummaryItemNames = page.locator('[data-testid="order-summary-items"] li span:first-child');
    this.orderSummaryTotal = page.locator('[data-testid="summary-total"]');
    this.subtotalDisplay = page.locator('[data-testid="summary-subtotal"]');
    this.taxDisplay = page.locator('[data-testid="summary-tax"]');
    this.shippingCostDisplay = page.locator('[data-testid="summary-shipping"]');
    this.placeOrderButton = page.locator('[data-testid="place-order-btn"], button:has-text("Place Order")').first();
    this.step3BackButton = page.locator('[data-testid="step3-back-btn"], button:has-text("Back")').first();

    // Confirmation
    this.orderSuccessCard = page.locator('[style*="f0fdf4"], .order-success, [class*="success"]').first();
    this.orderIdDisplay = page.locator('[data-testid="order-id"], strong[style*="monospace"], .order-id').first();
    this.viewOrdersButton = page.locator('button, a').filter({ hasText: /View My Orders|View Orders/i }).first();
    this.errorBanner = page.locator('[role="alert"], .error-banner, [style*="fef2f2"]').first();
    this.fieldValidationErrors = page.locator('p[style*="dc2626"], .field-error, .validation-error');
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
  // Step navigation
  // ---------------------------------------------------------------------------

  /** Clicks "Continue" on Step 1 to advance to Step 2 (Payment). */
  async continueToStep2(): Promise<void> {
    await this.clickWithRetry(this.step1ContinueButton);
    await this.step2Container.waitFor({ state: 'visible', timeout: 8000 });
  }

  /** Clicks "Continue" on Step 2 to advance to Step 3 (Review). */
  async continueToStep3(): Promise<void> {
    await this.clickWithRetry(this.step2ContinueButton);
    await this.step3Container.waitFor({ state: 'visible', timeout: 8000 });
  }

  /** Clicks "Back" on Step 2 to return to Step 1 (Shipping). */
  async backToStep1(): Promise<void> {
    await this.clickWithRetry(this.step2BackButton);
    await this.step1Container.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Clicks "Back" on Step 3 to return to Step 2 (Payment). */
  async backToStep2(): Promise<void> {
    await this.clickWithRetry(this.step3BackButton);
    await this.step2Container.waitFor({ state: 'visible', timeout: 5000 });
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Shipping form filling
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
      await this.shippingStateInput.selectOption({ value: state }).catch(() =>
        this.shippingStateInput.selectOption({ label: state })
      );
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
      await this.shippingCountryInput.selectOption({ value: country }).catch(() =>
        this.shippingCountryInput.selectOption({ label: country })
      );
    } else {
      await this.fillInput(this.shippingCountryInput, country);
    }
  }

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

  async fillShippingInfo(data?: ShippingData): Promise<void> {
    return this.fillShippingForm(data);
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Payment form
  // ---------------------------------------------------------------------------

  async fillPaymentForm(cardNumber = '4111111111111111', expiry = '12/26', cvv = '123', nameOnCard = 'Test User'): Promise<void> {
    await this.fillInput(this.cardNumberInput, cardNumber);
    await this.fillInput(this.cardExpiryInput, expiry);
    await this.fillInput(this.cardCvvInput, cvv);
    await this.fillInput(this.cardNameInput, nameOnCard);
  }

  // ---------------------------------------------------------------------------
  // Guest checkout (CHANGE-4)
  // ---------------------------------------------------------------------------

  async selectGuestCheckout(): Promise<void> {
    const visible = await this.isVisible(this.checkoutAsGuestButton);
    if (visible) await this.clickWithRetry(this.checkoutAsGuestButton);
  }

  async fillGuestEmail(email: string): Promise<void> {
    await this.fillInput(this.guestEmailInput, email);
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Order summary
  // ---------------------------------------------------------------------------

  async getOrderSummaryItems(): Promise<string[]> {
    try {
      await this.orderSummaryItemNames.first().waitFor({ state: 'visible', timeout: 5000 });
      return this.getAllTextContents(this.orderSummaryItemNames);
    } catch {
      return this.getAllTextContents(this.orderSummaryItems);
    }
  }

  async getOrderTotal(): Promise<number> {
    try {
      const text = await this.orderSummaryTotal.textContent() ?? '0';
      return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  async getSubtotal(): Promise<number> {
    return this.parseMoneyLocator(this.subtotalDisplay);
  }

  async getTax(): Promise<number> {
    return this.parseMoneyLocator(this.taxDisplay);
  }

  async getShippingCost(): Promise<number> {
    return this.parseMoneyLocator(this.shippingCostDisplay);
  }

  // ---------------------------------------------------------------------------
  // Order placement (Step 3)
  // ---------------------------------------------------------------------------

  async placeOrder(): Promise<string> {
    await this.clickWithRetry(this.placeOrderButton);
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

  async getOrderId(): Promise<string> {
    try {
      await this.orderIdDisplay.waitFor({ state: 'visible', timeout: 10000 });
      const shortId = await this.getTextContent(this.orderIdDisplay);
      return shortId.replace('...', '').trim();
    } catch {
      const url = await this.getCurrentUrl();
      const match = url.match(/\/orders\/([^/?#]+)/);
      return match ? match[1] : '';
    }
  }

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

  async isOrderSuccessful(): Promise<boolean> {
    return this.isVisible(this.orderSuccessCard);
  }

  // ---------------------------------------------------------------------------
  // Errors / validation
  // ---------------------------------------------------------------------------

  async getErrorMessage(): Promise<string> {
    try {
      return await this.getTextContent(this.errorBanner);
    } catch {
      return '';
    }
  }

  async getValidationErrors(): Promise<string[]> {
    try {
      await this.fieldValidationErrors.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      return [];
    }
    return this.getAllTextContents(this.fieldValidationErrors);
  }

  async getFieldValidationErrors(): Promise<string[]> {
    return this.getValidationErrors();
  }

  async hasValidationErrors(): Promise<boolean> {
    return this.isVisible(this.fieldValidationErrors);
  }

  async getPlaceOrderButtonText(): Promise<string> {
    return this.getTextContent(this.placeOrderButton);
  }

  async isPlaceOrderEnabled(): Promise<boolean> {
    return this.isEnabled(this.placeOrderButton);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goToOrderHistory(): Promise<void> {
    await this.clickWithRetry(this.viewOrdersButton);
    await this.page.waitForURL('**/orders', { timeout: this.config.getDefaultTimeout() });
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertOnCheckoutPage(): Promise<void> {
    // In V2, step 1 is visible initially
    await expect(this.step1Container).toBeVisible({ timeout: 10000 });
  }

  async assertOnStep(step: 1 | 2 | 3): Promise<void> {
    const containers = [this.step1Container, this.step2Container, this.step3Container];
    await expect(containers[step - 1]).toBeVisible({ timeout: 8000 });
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
