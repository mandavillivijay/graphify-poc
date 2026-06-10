/**
 * OrderService.ts — UI and API order management service.
 *
 * HIGH-CENTRALITY SERVICE: used by fixtures (pageWithCart), ShoppingJourneyWorkflow,
 * CheckoutWorkflow, and individual test cases.
 *
 * Provides both UI-driven checkout flows and fast API-based order creation
 * for test setup.
 */

import { Page } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { ApiService } from './ApiService';
import { ConfigManager } from '../config/ConfigManager';
import type { ShippingData, CheckoutResult, OrderData } from '../models/Product';

export class OrderService {
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  // ── UI-level order operations ──────────────────────────────────────────────

  /**
   * Drives the full checkout flow from the cart page:
   *   1. Navigates to /cart
   *   2. Clicks "Proceed to Checkout"
   *   3. Fills in the shipping form
   *   4. Places the order
   *   5. Returns the CheckoutResult
   *
   * Uses the default shipping data from ConfigManager if none is provided.
   */
  async placeOrderFromCart(
    page: Page,
    shippingData?: ShippingData,
  ): Promise<CheckoutResult> {
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const shipping = shippingData ?? this.config.getShippingData();

    // Ensure we are on the cart page and it has items
    await cartPage.goto();
    const isEmpty = await cartPage.isEmpty();
    if (isEmpty) {
      return {
        orderId: '',
        success: false,
        message: 'Cart is empty — cannot place order',
      };
    }

    // Proceed to checkout
    await cartPage.proceedToCheckout();
    await checkoutPage.assertOnCheckoutPage();

    // Fill shipping
    await checkoutPage.fillShippingForm(shipping);

    // Submit
    try {
      const orderId = await checkoutPage.placeOrder();
      return { orderId, success: true, message: 'Order placed successfully' };
    } catch (err) {
      return {
        orderId: '',
        success: false,
        message: String(err),
      };
    }
  }

  /**
   * End-to-end convenience method:
   *   1. Navigates to the product listing
   *   2. Adds the default product to the cart
   *   3. Proceeds through checkout with default shipping
   *   4. Returns the CheckoutResult
   */
  async placeTestOrder(page: Page): Promise<CheckoutResult> {
    const { ProductService } = await import('./ProductService');
    const productService = new ProductService(page);
    const defaultProduct = this.config.getDefaultProduct();
    const defaultQty = this.config.getDefaultQuantity();

    await productService.addProductToCartBySearch(page, defaultProduct, defaultQty);
    return this.placeOrderFromCart(page);
  }

  /**
   * Navigates to /orders and checks whether an order with the given ID
   * is visible in the history list.
   */
  async verifyOrderInHistory(page: Page, orderId: string): Promise<boolean> {
    const historyPage = new OrderHistoryPage(page);
    await historyPage.goto();
    return historyPage.hasOrder(orderId);
  }

  /**
   * Navigates to /orders and returns the ID of the most recently placed order.
   * Throws if there are no orders.
   */
  async getLatestOrderId(page: Page): Promise<string> {
    const historyPage = new OrderHistoryPage(page);
    await historyPage.goto();
    return historyPage.getLatestOrderId();
  }

  /**
   * Navigates to /orders/:id and returns a structured OrderData object
   * by scraping the order detail page.
   */
  async getOrderDetails(page: Page, orderId: string): Promise<OrderData> {
    const detailPage = new OrderDetailPage(page);
    await detailPage.goto(orderId);

    const status = await detailPage.getOrderStatus();
    const total = await detailPage.getOrderTotal();
    const idText = await detailPage.getOrderIdText();

    return {
      id: idText || orderId,
      status,
      total,
      subtotal: 0,
      tax: 0,
      shipping: 0,
      createdAt: new Date().toISOString(),
      items: [],
    };
  }

  /**
   * Fast order creation via API:
   *   1. Adds the first available product to the cart
   *   2. Places the order
   *   3. Returns the full OrderData
   *
   * Requires an ApiService instance with a customer token already set.
   */
  async createOrderViaApi(apiService: ApiService): Promise<OrderData> {
    // Get a product to order
    const products = await apiService.getProducts({
      in_stock: 'true',
      limit: '5',
    });
    if (products.length === 0) {
      throw new Error('OrderService.createOrderViaApi: no in-stock products found');
    }

    // Clear any existing cart state
    await apiService.clearCart();

    // Add the first product
    const product = products[0];
    await apiService.addToCart(product.id!, 1);

    // Place the order
    const shipping = this.config.getShippingData();
    const order = await apiService.createOrder(shipping);
    console.log(`[OrderService API] Order created id=${order.id} total=${order.total}`);
    return order;
  }

  /**
   * Navigates to /orders and then to the specific order detail page,
   * verifying the order appears in the history list.
   */
  async navigateToOrderDetail(page: Page, orderId: string): Promise<void> {
    const historyPage = new OrderHistoryPage(page);
    await historyPage.goto();
    await historyPage.clickOrderById(orderId);
  }

  /**
   * Returns a summary of all orders for the authenticated user via the API.
   */
  async getAllOrdersViaApi(apiService: ApiService): Promise<OrderData[]> {
    return apiService.getOrders();
  }

  /**
   * Returns a single order by ID via the API.
   */
  async getOrderByIdViaApi(
    apiService: ApiService,
    orderId: string,
  ): Promise<OrderData> {
    return apiService.getOrder(orderId);
  }
}
