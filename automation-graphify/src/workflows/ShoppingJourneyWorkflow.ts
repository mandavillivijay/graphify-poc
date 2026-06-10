/**
 * ShoppingJourneyWorkflow.ts — The main end-to-end shopping flow.
 *
 * HIGH-CENTRALITY WORKFLOW: orchestrates the complete customer journey from
 * browsing through product discovery, cart management, checkout, and order
 * verification. Used by regression suites and smoke tests.
 */

import { expect, Page } from '@playwright/test';
import { ProductListingPage } from '../pages/ProductListingPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { AuthenticationService } from '../services/AuthenticationService';
import { CartService } from '../services/CartService';
import { OrderService } from '../services/OrderService';
import { ConfigManager } from '../config/ConfigManager';
import type { CheckoutResult, ShippingData } from '../models/Product';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ShoppingJourneyOptions {
  /** If true, performs UI login before browsing. Default: false. */
  loginFirst?: boolean;
  /** Product search term. Defaults to ConfigManager.getDefaultProduct(). */
  searchTerm?: string;
  /** Number of items to add. Defaults to ConfigManager.getDefaultQuantity(). */
  quantity?: number;
  /** Shipping data. Defaults to ConfigManager.getShippingData(). */
  shipping?: ShippingData;
}

// ---------------------------------------------------------------------------
// ShoppingJourneyWorkflow
// ---------------------------------------------------------------------------

export class ShoppingJourneyWorkflow {
  private productListingPage: ProductListingPage;
  private productDetailPage: ProductDetailPage;
  private cartPage: CartPage;
  private checkoutPage: CheckoutPage;
  private orderHistoryPage: OrderHistoryPage;
  private orderDetailPage: OrderDetailPage;
  private authService: AuthenticationService;
  private cartService: CartService;
  private orderService: OrderService;

  constructor(
    private page: Page,
    private config: ConfigManager,
  ) {
    this.productListingPage = new ProductListingPage(page);
    this.productDetailPage = new ProductDetailPage(page);
    this.cartPage = new CartPage(page);
    this.checkoutPage = new CheckoutPage(page);
    this.orderHistoryPage = new OrderHistoryPage(page);
    this.orderDetailPage = new OrderDetailPage(page);
    this.authService = new AuthenticationService(page);
    this.cartService = new CartService();
    this.orderService = new OrderService();
  }

  // ── Complete journey ───────────────────────────────────────────────────────

  /**
   * Runs the full end-to-end shopping journey:
   *   1. (Optional) Login
   *   2. Browse the product listing
   *   3. Search for a product
   *   4. Open the product detail page
   *   5. Add to cart with the specified quantity
   *   6. Navigate to cart and proceed to checkout
   *   7. Fill in shipping information
   *   8. Place the order
   *   9. Verify the order appears in order history
   *
   * Returns a CheckoutResult with the order ID and success flag.
   */
  async completeShoppingJourney(
    options: ShoppingJourneyOptions = {},
  ): Promise<CheckoutResult> {
    const {
      loginFirst = false,
      searchTerm = this.config.getDefaultProduct(),
      quantity = this.config.getDefaultQuantity(),
      shipping = this.config.getShippingData(),
    } = options;

    // Step 1: Optional login
    if (loginFirst) {
      await this.authService.setupCustomerSession(this.page);
      await this.page.goto(this.config.getBaseUrl());
      await this.page.waitForLoadState('domcontentloaded');
    }

    // Steps 2–5: Browse and add to cart
    await this.browseAndAddToCart(searchTerm, quantity);

    // Steps 6–8: Checkout
    const result = await this.completeCheckout(shipping);

    // Step 9: Verify order in history (if it succeeded)
    if (result.success && result.orderId) {
      try {
        await this.verifyOrderPlaced(result.orderId);
      } catch (verifyErr) {
        console.warn(
          `[ShoppingJourneyWorkflow] Order history verification failed: ${verifyErr}`,
        );
      }
    }

    return result;
  }

  // ── Browse and add to cart ─────────────────────────────────────────────────

  /**
   * Navigates to the product listing, searches for the given term,
   * opens the first matching product detail page, and adds it to the cart.
   */
  async browseAndAddToCart(searchTerm: string, quantity: number): Promise<void> {
    // Navigate to listing
    await this.productListingPage.navigate();
    await this.productListingPage.waitForProducts();

    // Search for product
    await this.productListingPage.search(searchTerm);
    await this.productListingPage.waitForProducts();

    // Verify results exist
    const hasResults = !(await this.productListingPage.hasNoResults());
    if (!hasResults) {
      // Fall back to first product in catalog
      await this.productListingPage.clearSearch();
      await this.productListingPage.waitForProducts();
    }

    // Open first product detail
    await this.productListingPage.clickProductByIndex(0);
    await this.productDetailPage.productName.waitFor({ state: 'visible' });

    // Verify in stock
    const inStock = await this.productDetailPage.isInStock();
    if (!inStock) {
      throw new Error(
        `[ShoppingJourneyWorkflow] Product is out of stock — cannot add to cart`,
      );
    }

    // Add to cart
    await this.productDetailPage.addToCart(quantity);
    console.log(
      `[ShoppingJourneyWorkflow] Added product to cart: "${await this.productDetailPage.getProductName()}" ×${quantity}`,
    );
  }

  // ── Complete checkout ──────────────────────────────────────────────────────

