/**
 * CheckoutWorkflow.ts — Updated for App V2's 3-step checkout wizard.
 *
 * V2 Changes: The checkout flow now has 3 steps:
 *   Step 1: Shipping → Step 2: Payment → Step 3: Review + Place Order
 *
 * This workflow navigates through all 3 steps automatically.
 */

import { expect, Page } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { ConfigManager } from '../config/ConfigManager';
import type { CheckoutResult, ShippingData } from '../models/Product';

export class CheckoutWorkflow {
  private cartPage: CartPage;
  private checkoutPage: CheckoutPage;
  private orderHistoryPage: OrderHistoryPage;

  constructor(
    private page: Page,
    private config: ConfigManager,
  ) {
    this.cartPage = new CartPage(page);
    this.checkoutPage = new CheckoutPage(page);
    this.orderHistoryPage = new OrderHistoryPage(page);
  }

  // ── Step 1: Cart → Checkout ────────────────────────────────────────────────

  async proceedFromCartToCheckout(): Promise<void> {
    await this.cartPage.goto();
    const isEmpty = await this.cartPage.isEmpty();
    if (isEmpty) {
      throw new Error('[CheckoutWorkflow] Cannot proceed — cart is empty');
    }
    await this.cartPage.proceedToCheckout();
    // V2: confirm we're on step 1 of the wizard
    await this.checkoutPage.assertOnStep(1);
    console.log('[CheckoutWorkflow] Navigated to checkout step 1 (Shipping)');
  }

  // ── Step 2: Fill shipping → continue to Step 2 ────────────────────────────

  /**
   * Fills the shipping form on Step 1 and clicks "Continue" to advance to Step 2.
   */
  async fillShippingInformation(data: ShippingData): Promise<void> {
    await this.checkoutPage.fillShippingForm(data);
    await this.checkoutPage.continueToStep2();
    console.log(`[CheckoutWorkflow] Filled shipping for: ${data.name} — now on Step 2`);
  }

  async fillDefaultShipping(): Promise<void> {
    const defaultShipping = this.config.getShippingData();
    await this.fillShippingInformation(defaultShipping);
  }

  // ── Step 3: Fill payment → continue to Step 3 ─────────────────────────────

  /**
   * Fills the payment form on Step 2 and clicks "Continue" to advance to Step 3.
   */
  async fillPaymentInformation(cardNumber?: string, expiry?: string, cvv?: string): Promise<void> {
    await this.checkoutPage.fillPaymentForm(cardNumber, expiry, cvv);
    await this.checkoutPage.continueToStep3();
    console.log('[CheckoutWorkflow] Filled payment — now on Step 3 (Review)');
  }

  // ── Step 4: Review order summary (Step 3) ─────────────────────────────────

  async reviewOrderSummary(): Promise<{ items: string[]; total: number }> {
    await this.checkoutPage.assertOnStep(3);

    const summaryItems = this.checkoutPage.orderSummaryItems;
    const itemCount = await summaryItems.count();
    const items: string[] = [];
    for (let i = 0; i < itemCount; i++) {
      const text = ((await summaryItems.nth(i).textContent()) ?? '').trim();
      if (text) items.push(text);
    }

    const total = await this.checkoutPage.getOrderTotal().catch(() => 0);
    console.log(`[CheckoutWorkflow] Summary — items: ${items.length}, total: $${total}`);
    return { items, total };
  }

  // ── Step 5: Place order (Step 3) ──────────────────────────────────────────

  async placeOrder(): Promise<CheckoutResult> {
    try {
      const orderId = await this.checkoutPage.placeOrder();
      const total = await this.checkoutPage.getOrderTotal().catch(() => 0);
      console.log(`[CheckoutWorkflow] Order placed — id=${orderId} total=${total}`);
      return { orderId, success: true, message: 'Order placed successfully', total };
    } catch (err) {
      const msg = String(err);
      console.error(`[CheckoutWorkflow] Place order failed: ${msg}`);
      return { orderId: '', success: false, message: msg };
    }
  }

  // ── Step 6: Verify ────────────────────────────────────────────────────────

  async verifyOrderSuccess(orderId: string): Promise<void> {
    await this.checkoutPage.goToOrderHistory().catch(async () => {
      await this.page.goto(this.config.buildUrl('/orders'));
    });
    await this.orderHistoryPage.waitForPageLoad();
    const found = await this.orderHistoryPage.hasOrder(orderId);
    expect(found, `Order ${orderId} should appear in /orders`).toBe(true);
    console.log(`[CheckoutWorkflow] Verified order ${orderId} in history`);
  }

  // ── Full workflow (all 3 steps) ────────────────────────────────────────────

  /**
   * Runs the complete 3-step checkout:
   *   1. Navigate from cart to checkout
   *   2. Fill shipping → continue to Step 2
   *   3. Fill payment → continue to Step 3
   *   4. Place order from Step 3
   *   5. (Optionally) verify in order history
   */
  async runFullCheckout(shippingData?: ShippingData, verify = true): Promise<CheckoutResult> {
    await this.proceedFromCartToCheckout();

    if (shippingData) {
      await this.fillShippingInformation(shippingData);
    } else {
      await this.fillDefaultShipping();
    }

    // Step 2 — payment (mock cards accepted)
    await this.fillPaymentInformation();

    // Step 3 — review
    const summary = await this.reviewOrderSummary();
    console.log(`[CheckoutWorkflow] Placing order with ${summary.items.length} item(s)`);

    const result = await this.placeOrder();

    if (result.success && result.orderId && verify) {
      await this.verifyOrderSuccess(result.orderId);
    }

    return result;
  }

  // ── Validation testing ─────────────────────────────────────────────────────

  /**
   * Submits Step 1 with empty fields to trigger shipping validation errors.
   */
  async validateShippingForm(): Promise<string[]> {
    await this.checkoutPage.assertOnStep(1);
    // Clear all fields
    await this.checkoutPage.fillShippingForm({
      name: '', email: '', addressLine1: '', city: '', state: '', zip: '', country: '',
    });
    // Attempt to continue — triggers validation
    await this.checkoutPage.step1ContinueButton.click();
    await this.page.waitForTimeout(500);
    const errors = await this.checkoutPage.getFieldValidationErrors();
    console.log(`[CheckoutWorkflow] Validation errors: ${errors.join(', ')}`);
    return errors;
  }

  // ── Cancellation ──────────────────────────────────────────────────────────

  async cancelCheckout(): Promise<void> {
    await this.page.goBack();
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/cart')) {
      await this.cartPage.goto();
    }
    await this.cartPage.waitForPageLoad();
    console.log('[CheckoutWorkflow] Checkout cancelled — returned to cart');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async getCheckoutTotal(): Promise<number> {
    return this.checkoutPage.getOrderTotal();
  }

  async isReadyToOrder(): Promise<boolean> {
    return this.checkoutPage.isPlaceOrderEnabled();
  }

  async getPlaceOrderButtonLabel(): Promise<string> {
    return this.checkoutPage.getPlaceOrderButtonText();
  }
}
