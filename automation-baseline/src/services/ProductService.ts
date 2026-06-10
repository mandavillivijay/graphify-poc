/**
 * ProductService.ts — UI-level product interaction service.
 *
 * Wraps ProductListingPage and ProductDetailPage interactions into
 * higher-level operations used by workflows. Also provides API shortcuts
 * via ApiService for test data management.
 */

import { Page } from '@playwright/test';
import { ProductListingPage } from '../pages/ProductListingPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ApiService } from './ApiService';
import { ConfigManager } from '../config/ConfigManager';
import type { ProductData } from '../models/Product';

export class ProductService {
  private productListingPage: ProductListingPage;
  private productDetailPage: ProductDetailPage;
  private apiService: ApiService;
  private config: ConfigManager;

  constructor(
    page: Page,
    apiService?: ApiService,
  ) {
    this.productListingPage = new ProductListingPage(page);
    this.productDetailPage = new ProductDetailPage(page);
    this.apiService = apiService ?? new ApiService();
    this.config = ConfigManager.getInstance();
  }

  // ── Search and select ──────────────────────────────────────────────────────

  /**
   * Navigates to the product listing, searches for the term, then clicks
   * the first matching product card to open the detail page.
   */
  async searchAndSelectProduct(page: Page, searchTerm: string): Promise<void> {
    await this.productListingPage.navigate();
    await this.productListingPage.search(searchTerm);
    await this.productListingPage.waitForProducts();
    await this.productListingPage.clickProductByIndex(0);
    await this.productDetailPage.productName.waitFor({ state: 'visible' });
  }

  /**
   * Navigates to the listing, searches for the given term, opens the first
   * matching product, and adds it to the cart with the specified quantity.
   * Defaults to quantity=1.
   */
  async addProductToCartBySearch(
    page: Page,
    searchTerm: string,
    quantity = 1,
  ): Promise<void> {
    await this.searchAndSelectProduct(page, searchTerm);
    await this.productDetailPage.addToCart(quantity);
    // Verify the success message appeared
    const msg = await this.productDetailPage.getCartSuccessMessage();
    if (!msg && quantity > 0) {
      // No explicit success message — check the in-stock state was valid
      const inStock = await this.productDetailPage.isInStock();
      if (!inStock) {
        throw new Error(`Product matching "${searchTerm}" is out of stock`);
      }
    }
  }

  /**
   * Navigates to the listing, waits for at least one product card, then
   * reads and returns the full details of the first product.
   */
  async getFirstProductDetails(page: Page): Promise<ProductData> {
    await this.productListingPage.navigate();
    await this.productListingPage.waitForProducts();

    // Click the first card to get full details from the detail page
    await this.productListingPage.clickProductByIndex(0);
    await this.productDetailPage.productName.waitFor({ state: 'visible' });

    const name = await this.productDetailPage.getProductName();
    const price = await this.productDetailPage.getProductPrice();
    const description = await this.productDetailPage.getProductDescription();
    const category = await this.productDetailPage.getProductCategory();
    const brand = await this.productDetailPage.getProductBrand();
    const inStock = await this.productDetailPage.isInStock();
    const stockQuantity = inStock ? 1 : 0;

    return {
      name,
      description,
      price,
      category,
      brand,
      stockQuantity,
    };
  }

  /**
   * Filters the listing by category and returns an array of ProductData
   * from the visible product cards.
   */
  async getProductsMatchingFilter(
    page: Page,
    category: string,
  ): Promise<ProductData[]> {
    await this.productListingPage.navigate();
    await this.productListingPage.filterByCategory(category);
    await this.productListingPage.waitForProducts();

    const cards = await this.productListingPage.getProductCardData();
    return cards.map((card) => ({
      name: card.name,
      description: '',
      price: card.price,
      category,
      brand: '',
      stockQuantity: card.inStock !== false ? 1 : 0,
    }));
  }

  /**
   * Returns true if any visible product card in the listing matches the
   * given product name (case-insensitive partial match).
   */
  async verifyProductInCatalog(
    page: Page,
    productName: string,
  ): Promise<boolean> {
    await this.productListingPage.navigate();
    await this.productListingPage.search(productName);
    try {
      const names = await this.productListingPage.getProductNames();
      return names.some((n) =>
        n.toLowerCase().includes(productName.toLowerCase()),
      );
    } catch {
      return false;
    }
  }

  // ── API-level test data management ─────────────────────────────────────────

  /**
   * Creates a test product via the admin API and returns its data.
   * Requires admin credentials to be configured in ConfigManager.
   */
  async createTestProductViaApi(): Promise<ProductData> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);

    const timestamp = Date.now();
    const productPayload: Partial<ProductData> = {
      name: `Test Product ${timestamp}`,
      description: `Automated test product created at ${new Date().toISOString()}`,
      price: 29.99,
      category: 'Electronics',
      brand: 'TestBrand',
      stockQuantity: 50,
      isFeatured: false,
      isActive: true,
    };

    const created = await this.apiService.createProduct(productPayload);
    console.log(`[ProductService] Created test product: ${created.name} (id=${created.id})`);
    return created;
  }

  /**
   * Soft-deletes a test product by ID via the admin API.
   */
  async deleteTestProductViaApi(productId: string): Promise<void> {
    const adminCreds = this.config.getUserCredentials('admin');
    await this.apiService.login(adminCreds);
    await this.apiService.deleteProduct(productId);
    console.log(`[ProductService] Deleted test product id=${productId}`);
  }

  /**
   * Returns the first available product from the API (no auth required).
   */
  async getFirstAvailableProduct(): Promise<ProductData | null> {
    try {
      const products = await this.apiService.getProducts({ in_stock: 'true', limit: '1' });
      return products[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Returns all products matching the given category via API.
   */
  async getProductsByCategory(category: string): Promise<ProductData[]> {
    return this.apiService.getProducts({ category, limit: '50' });
  }
}
