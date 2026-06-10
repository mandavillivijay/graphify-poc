/**
 * CartService.ts — UI-level cart management service.
 *
 * Provides helpers for adding multiple products, verifying cart contents,
 * computing totals, and fast API-level cart setup/teardown for test fixtures.
 */

import { Page } from '@playwright/test';
import { ProductListingPage } from '../pages/ProductListingPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { ApiService } from './ApiService';
import { ConfigManager } from '../config/ConfigManager';
import type { CartItemData } from '../models/Product';

export class CartService {
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  // ── UI-level cart operations ───────────────────────────────────────────────

  /**
   * Adds multiple products to the cart by searching for each product name
   * and adding the requested quantity from the detail page.
   *
   * @param page     - Active Playwright Page.
   * @param products - Array of { name: string, qty: number } objects.
   */
  async addMultipleProductsToCart(
    page: Page,
    products: Array<{ name: string; qty: number }>,
  ): Promise<void> {
    const listingPage = new ProductListingPage(page);
    const detailPage = new ProductDetailPage(page);

    for (const product of products) {
      // Navigate to listing and search
      await listingPage.navigate();
      await listingPage.search(product.name);
      await listingPage.waitForProducts();

      // Click first matching result
      const names = await listingPage.getProductNames();
      const match = names.find((n) =>
        n.toLowerCase().includes(product.name.toLowerCase()),
      );
      if (!match) {
        throw new Error(
          `CartService: Product "${product.name}" not found in listing`,
        );
      }
      await listingPage.clickProductByName(match);
      await detailPage.productName.waitFor({ state: 'visible' });

      // Add requested quantity
      await detailPage.addToCart(product.qty);
      console.log(`[CartService] Added "${match}" ×${product.qty} to cart`);
    }
  }

  /**
   * Navigates to the cart page and checks whether the given product is
   * present with (at least) the expected quantity.
   *
   * @returns true if the product is in the cart with the correct quantity.
   */
  async verifyCartContains(
    page: Page,
    productName: string,
    quantity: number,
  ): Promise<boolean> {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    const items = await cartPage.getCartItems();
    const found = items.find((item) =>
      item.name.toLowerCase().includes(productName.toLowerCase()),
    );
    if (!found) return false;
    return found.quantity >= quantity;
  }

  /**
   * Returns the cart grand total as shown on the cart page.
   */
  async getCartTotal(page: Page): Promise<number> {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    try {
      const text = await cartPage.totalDisplay.textContent() ?? '0';
      return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    } catch {
      // Fall back to summing line totals
      const items = await cartPage.getCartItems();
      return items.reduce((sum, i) => sum + i.lineTotal, 0);
    }
  }

  /**
   * Performs a quick setup: adds `count` different products to the cart via
   * the UI by browsing the product listing page.
   *
   * Returns an array of CartItemData representing what was added.
   */
  async setupCartWithProducts(page: Page, count: number): Promise<CartItemData[]> {
    const listingPage = new ProductListingPage(page);
    const detailPage = new ProductDetailPage(page);
    const added: CartItemData[] = [];

    await listingPage.navigate();
    await listingPage.waitForProducts();
    const allNames = await listingPage.getProductNames();
    const allPrices = await listingPage.getProductPrices();

    const toAdd = Math.min(count, allNames.length);
    for (let i = 0; i < toAdd; i++) {
      await listingPage.navigate();
      await listingPage.waitForProducts();
      await listingPage.clickProductByIndex(i);
      await detailPage.productName.waitFor({ state: 'visible' });

      const inStock = await detailPage.isInStock();
      if (!inStock) continue;

      await detailPage.addToCart(1);
      added.push({
        productId: '',            // Not available from UI
        productName: allNames[i] ?? `Product ${i}`,
        quantity: 1,
        price: allPrices[i] ?? 0,
        lineTotal: allPrices[i] ?? 0,
      });
    }

    return added;
  }

  // ── API-level cart operations (fast path) ──────────────────────────────────

  /**
   * Fast cart setup: adds the given product IDs and quantities via the API
   * without any browser interaction.
   *
   * @param apiService - An ApiService instance with a token already set.
   * @param products   - Array of { id: string, qty: number } objects.
   */
  async setupCartViaApi(
    apiService: ApiService,
    products: Array<{ id: string; qty: number }>,
  ): Promise<void> {
    for (const product of products) {
      await apiService.addToCart(product.id, product.qty);
      console.log(
        `[CartService API] Added product id=${product.id} qty=${product.qty}`,
      );
    }
  }

  /**
   * Clears the entire cart via the API (DELETE /api/cart).
   * Fast alternative to UI-based cart clearing.
   */
  async clearCartViaApi(apiService: ApiService): Promise<void> {
    await apiService.clearCart();
    console.log('[CartService API] Cart cleared');
  }

  /**
   * Returns a summary of the current cart state via the API.
   */
  async getCartSummaryViaApi(apiService: ApiService): Promise<{
    itemCount: number;
    total: number;
    items: CartItemData[];
  }> {
    const cart = await apiService.getCart();
    return {
      itemCount: cart.itemCount,
      total: cart.total,
      items: cart.items,
    };
  }
}