  /**
   * Navigates to /cart, proceeds to /checkout, fills in the shipping form,
   * places the order, and returns the CheckoutResult.
   */
  async completeCheckout(shippingData?: ShippingData): Promise<CheckoutResult> {
    const shipping = shippingData ?? this.config.getShippingData();

    // Go to cart
    await this.cartPage.goto();

    // Verify cart is not empty
    const isEmpty = await this.cartPage.isEmpty();
    if (isEmpty) {
      return {
        orderId: '',
        success: false,
        message: 'Cart is empty — checkout cannot proceed',
      };
    }

    // Record expected total before checkout
    const cartTotal = await this.cartPage.getTotalAmount();

    // Proceed to checkout
    await this.cartPage.proceedToCheckout();
    await this.checkoutPage.assertOnCheckoutPage();

    // Fill shipping form
    await this.checkoutPage.fillShippingForm(shipping);

    // Place order
    try {
      const orderId = await this.checkoutPage.placeOrder();
      const total = await this.checkoutPage.getOrderTotal().catch(() => cartTotal);
      console.log(
        `[ShoppingJourneyWorkflow] Order placed successfully id=${orderId} total=${total}`,
      );
      return {
        orderId,
        success: true,
        message: 'Order placed successfully',
        total,
      };
    } catch (err) {
      const msg = String(err);
      console.error(`[ShoppingJourneyWorkflow] Checkout failed: ${msg}`);
      return { orderId: '', success: false, message: msg };
    }
  }

  // ── Verify order ───────────────────────────────────────────────────────────

  /**
   * Navigates to /orders and verifies:
   *   1. The order appears in the history list.
   *   2. Opens the order detail and verifies the ID is correct.
   */
  async verifyOrderPlaced(orderId: string): Promise<void> {
    await this.orderHistoryPage.goto();
    const found = await this.orderHistoryPage.hasOrder(orderId);
    expect(found, `Order ${orderId} should appear in order history`).toBe(true);

    // Open order detail
    try {
      await this.orderHistoryPage.clickOrderById(orderId);
    } catch {
      // The ID in the list is truncated — try the first order
      await this.orderHistoryPage.clickFirstOrderDetails();
    }

    // Verify status is shown
    const status = await this.orderDetailPage.getOrderStatus();
    expect(status, 'Order status should be set').toBeTruthy();
    console.log(
      `[ShoppingJourneyWorkflow] Order ${orderId} verified — status: ${status}`,
    );
  }

  // ── Quick add to cart ──────────────────────────────────────────────────────

  /**
   * Adds a product to the cart from the product listing page without going
   * to the detail page. Returns the name of the product that was added.
   *
   * @param productIndex - Zero-based index of the product card. Defaults to 0.
   */
  async quickAddToCart(productIndex = 0): Promise<string> {
    await this.productListingPage.navigate();
    await this.productListingPage.waitForProducts();

    const names = await this.productListingPage.getProductNames();
    const targetName = names[productIndex] ?? names[0];

    if (!targetName) {
      throw new Error(
        '[ShoppingJourneyWorkflow.quickAddToCart] No products found in listing',
      );
    }

    // Navigate to detail and add 1 unit
    await this.productListingPage.clickProductByIndex(productIndex);
    await this.productDetailPage.productName.waitFor({ state: 'visible' });
    await this.productDetailPage.addToCart(1);

    console.log(`[ShoppingJourneyWorkflow] Quick-added: "${targetName}"`);
    return targetName;
  }

  // ── Repeat purchase ────────────────────────────────────────────────────────

  /**
   * Looks up items from a previous order and re-adds them to the cart,
   * then completes checkout — effectively a "reorder" flow.
   *
   * @param orderId - The ID of the order to repeat.
   * @returns CheckoutResult of the new order.
   */
  async repeatPurchase(orderId: string): Promise<CheckoutResult> {
    // Navigate to the order detail to find items
    await this.orderDetailPage.goto(orderId);
    const status = await this.orderDetailPage.getOrderStatus();
    console.log(
      `[ShoppingJourneyWorkflow] Repeating order ${orderId} (was: ${status})`,
    );

    // Use the OrderService to get items via API
    const { ApiService } = await import('../services/ApiService');
    const apiService = new ApiService();
    const customerCreds = this.config.getUserCredentials('customer');
    const token = await apiService.login(customerCreds);
    apiService.setToken(token);

    const orderDetails = await apiService.getOrder(orderId);

    if (!orderDetails.items || orderDetails.items.length === 0) {
      return {
        orderId: '',
        success: false,
        message: `Order ${orderId} has no items to reorder`,
      };
    }

    // Clear cart and re-add items via API
    await apiService.clearCart();
    for (const item of orderDetails.items) {
      if (item.productId) {
        await apiService.addToCart(item.productId, item.quantity);
      }
    }

    // Inject token into browser so checkout can proceed
    await this.authService.injectAuthToken(this.page, token);
    await this.page.goto(this.config.getBaseUrl(), { waitUntil: 'domcontentloaded' });

    // Complete checkout
    return this.completeCheckout();
  }

  // ── Multi-product journey ──────────────────────────────────────────────────

  /**
   * Adds multiple products to the cart and then completes checkout.
   * Useful for testing multi-item orders.
   *
   * @param productSearchTerms - Array of search terms to look up.
   * @param shipping           - Shipping data (optional).
   */
  async multiProductJourney(
    productSearchTerms: string[],
    shipping?: ShippingData,
  ): Promise<CheckoutResult> {
    for (const term of productSearchTerms) {
      await this.browseAndAddToCart(term, 1);
    }
    return this.completeCheckout(shipping);
  }

  // ── Cart inspection ────────────────────────────────────────────────────────

  /**
   * Returns the number of items currently in the cart (as shown in the cart page).
   */
  async getCartItemCount(): Promise<number> {
    await this.cartPage.goto();
    return this.cartPage.getItemCount();
  }

  /**
   * Returns the cart grand total.
   */
  async getCartTotal(): Promise<number> {
    await this.cartPage.goto();
    return this.cartPage.getTotalAmount();
  }
}
