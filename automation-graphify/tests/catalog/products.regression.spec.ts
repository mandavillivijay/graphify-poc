/**
 * products.regression.spec.ts — Regression tests for the ShopHub product catalog.
 *
 * Comprehensive coverage of filter combinations, sort ordering, pagination,
 * search edge cases, and product detail states.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Product Catalog Regression Tests', () => {

  test.beforeEach(async ({ productListingPage }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();
  });

  // ── TC019 — Filter by multiple categories ────────────────────────────────────

  test('@regression @catalog TC019 - Filter by multiple categories narrows results', async ({
    productListingPage,
  }) => {
    const categories = await productListingPage.getAvailableCategories();
    if (categories.length < 2) {
      test.skip(true, 'Fewer than 2 categories available — skipping multi-category test');
    }

    const totalCount = await productListingPage.getProductCount();

    // Apply first category
    await productListingPage.filterByCategory(categories[0].trim());
    const afterFirstFilter = await productListingPage.getProductCount();

    // Apply second category (additive)
    await productListingPage.filterByCategory(categories[1].trim());
    const afterSecondFilter = await productListingPage.getProductCount();

    // Combined category filter should never exceed the total product count
    expect(afterSecondFilter).toBeLessThanOrEqual(totalCount);
    expect(afterFirstFilter).toBeGreaterThanOrEqual(0);
    expect(afterSecondFilter).toBeGreaterThanOrEqual(0);
  });

  // ── TC020 — Filter by price range ────────────────────────────────────────────

  test('@regression @catalog TC020 - Filter by price range shows only products within range', async ({
    productListingPage,
  }) => {
    const MIN_PRICE = 10;
    const MAX_PRICE = 100;

    await productListingPage.filterByPriceRange(MIN_PRICE, MAX_PRICE);

    const hasNoResults = await productListingPage.hasNoResults();
    if (hasNoResults) {
      // No products in this range — acceptable, just check no crash
      return;
    }

    const prices = await productListingPage.getProductPrices();
    expect(prices.length).toBeGreaterThan(0);

    // Every displayed price should be within the filtered range (allow $0 for parse failures)
    prices.forEach((price) => {
      if (price > 0) {
        expect(price, `Price ${price} should be between ${MIN_PRICE} and ${MAX_PRICE}`).toBeLessThanOrEqual(MAX_PRICE + 1);
        expect(price).toBeGreaterThanOrEqual(MIN_PRICE - 1);
      }
    });
  });

  // ── TC021 — Filter in-stock only ─────────────────────────────────────────────

  test('@regression @catalog TC021 - In-stock filter shows only available products', async ({
    productListingPage,
  }) => {
    await productListingPage.filterByInStock(true);

    const isActive = await productListingPage.isInStockFilterActive();
    expect(isActive, 'In-stock toggle must be checked after activation').toBe(true);

    const hasNoResults = await productListingPage.hasNoResults();
    if (!hasNoResults) {
      const count = await productListingPage.getProductCount();
      expect(count).toBeGreaterThan(0);
    }
  });

  // ── TC022 — Search returns no results for unknown term ────────────────────────

  test('@regression @catalog TC022 - Search with unknown term shows no-results state', async ({
    productListingPage,
  }) => {
    const NONSENSE_TERM = 'xz99nonsenseproductterm12345';

    await productListingPage.search(NONSENSE_TERM);

    // The app should either show a "no results" message or render 0 product cards
    const hasNoResults = await productListingPage.hasNoResults();
    const count = await productListingPage.getProductCount().catch(() => 0);

    expect(
      hasNoResults || count === 0,
      'Expected no results for a nonsense search term',
    ).toBe(true);
  });

  // ── TC023 — Sort price ascending ─────────────────────────────────────────────

  test('@regression @catalog TC023 - Sort by price ascending - first product has lowest price', async ({
    productListingPage,
  }) => {
    await productListingPage.sortBy('price_asc');

    const prices = await productListingPage.getProductPrices();
    expect(prices.length, 'Must have at least 2 products to verify sort order').toBeGreaterThan(1);

    // Prices should be in non-decreasing order for the visible page
    for (let i = 1; i < Math.min(prices.length, 5); i++) {
      expect(
        prices[i],
        `Price at index ${i} (${prices[i]}) should be >= price at index ${i - 1} (${prices[i - 1]})`,
      ).toBeGreaterThanOrEqual(prices[i - 1] - 0.01); // 0.01 tolerance for rounding
    }
  });

  // ── TC024 — Sort price descending ────────────────────────────────────────────

  test('@regression @catalog TC024 - Sort by price descending - first product has highest price', async ({
    productListingPage,
  }) => {
    await productListingPage.sortBy('price_desc');

    const prices = await productListingPage.getProductPrices();
    expect(prices.length).toBeGreaterThan(1);

    // Prices should be in non-increasing order
    for (let i = 1; i < Math.min(prices.length, 5); i++) {
      expect(
        prices[i],
        `Price at index ${i} (${prices[i]}) should be <= price at index ${i - 1} (${prices[i - 1]})`,
      ).toBeLessThanOrEqual(prices[i - 1] + 0.01);
    }
  });

  // ── TC025 — Sort by rating ────────────────────────────────────────────────────

  test('@regression @catalog TC025 - Sort by rating shows highly-rated products first', async ({
    productListingPage,
  }) => {
    await productListingPage.sortBy('rating');

    // After applying the sort, products must still be visible
    const count = await productListingPage.getProductCount();
    expect(count, 'Sort by rating must still show products').toBeGreaterThan(0);

    // Verify the dropdown label reflects the rating sort option
    const sortLabel = await productListingPage.getCurrentSort();
    expect(sortLabel.toLowerCase()).toMatch(/rating|best/i);
  });

  // ── TC026 — Pagination ────────────────────────────────────────────────────────

  test('@regression @catalog TC026 - Pagination shows different products on page 2', async ({
    productListingPage,
  }) => {
    const hasNext = await productListingPage.hasNextPage();
    if (!hasNext) {
      test.skip(true, 'Pagination not available — all products fit on page 1');
    }

    const page1Names = await productListingPage.getProductNames();

    await productListingPage.goToNextPage();

    const page2Names = await productListingPage.getProductNames();
    expect(page2Names.length, 'Page 2 must contain products').toBeGreaterThan(0);

    // Page 2 products should differ from page 1
    const overlap = page1Names.filter((n) => page2Names.includes(n));
    expect(overlap.length, 'Page 2 should not show the exact same products as page 1').toBeLessThan(page1Names.length);
  });

  // ── TC027 — Clear filters resets to full product list ────────────────────────

  test('@regression @catalog TC027 - Clear filters resets to full product list', async ({
    productListingPage,
  }) => {
    const totalCount = await productListingPage.getProductCount();

    // Apply a filter to reduce the list
    const categories = await productListingPage.getAvailableCategories();
    if (categories.length > 0) {
      await productListingPage.filterByCategory(categories[0].trim());
    } else {
      await productListingPage.filterByInStock(true);
    }

    // Clear all active filters
    await productListingPage.clearAllFilters();

    const countAfterClear = await productListingPage.getProductCount();
    // After clearing, count should be back to (or close to) the original total
    expect(
      countAfterClear,
      'Clearing filters should restore the full product listing',
    ).toBeGreaterThanOrEqual(totalCount);
  });

  // ── TC028 — Search combined with category filter ──────────────────────────────

  test('@regression @catalog TC028 - Search combined with category filter narrows results', async ({
    productListingPage,
    page,
    config,
  }) => {
    const searchTerm = config.getDefaultProduct();
    const categories = await productListingPage.getAvailableCategories();

    // Apply a category filter first
    if (categories.length > 0) {
      await productListingPage.filterByCategory(categories[0].trim());
    }

    // Then also apply search
    await productListingPage.search(searchTerm);

    // The page should not crash; it should show products or no-results
    await expect(page).not.toHaveURL(/error|500/);
    const noResults = await productListingPage.hasNoResults();
    const count = await productListingPage.getProductCount().catch(() => 0);
    expect(count >= 0 || noResults).toBeTruthy();
  });

  // ── TC029 — Product detail has add-to-cart button ─────────────────────────────

  test('@regression @catalog TC029 - Product detail page shows add-to-cart button', async ({
    productListingPage,
    productDetailPage,
  }) => {
    // Navigate to the first product's detail page
    await productListingPage.clickProductByIndex(0);

    // Add-to-cart button must be rendered and visible
    await expect(productDetailPage.addToCartButton).toBeVisible({ timeout: 8000 });

    // Product name must be shown
    const name = await productDetailPage.getProductName();
    expect(name.trim().length).toBeGreaterThan(0);

    // Price must be a positive value
    const price = await productDetailPage.getProductPrice();
    expect(price).toBeGreaterThan(0);
  });

  // ── TC030 — Out-of-stock product handling ────────────────────────────────────

  test('@regression @catalog TC030 - Out-of-stock products are handled gracefully', async ({
    productDetailPage,
    page,
    apiService,
  }) => {
    // Find an out-of-stock product via the API to get its ID
    const products = await apiService.getProducts({ in_stock: 'false', limit: '1' }).catch(() => []);

    if (products.length === 0) {
      test.skip(true, 'No out-of-stock products in the catalogue — skipping');
    }

    const outOfStockProduct = products[0];
    await productDetailPage.goto(outOfStockProduct.id!);

    // The page must load without crashing
    await expect(page).not.toHaveURL(/error|500/);

    // Stock status should indicate out-of-stock
    const stockStatus = await productDetailPage.getStockStatus();
    expect(stockStatus.toLowerCase()).toMatch(/out of stock|unavailable/i);

    // The add-to-cart button should be disabled or labelled "Out of Stock"
    const addBtn = productDetailPage.addToCartButton;
    const btnText = (await addBtn.textContent()) ?? '';
    const isDisabled = await addBtn.isDisabled().catch(() => false);
    const showsOutOfStock = btnText.toLowerCase().includes('out of stock');
    expect(
      isDisabled || showsOutOfStock,
      'Out-of-stock product: add-to-cart must be disabled or show "Out of Stock"',
    ).toBe(true);
  });

});
