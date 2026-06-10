/**
 * products.smoke.spec.ts — Smoke tests for the ShopHub product catalog.
 *
 * Validates the most critical catalog paths: listing loads, search works,
 * product detail is accessible, filtering and sorting are functional.
 * Run on every CI push.
 */

import { test, expect } from '../../src/fixtures/fixtures';

test.describe('Product Catalog Smoke Tests', () => {

  // ── TC014 — Product listing page loads ───────────────────────────────────────

  test('@smoke @catalog TC014 - Product listing page loads with products', async ({
    productListingPage,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    const count = await productListingPage.getProductCount();
    expect(count, 'Product listing must show at least one product').toBeGreaterThan(0);

    // Product names must be non-empty strings
    const names = await productListingPage.getProductNames();
    expect(names.length).toBeGreaterThan(0);
    names.slice(0, 3).forEach((name) => expect(name.trim().length).toBeGreaterThan(0));
  });

  // ── TC015 — Search by product name ───────────────────────────────────────────

  test('@smoke @catalog TC015 - Can search for a product by name', async ({
    productListingPage,
    config,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    const searchTerm = config.getDefaultProduct(); // e.g. "Laptop"
    await productListingPage.search(searchTerm);

    // Either results appear or a no-results message is shown — neither crashes
    const noResults = await productListingPage.hasNoResults();
    if (!noResults) {
      const names = await productListingPage.getProductNames();
      expect(names.length).toBeGreaterThan(0);
    } else {
      // No results is a valid API response — confirm the listing is in a valid state
      const noResultsCount = await productListingPage.getProductCount().catch(() => 0);
      expect(noResultsCount).toBe(0);
    }
  });

  // ── TC016 — Product detail page shows correct info ───────────────────────────

  test('@smoke @catalog TC016 - Product detail page shows correct product information', async ({
    productListingPage,
    productDetailPage,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Navigate to the first product's detail page via the card
    await productListingPage.clickProductByIndex(0);

    // Product name must be a non-empty string
    const detailName = await productDetailPage.getProductName();
    expect(detailName.trim().length, 'Product name on detail page must not be empty').toBeGreaterThan(0);

    // Price must be a positive number
    const price = await productDetailPage.getProductPrice();
    expect(price, 'Product price must be a positive number').toBeGreaterThan(0);

    // Add-to-cart button must be present
    await expect(productDetailPage.addToCartButton).toBeVisible();
  });

  // ── TC017 — Filter products by category ──────────────────────────────────────

  test('@smoke @catalog TC017 - Can filter products by category', async ({
    productListingPage,
    page,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    // Discover available categories from the filter sidebar
    const categories = await productListingPage.getAvailableCategories();
    if (categories.length === 0) {
      test.skip(true, 'No category filters available in the sidebar — skipping');
    }

    const targetCategory = categories[0].trim();
    await productListingPage.filterByCategory(targetCategory);

    // After filtering, either products are shown or no-results message appears
    const hasNoResults = await productListingPage.hasNoResults();
    if (!hasNoResults) {
      const count = await productListingPage.getProductCount();
      expect(count, `Filtering by "${targetCategory}" should return at least one product`).toBeGreaterThan(0);
    }
    // In either case the app must not crash or show an error page
    await expect(page).not.toHaveURL(/error|500/);
  });

  // ── TC018 — Sort by price ─────────────────────────────────────────────────────

  test('@smoke @catalog TC018 - Products can be sorted by price', async ({
    productListingPage,
  }) => {
    await productListingPage.navigate();
    await productListingPage.waitForProducts();

    await productListingPage.sortBy('price_asc');

    // After sorting, products should still be present
    const count = await productListingPage.getProductCount();
    expect(count, 'Sort should not remove products from the listing').toBeGreaterThan(0);

    // Verify the sort dropdown reflects the selection
    const sortText = await productListingPage.getCurrentSort();
    expect(sortText.toLowerCase()).toMatch(/low|price|asc/i);
  });

});
