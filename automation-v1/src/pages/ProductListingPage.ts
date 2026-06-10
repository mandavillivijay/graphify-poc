/**
 * ProductListingPage — HIGH-CENTRALITY page object for the ShopHub / route.
 *
 * Covers: search bar, category/price/stock filters, sort dropdown,
 * product card grid, pagination, and cart quick-add.
 */

import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProductCardData {
  name: string;
  price: number;
  rating?: number;
  inStock?: boolean;
}

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'name';

const SORT_LABEL_MAP: Record<SortOption, string> = {
  featured: 'Featured',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  rating: 'Best Rating',
  name: 'Name',
};

export class ProductListingPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Locators — Search
  // ---------------------------------------------------------------------------

  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly searchClearButton: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Filters
  // ---------------------------------------------------------------------------

  private readonly categoryFilters: Locator;
  private readonly priceMinInput: Locator;
  private readonly priceMaxInput: Locator;
  private readonly inStockToggle: Locator;
  private readonly clearAllFiltersButton: Locator;
  private readonly filterSection: Locator;
  private readonly applyFiltersButton: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Sort
  // ---------------------------------------------------------------------------

  private readonly sortDropdown: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Products
  // ---------------------------------------------------------------------------

  private readonly productCards: Locator;
  private readonly productCount: Locator;
  private readonly loadingIndicator: Locator;
  private readonly noResultsMessage: Locator;

  // ---------------------------------------------------------------------------
  // Locators — Pagination
  // ---------------------------------------------------------------------------

  private readonly paginationNext: Locator;
  private readonly paginationPrev: Locator;
  private readonly currentPageIndicator: Locator;
  private readonly paginationContainer: Locator;

  constructor(page: Page) {
    super(page);

    // Search
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[name="search"], input[aria-label*="search" i]'
    );
    this.searchButton = page.locator(
      'button[aria-label*="search" i], button[type="submit"]'
    ).first();
    this.searchClearButton = page.locator(
      'button[aria-label*="clear" i], .search-clear, [data-testid="search-clear"]'
    );

    // Filters
    this.categoryFilters = page.locator(
      '.category-filter input[type="checkbox"], [data-testid*="category"] input, .filter-sidebar input[type="checkbox"]'
    );
    this.priceMinInput = page.locator(
      'input[name="minPrice"], input[placeholder*="min" i], input[aria-label*="min price" i]'
    );
    this.priceMaxInput = page.locator(
      'input[name="maxPrice"], input[placeholder*="max" i], input[aria-label*="max price" i]'
    );
    this.inStockToggle = page.locator(
      'input[type="checkbox"][name*="stock" i], input[type="checkbox"][id*="stock" i], label:has-text("In Stock") input'
    );
    this.clearAllFiltersButton = page.locator(
      'button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]'
    );
    this.filterSection = page.locator('.filter-sidebar, aside, [data-testid="filter-panel"]');
    this.applyFiltersButton = page.locator(
      'button:has-text("Apply"), [data-testid="apply-filters"]'
    );

    // Sort
    this.sortDropdown = page.locator(
      'select[name*="sort" i], select[aria-label*="sort" i], [data-testid="sort-select"]'
    );

    // Products
    this.productCards = page.locator(
      '.product-card, [data-testid="product-card"], .product-item, [class*="product-card"]'
    );
    this.productCount = page.locator(
      '[data-testid="product-count"], .product-count, .results-count, [class*="product-count"]'
    );
    this.loadingIndicator = page.locator(
      '[data-testid="loading"], .loading, .spinner, [aria-busy="true"]'
    );
    this.noResultsMessage = page.locator(
      '[data-testid="no-results"], .no-results, :has-text("No products found"), :has-text("0 results")'
    );

    // Pagination
    this.paginationNext = page.locator(
      '[aria-label="Next page"], button:has-text("Next"), [data-testid="pagination-next"]'
    );
    this.paginationPrev = page.locator(
      '[aria-label="Previous page"], button:has-text("Previous"), [data-testid="pagination-prev"]'
    );
    this.currentPageIndicator = page.locator(
      '[aria-current="page"], .pagination .active, [data-testid="current-page"]'
    );
    this.paginationContainer = page.locator(
      '.pagination, nav[aria-label*="pagination" i], [data-testid="pagination"]'
    );
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  getUrl(): string {
    return '/';
  }

  // ---------------------------------------------------------------------------
  // Wait helpers
  // ---------------------------------------------------------------------------

  /**
   * Waits for the product grid to contain at least one card.
   * Also waits for any loading spinner to disappear.
   */
  async waitForProducts(): Promise<void> {
    await this.waitForElementHidden(this.loadingIndicator, 10000).catch(() => {
      // Spinner might not exist on first render — that is fine
    });
    await this.productCards.first().waitFor({
      state: 'visible',
      timeout: this.config.getDefaultTimeout(),
    });
  }

  /**
   * Waits for filters to be applied: waits for the loading indicator to appear
   * and then disappear, then confirms at least one product card is visible.
   */
  async waitForFiltersApplied(): Promise<void> {
    // Give the network request a moment to fire
    await this.page.waitForTimeout(300);
    await this.waitForElementHidden(this.loadingIndicator, 10000).catch(() => {});
    // Either products loaded or no-results message appeared
    await Promise.race([
      this.productCards.first().waitFor({ state: 'visible', timeout: 8000 }),
      this.noResultsMessage.first().waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Types a query into the search bar and submits by pressing Enter.
   */
  async search(query: string): Promise<void> {
    await this.waitForElement(this.searchInput);
    await this.fillInput(this.searchInput, query);
    await this.searchInput.press('Enter');
    await this.waitForFiltersApplied();
  }

  /**
   * Clears the current search term (via the clear button or Ctrl+A/Delete).
   */
  async clearSearch(): Promise<void> {
    const clearVisible = await this.isVisible(this.searchClearButton);
    if (clearVisible) {
      await this.clickWithRetry(this.searchClearButton);
    } else {
      await this.searchInput.clear();
      await this.searchInput.press('Enter');
    }
    await this.waitForFiltersApplied();
  }

  /**
   * Returns the current value of the search input field.
   */
  async getSearchValue(): Promise<string> {
    return this.getInputValue(this.searchInput);
  }

  // ---------------------------------------------------------------------------
  // Filters — Category
  // ---------------------------------------------------------------------------

  /**
   * Checks the checkbox for the given category label.
   * Matches case-insensitively against the label text.
   */
  async filterByCategory(category: string): Promise<void> {
    const checkbox = this.page.locator(
      `label:has-text("${category}") input[type="checkbox"], label:has-text("${category}")`
    ).first();
    await this.waitForElement(checkbox);
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (!isChecked) {
      await checkbox.click();
    }
    await this.waitForFiltersApplied();
  }

  /**
   * Unchecks the checkbox for the given category label.
   */
  async clearCategoryFilter(category: string): Promise<void> {
    const checkbox = this.page.locator(
      `label:has-text("${category}") input[type="checkbox"], label:has-text("${category}")`
    ).first();
    await this.waitForElement(checkbox);
    const isChecked = await checkbox.isChecked().catch(() => true);
    if (isChecked) {
      await checkbox.click();
    }
    await this.waitForFiltersApplied();
  }

  /**
   * Returns the list of category names visible in the filter sidebar.
   */
  async getAvailableCategories(): Promise<string[]> {
    const labels = this.page.locator(
      '.category-filter label, [data-testid*="category"] label, .filter-sidebar label'
    );
    return this.getAllTextContents(labels);
  }

  // ---------------------------------------------------------------------------
  // Filters — Price range
  // ---------------------------------------------------------------------------

  /**
   * Sets the minimum and maximum price filter inputs and triggers filtering.
   */
  async filterByPriceRange(min: number, max: number): Promise<void> {
    await this.fillInput(this.priceMinInput, String(min));
    await this.fillInput(this.priceMaxInput, String(max));
    // Try pressing Enter or clicking Apply
    const applyVisible = await this.isVisible(this.applyFiltersButton);
    if (applyVisible) {
      await this.clickWithRetry(this.applyFiltersButton);
    } else {
      await this.priceMaxInput.press('Enter');
    }
    await this.waitForFiltersApplied();
  }

  /**
   * Returns the current min price filter value as a number.
   */
  async getMinPriceValue(): Promise<number> {
    const val = await this.getInputValue(this.priceMinInput);
    return parseFloat(val) || 0;
  }

  /**
   * Returns the current max price filter value as a number.
   */
  async getMaxPriceValue(): Promise<number> {
    const val = await this.getInputValue(this.priceMaxInput);
    return parseFloat(val) || 0;
  }

  // ---------------------------------------------------------------------------
  // Filters — In-stock toggle
  // ---------------------------------------------------------------------------

  /**
   * Enables or disables the "In Stock only" filter toggle.
   */
  async filterByInStock(inStock: boolean): Promise<void> {
    await this.setCheckbox(this.inStockToggle, inStock);
    await this.waitForFiltersApplied();
  }

  /**
   * Returns true when the in-stock filter is active.
   */
  async isInStockFilterActive(): Promise<boolean> {
    return this.inStockToggle.isChecked();
  }

  // ---------------------------------------------------------------------------
  // Filters — Clear all
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Clear all filters" / "Reset" button.
   */
  async clearAllFilters(): Promise<void> {
    const visible = await this.isVisible(this.clearAllFiltersButton);
    if (visible) {
      await this.clickWithRetry(this.clearAllFiltersButton);
      await this.waitForFiltersApplied();
    }
  }

  // ---------------------------------------------------------------------------
  // Sort
  // ---------------------------------------------------------------------------

  /**
   * Selects a sort option from the sort dropdown.
   * @param option - One of the SortOption keys.
   */
  async sortBy(option: SortOption): Promise<void> {
    await this.waitForElement(this.sortDropdown);
    const label = SORT_LABEL_MAP[option];
    // Try selecting by label first, fall back to value
    try {
      await this.sortDropdown.selectOption({ label });
    } catch {
      await this.sortDropdown.selectOption({ value: option });
    }
    await this.waitForFiltersApplied();
  }

  /**
   * Returns the currently selected sort option text.
   */
  async getCurrentSort(): Promise<string> {
    await this.waitForElement(this.sortDropdown);
    // For <select>, get selected option text
    return this.page.evaluate((el) => {
      const select = el as HTMLSelectElement;
      return select.options[select.selectedIndex]?.text ?? '';
    }, await this.sortDropdown.elementHandle());
  }

  // ---------------------------------------------------------------------------
  // Product cards — counts & names
  // ---------------------------------------------------------------------------

  /**
   * Returns the number of product cards currently rendered in the grid.
   */
  async getProductCount(): Promise<number> {
    await this.waitForProducts();
    return this.productCards.count();
  }

  /**
   * Returns an array of product names from the visible product cards.
   */
  async getProductNames(): Promise<string[]> {
    await this.waitForProducts();
    const nameLocators = this.productCards.locator(
      '.product-name, [data-testid="product-name"], h2, h3, [class*="product-title"], [class*="product-name"]'
    );
    return this.getAllTextContents(nameLocators);
  }

  /**
   * Returns an array of product prices (as numbers) from the visible product cards.
   */
  async getProductPrices(): Promise<number[]> {
    await this.waitForProducts();
    const priceLocators = this.productCards.locator(
      '.product-price, [data-testid="product-price"], [class*="price"]'
    );
    const rawPrices = await this.getAllTextContents(priceLocators);
    return rawPrices.map((p) => parseFloat(p.replace(/[^0-9.]/g, '')) || 0);
  }

  /**
   * Returns structured data for all visible product cards.
   */
  async getProductCardData(): Promise<ProductCardData[]> {
    const names = await this.getProductNames();
    const prices = await this.getProductPrices();
    return names.map((name, i) => ({ name, price: prices[i] ?? 0 }));
  }

  // ---------------------------------------------------------------------------
  // Product cards — navigation
  // ---------------------------------------------------------------------------

  /**
   * Returns the Locator for the product card matching the given name.
   * Throws if no matching card is found.
   */
  async getProductCardByName(name: string): Promise<Locator> {
    const card = this.productCards.filter({ hasText: name }).first();
    await this.waitForElement(card);
    return card;
  }

  /**
   * Clicks a product card by its product name to navigate to the detail page.
   */
  async clickProductByName(name: string): Promise<void> {
    const card = await this.getProductCardByName(name);
    const link = card.locator('a').first();
    const linkVisible = await this.isVisible(link);
    if (linkVisible) {
      await this.clickWithRetry(link);
    } else {
      await this.clickWithRetry(card);
    }
    await this.waitForPageLoad();
  }

  /**
   * Clicks the product card at the given zero-based index.
   */
  async clickProductByIndex(index: number): Promise<void> {
    await this.waitForProducts();
    const card = this.productCards.nth(index);
    const link = card.locator('a').first();
    const linkVisible = await this.isVisible(link);
    if (linkVisible) {
      await this.clickWithRetry(link);
    } else {
      await this.clickWithRetry(card);
    }
    await this.waitForPageLoad();
  }

  // ---------------------------------------------------------------------------
  // Product cards — Quick Add to Cart
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Add to Cart" quick-action button on the card matching the given name.
   */
  async addProductToCartByName(name: string): Promise<void> {
    const card = await this.getProductCardByName(name);
    const addBtn = card.locator(
      'button:has-text("Add to Cart"), button[aria-label*="add to cart" i], [data-testid="add-to-cart"]'
    );
    await this.waitForElement(addBtn);
    await this.clickWithRetry(addBtn);
    // Wait for the cart badge or toast notification
    await this.page.waitForTimeout(500);
  }

  /**
   * Clicks the "Add to Cart" quick-action button on the card at the given index.
   */
  async addProductToCartByIndex(index: number): Promise<void> {
    await this.waitForProducts();
    const card = this.productCards.nth(index);
    const addBtn = card.locator(
      'button:has-text("Add to Cart"), button[aria-label*="add to cart" i], [data-testid="add-to-cart"]'
    );
    await this.waitForElement(addBtn);
    await this.clickWithRetry(addBtn);
    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  /**
   * Clicks the "Next page" pagination button and waits for products to load.
   */
  async goToNextPage(): Promise<void> {
    await this.waitForElement(this.paginationNext);
    await this.clickWithRetry(this.paginationNext);
    await this.waitForProducts();
  }

  /**
   * Clicks the "Previous page" pagination button and waits for products to load.
   */
  async goToPrevPage(): Promise<void> {
    await this.waitForElement(this.paginationPrev);
    await this.clickWithRetry(this.paginationPrev);
    await this.waitForProducts();
  }

  /**
   * Returns the current page number as shown in the pagination control.
   * Returns 1 if the indicator is not present.
   */
  async getCurrentPage(): Promise<number> {
    const visible = await this.isVisible(this.currentPageIndicator);
    if (!visible) return 1;
    const text = await this.getTextContent(this.currentPageIndicator);
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  }

  /**
   * Returns true if the "Next page" button is present and enabled.
   */
  async hasNextPage(): Promise<boolean> {
    const visible = await this.isVisible(this.paginationNext);
    if (!visible) return false;
    return this.isEnabled(this.paginationNext);
  }

  /**
   * Returns true if the "Previous page" button is present and enabled.
   */
  async hasPrevPage(): Promise<boolean> {
    const visible = await this.isVisible(this.paginationPrev);
    if (!visible) return false;
    return this.isEnabled(this.paginationPrev);
  }

  /**
   * Returns true if no products matched the current search/filter combination.
   */
  async hasNoResults(): Promise<boolean> {
    return this.isVisible(this.noResultsMessage);
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertProductVisible(name: string): Promise<void> {
    const card = this.productCards.filter({ hasText: name }).first();
    await expect(card, `Expected product "${name}" to be visible`).toBeVisible();
  }

  async assertProductNotVisible(name: string): Promise<void> {
    const card = this.productCards.filter({ hasText: name }).first();
    await expect(card, `Expected product "${name}" to be hidden`).toBeHidden();
  }

  async assertProductCountAtLeast(min: number): Promise<void> {
    const count = await this.getProductCount();
    expect(count, `Expected at least ${min} products, found ${count}`).toBeGreaterThanOrEqual(min);
  }
}
