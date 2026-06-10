/**
 * CheckoutWorkflow.ts — Detailed checkout process workflow.
 *
 * HIGH-CENTRALITY WORKFLOW: provides granular step control over the checkout
 * process. Useful for tests that need to inspect intermediate states
 * (order summary validation, field validation, cancellation) as well as
 * for the full happy-path flow.
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

  /**
   * Navigates to /cart and clicks the "Proceed to Checkout" button.
   * Waits for the checkout page to be visible.
   *
   * Precondition: the cart must have at least one item.
   */
  async proceedFromCartToCheckout(): Promise<void> {
    await this.cartPage.goto();
    const isEmpty = await this.cartPage.isEmpty();
    if (isEmpty) {
      throw new Error('[CheckoutWorkflow] Cannot proceed — cart is empty');
    }
    await this.cartPage.proceedToCheckout();
    await this.checkoutPage.assertOnCheckoutPage();
    console.log('[CheckoutWorkflow] Navigated to checkout page');
  }

  // ── Step 2: Fill shipping ──────────────────────────────────────────────────

  /**
   * Fills the checkout shipping form using the provided ShippingData.
   */
  async fillShippingInformation(data: ShippingData): Promise<void> {
    await this.checkoutPage.fillShippingForm(data);
    console.log(`[CheckoutWorkflow] Filled shipping for: ${data.name}`);
  }

  /**
   * Fills the checkout shipping form using the default shipping data
   * from ConfigManager.
   */
  async fillDefaultShipping(): Promise<void> {
    const defaultShipping = this.config.getShippingData();
    await this.fillShippingInformation(defaultShipping);
  }

  // ── Step 3: Review order summary ──────────────────────────────────────────

  /**
   * Reads the order summary panel on the checkout page and returns
   * the list of item name+qty strings and the grand total.
   *
   * @returns { items: string[], total: number }
   */
  async reviewOrderSummary(): Promise<{ items: string[]; total: number }> {
    await this.checkoutPage.assertOnCheckoutPage();

    // Collect item labels from the summary panel
    const summaryItems = this.checkoutPage.orderSummaryItems;
    const itemCount = await summaryItems.count();
    const items: string[] = [];
    for (let i = 0; i < itemCount; i++) {
      const text = ((await summaryItems.nth(i).textContent()) ?? '').trim();
      if (text) items.push(text);
    }

    const total = await this.checkoutPage.getOrderTotal().catch(() => 0);
    console.log(
      `[CheckoutWorkflow] Summary — items: ${items.length}, total: $${total}`,
    );
    return { items, total };
  }

  // ── Step 4: Place order ────────────────────────────────────────────────────

  /**
   * Clicks the "Place Order" button, waits for the success confirmation
   * or error banner, and returns a CheckoutResult.
   */
  async placeOrder(): Promise<CheckoutResult> {
    try {
      const orderId = await this.checkoutPage.placeOrder();
      const total = await this.checkoutPage.getOrderTotal().catch(() => 0);
      console.log(
        `[CheckoutWorkflow] Order placed — id=${orderId} total=${total}`,
      );
      return { orderId, success: true, message: 'Order placed successfully', total };
    } catch (err) {
      const msg = String(err);
      console.error(`[CheckoutWorkflow] Place order failed: ${msg}`);
      return { orderId: '', success: false, message: msg };
    }
  }

  // ── Step 5: Verify order success ──────────────────────────────────────────

  /**
   * Navigates to /orders and asserts that the given orderId appears
   * in the order history list.
   *
   * Throws if the order is not found.
   */
  async verifyOrderSuccess(orderId: string): Promise<void> {
    await this.checkoutPage.goToOrderHistory().catch(async () => {
      // If the button is gone (navigated away), go directly
      await this.page.goto(this.config.buildUrl('/orders'));
    });

    await this.orderHistoryPage.waitForPageLoad();
    const found = await this.orderHistoryPage.hasOrder(orderId);
    expect(found, `Order ${orderId} should appear in /orders`).toBe(true);
    console.log(`[CheckoutWorkflow] Verified order ${orderId} in history`);
  }

  // ── Full workflow ──────────────────────────────────────────────────────────

  /**
   * Runs the complete checkout workflow in sequence:
   *   1. Cart → Checkout
   *   2. Fill shipping (default or provided)
   *   3. Review summary
   *   4. Place order
   *   5. (Optionally) verify in order history
   *
   * @param shippingData - Optional custom shipping data.
   * @param verify       - Whether to verify in order history (default true).
   */
  async runFullCheckout(
    shippingData?: ShippingData,
    verify = true,
  ): Promise<CheckoutResult> {
    await this.proceedFromCartToCheckout();

    if (shippingData) {
      await this.fillShippingInformation(shippingData);
    } else {
      await this.fillDefaultShipping();
    }

    const summary = await this.reviewOrderSummary();
    console.log(
      `[CheckoutWorkflow] Placing order with ${summary.items.length} item(s)`,
    );

    const result = await this.placeOrder();

    if (result.success && result.orderId && verify) {
      await this.verifyOrderSuccess(result.orderId);
    }

    return result;
  }

  // ── Validation testing ─────────────────────────────────────────────────────

  /**
   * Attempts to place an order without filling in shipping information.
   * Returns an array of validation error messages shown below the fields.
   *
   * Useful for negative tests verifying required-field validation.
   */
  async validateShippingForm(): Promise<string[]> {
    await this.checkoutPage.assertOnCheckoutPage();

    // Clear all fields first
    await this.checkoutPage.fillShippingForm({
      name: '',
      email: '',
      addressLine1: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    });

    // Click Place Order to trigger validation
    await this.checkoutPage.placeOrderButton.click();
    await this.page.waitForTimeout(500);

    // Collect validation errors
    const errors = await this.checkoutPage.getFieldValidationErrors();
    console.log(`[CheckoutWorkflow] Validation errors: ${errors.join(', ')}`);
    return errors;
  }

  /**
   * Submits the checkout form with only partial data to test individual
   * field validation. Returns the error messages.
   */
  async validatePartialShippingData(partialData: Partial<ShippingData>): Promise<string[]> {
    await this.checkoutPage.assertOnCheckoutPage();

    // Fill only the provided fields
    if (partialData.name !== undefined) {
      await this.checkoutPage.fillShippingForm({
        name: partialData.name,
        email: partialData.email ?? '',
        addressLine1: partialData.addressLine1 ?? '',
        city: partialData.city ?? '',
        state: partialData.state ?? '',
        zip: partialData.zip ?? '',
        country: partialData.country ?? '',
      });
    }

    await this.checkoutPage.placeOrderButton.click();
    await this.page.waitForTimeout(500);
    return this.checkoutPage.getFieldValidationErrors();
  }

  // ── Cancellation ──────────────────────────────────────────────────────────

  /**
   * Cancels checkout by navigating back to the cart page.
   * Uses the browser back button or directly navigates to /cart.
   */
  async cancelCheckout(): Promise<void> {
    // Try clicking the browser back button
    await this.page.goBack();
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/cart')) {
      await this.cartPage.goto();
    }
    await this.cartPage.waitForPageLoad();
    console.log('[CheckoutWorkflow] Checkout cancelled — returned to cart');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Returns the current checkout page total displayed in the order summary.
   */
  async getCheckoutTotal(): Promise<number> {
    return this.checkoutPage.getOrderTotal();
  }

  /**
   * Returns true if the Place Order button is enabled (ready to submit).
   */
  async isReadyToOrder(): Promise<boolean> {
    return this.checkoutPage.isPlaceOrderEnabled();
  }

  /**
   * Returns the label text on the Place Order button (e.g. "Place Order — $49.99").
   */
  async getPlaceOrderButtonLabel(): Promise<string> {
    return this.checkoutPage.getPlaceOrderButtonText();
  }
}
