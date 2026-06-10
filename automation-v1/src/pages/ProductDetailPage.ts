/**
 * ProductDetailPage — Page object for the ShopHub /products/:id route.
 *
 * Covers product metadata display, quantity selector, add-to-cart action,
 * success/error feedback, and rating/stock status.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProductDetail {
  name: string;
  price: number;
  description: string;
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
}

export class ProductDetailPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Product metadata
  // ---------------------------------------------------------------------------

  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly productDescription: Locator;
  readonly productCategory: Locator;
  readonly productBrand: Locator;
  readonly ratingDisplay: Locator;
  readonly reviewCount: Locator;
  readonly stockStatus: Locator;
  readonly productImage: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Cart interaction
  // ---------------------------------------------------------------------------

  readonly quantityInput: Locator;
  readonly quantityIncrease: Locator;
  readonly quantityDecrease: Locator;
  readonly quantityDisplay: Locator;
  readonly addToCartButton: Locator;
  readonly cartSuccessMessage: Locator;
  readonly errorMessage: Locator;
  readonly cartCountBadge: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);

    // Metadata
    this.productName = page.locator('h1').first();
    this.productPrice = page
      .locator('[style*="4f46e5"][style*="32px"], [style*="price"], .price, [class*="price"]')
      .first();
    this.productDescription = page.locator('p').filter({ hasText: /\w{20,}/ }).first();
    this.productCategory = page
      .locator('span[style*="12px"][style*="f3f4f6"], .category-badge, [class*="category"]')
      .first();
    this.productBrand = page.locator('p').filter({ hasText: /by /i }).first();
    this.ratingDisplay = page.locator('[class*="rating"], .star-rating').first();
    this.reviewCount = page.locator('[data-testid="review-count"], .review-count').first();
    this.stockStatus = page
      .locator('span[style*="borderRadius"], .stock-status, [class*="stock"]')
      .first();
    this.productImage = page
      .locator('[data-testid="product-image"], .product-image img, img.product-img')
      .first();

    // Cart interaction
    this.quantityInput = page.locator(
      'input[type="number"][name*="qty" i], input[type="number"][aria-label*="quantity" i], [data-testid="quantity-input"]'
    );
    this.quantityIncrease = page.locator('button').filter({ hasText: '+' }).first();
    this.quantityDecrease = page.locator('button').filter({ hasText: '−' }).first();
    this.quantityDisplay = page
      .locator('span[style*="fontWeight: 600"][style*="16px"]')
      .first();
    this.addToCartButton = page
      .locator('button')
      .filter({ hasText: /Add to Cart|Out of Stock/i })
      .first();
    this.cartSuccessMessage = page
      .locator('[style*="f0fdf4"], .cart-success, [class*="success"]')
      .first();
    this.errorMessage = page
      .locator('[role="alert"]:not(.success), .error-message, [class*="error"]')
      .first();
    this.cartCountBadge = page.locator(
      '[data-testid="cart-count"], .cart-badge, [aria-label*="cart" i] .badge'
    );
    this.backButton = page.locator('button').filter({ hasText: /← Back|back/i }).first();
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/products';
  }

  /**
   * Navigate directly to a specific product by ID.
   */
  async goto(productId: string): Promise<void> {
    await this.page.goto(this.config.buildUrl(`/products/${productId}`));
    await this.waitForPageLoad();
    await this.productName.waitFor({ state: 'visible' });
  }

  /** Alias for goto — accepts the full URL pattern. */
  async navigateToProduct(productId: string): Promise<void> {
    return this.goto(productId);
  }

  // ---------------------------------------------------------------------------
  // Product metadata getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the product name heading text.
   */
  async getProductName(): Promise<string> {
    await this.waitForElement(this.productName);
    return this.getTextContent(this.productName);
  }

  /**
   * Returns the product price as a number (currency symbols stripped).
   */
  async getProductPrice(): Promise<number> {
    await this.waitForElement(this.productPrice);
    const raw = await this.getTextContent(this.productPrice);
    return parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Returns the formatted price string as displayed (e.g. "$499.99").
   */
  async getProductPriceText(): Promise<string> {
    await this.waitForElement(this.productPrice);
    return this.getTextContent(this.productPrice);
  }

  /**
   * Returns the product description text.
   */
  async getProductDescription(): Promise<string> {
    await this.waitForElement(this.productDescription);
    return this.getTextContent(this.productDescription);
  }

  /**
   * Returns the category label text.
   */
  async getProductCategory(): Promise<string> {
    await this.waitForElement(this.productCategory);
    return this.getTextContent(this.productCategory);
  }

  /**
   * Returns the brand label text.
   */
  async getProductBrand(): Promise<string> {
    await this.waitForElement(this.productBrand);
    return this.getTextContent(this.productBrand);
  }

  /**
   * Returns the numeric star rating (e.g. 4.5).
   * Parses from aria-label or visible text, whichever is available.
   */
  async getRating(): Promise<number> {
    try {
      await this.waitForElement(this.ratingDisplay, 5000);
    } catch {
      return 0;
    }
    const ariaLabel = await this.ratingDisplay.getAttribute('aria-label');
    if (ariaLabel) {
      const match = ariaLabel.match(/[\d.]+/);
      if (match) return parseFloat(match[0]);
    }
    const text = await this.getTextContent(this.ratingDisplay);
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Returns the review count as a number.
   */
  async getReviewCount(): Promise<number> {
    try {
      await this.waitForElement(this.reviewCount, 3000);
      const text = await this.getTextContent(this.reviewCount);
      const match = text.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Returns the stock status string (e.g. "In Stock", "Out of Stock").
   */
  async getStockStatus(): Promise<string> {
    try {
      await this.waitForElement(this.stockStatus, 5000);
      return this.getTextContent(this.stockStatus);
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Returns true if the product is currently in stock.
   */
  async isInStock(): Promise<boolean> {
    try {
      const text = await this.getStockStatus();
      return !text.toLowerCase().includes('out of stock');
    } catch {
      return true;
    }
  }

  /**
   * Collects all metadata into a typed object for convenient assertions.
   */
  async getProductDetail(): Promise<ProductDetail> {
    return {
      name: await this.getProductName(),
      price: await this.getProductPrice(),
      description: await this.getProductDescription(),
      category: await this.getProductCategory(),
      brand: await this.getProductBrand(),
      rating: await this.getRating(),
      reviewCount: await this.getReviewCount(),
      inStock: await this.isInStock(),
    };
  }

  // ---------------------------------------------------------------------------
  // Quantity selector
  // ---------------------------------------------------------------------------

  /**
   * Returns the current quantity shown in the quantity display.
   */
  async getQuantity(): Promise<number> {
    // Prefer the numeric input if present
    const inputVisible = await this.isVisible(this.quantityInput);
    if (inputVisible) {
      const val = await this.getInputValue(this.quantityInput);
      return parseInt(val, 10) || 1;
    }
    // Fall back to the display span (stepper buttons pattern)
    const text = await this.getTextContent(this.quantityDisplay);
    return parseInt(text, 10) || 1;
  }

  /**
   * Sets the quantity to a specific number.
   * Uses the +/- stepper buttons (compatible with both input and span-based steppers).
   * @param qty - Desired quantity (must be >= 1).
   */
  async setQuantity(qty: number): Promise<void> {
    const inputVisible = await this.isVisible(this.quantityInput);
    if (inputVisible) {
      await this.quantityInput.clear();
      await this.quantityInput.fill(String(qty));
      await this.quantityInput.press('Tab');
      return;
    }
    // Stepper-based UI
    const current = await this.getQuantity();
    const diff = qty - current;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await this.clickWithRetry(this.quantityIncrease);
        await this.page.waitForTimeout(100);
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        await this.clickWithRetry(this.quantityDecrease);
        await this.page.waitForTimeout(100);
      }
    }
  }

  /**
   * Increases the quantity by n using the "+" stepper button.
   */
  async increaseQuantity(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.clickWithRetry(this.quantityIncrease);
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Decreases the quantity by n using the "−" stepper button.
   */
  async decreaseQuantity(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.clickWithRetry(this.quantityDecrease);
      await this.page.waitForTimeout(100);
    }
  }

  // ---------------------------------------------------------------------------
  // Add to cart
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Add to Cart" button.
   * Optionally sets a specific quantity first.
   * @param quantity - If provided and > 1, sets quantity before clicking.
   */
  async addToCart(quantity?: number): Promise<void> {
    if (quantity && quantity > 1) {
      await this.setQuantity(quantity);
    }
    await this.waitForElement(this.addToCartButton);
    await this.clickWithRetry(this.addToCartButton);
    // Wait for either success message or cart badge update
    await Promise.race([
      this.cartSuccessMessage.waitFor({ state: 'visible', timeout: 5000 }),
      this.cartCountBadge.waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {
      // Might navigate or use different feedback — tolerate both
    });
    await this.page.waitForTimeout(300);
  }

  /**
   * Returns true when the "Add to Cart" button is enabled and clickable.
   */
  async isAddToCartEnabled(): Promise<boolean> {
    return this.isEnabled(this.addToCartButton);
  }

  /**
   * Returns the success message text shown after adding to cart.
   */
  async getCartSuccessMessage(): Promise<string> {
    try {
      await this.cartSuccessMessage.waitFor({ state: 'visible', timeout: 3000 });
      return this.getTextContent(this.cartSuccessMessage);
    } catch {
      return '';
    }
  }

  /** Alias for getCartSuccessMessage to match the interface contract. */
  async getSuccessMessage(): Promise<string> {
    return this.getCartSuccessMessage();
  }

  /**
   * Returns true when the success confirmation is visible.
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    return this.isVisible(this.cartSuccessMessage);
  }

  /**
   * Returns the error message text if an error occurred.
   */
  async getErrorMessage(): Promise<string> {
    try {
      await this.waitForElement(this.errorMessage, 5000);
      return this.getTextContent(this.errorMessage);
    } catch {
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Clicks the back arrow / "← Back" button to return to the product listing.
   */
  async goBack(): Promise<void> {
    await this.clickWithRetry(this.backButton);
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertProductNameEquals(name: string): Promise<void> {
    await expect(this.productName).toContainText(name);
  }

  async assertProductNameIs(expectedName: string): Promise<void> {
    return this.assertProductNameEquals(expectedName);
  }

  async assertInStock(): Promise<void> {
    const inStock = await this.isInStock();
    expect(inStock, 'Expected product to be in stock').toBe(true);
  }

  async assertAddToCartEnabled(): Promise<void> {
    await expect(this.addToCartButton).toBeEnabled();
  }
}
