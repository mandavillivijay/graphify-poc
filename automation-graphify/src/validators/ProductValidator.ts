/**
 * ProductValidator.ts — Pure utility class for validating product data
 * and asserting business-rule constraints in test scenarios.
 *
 * All methods are static — no state is stored on instances.
 */

import type { ProductData } from '../models/Product';

export class ProductValidator {
  // ── Structural validation ──────────────────────────────────────────────────

  /**
   * Validates that a ProductData object is structurally valid.
   * Throws a descriptive Error if any rule is violated.
   */
  static validateProductData(product: ProductData): void {
    if (!product) {
      throw new Error('ProductValidator: product object is null or undefined');
    }
    if (!product.name || product.name.trim().length === 0) {
      throw new Error('ProductValidator: product name is required and cannot be empty');
    }
    if (product.name.length > 200) {
      throw new Error(
        `ProductValidator: product name exceeds 200 characters (got ${product.name.length})`,
      );
    }
    if (product.price === undefined || product.price === null) {
      throw new Error('ProductValidator: product price is required');
    }
    if (typeof product.price !== 'number' || isNaN(product.price)) {
      throw new Error(`ProductValidator: product price must be a number (got ${product.price})`);
    }
    if (product.price < 0) {
      throw new Error(
        `ProductValidator: price cannot be negative (got ${product.price})`,
      );
    }
    if (!product.category || product.category.trim().length === 0) {
      throw new Error('ProductValidator: product category is required');
    }
    if (!product.brand || product.brand.trim().length === 0) {
      throw new Error('ProductValidator: product brand is required');
    }
    if (product.stockQuantity < 0) {
      throw new Error(
        `ProductValidator: stockQuantity cannot be negative (got ${product.stockQuantity})`,
      );
    }
    if (
      product.rating !== undefined &&
      product.rating !== null &&
      (product.rating < 0 || product.rating > 5)
    ) {
      throw new Error(
        `ProductValidator: rating must be between 0 and 5 (got ${product.rating})`,
      );
    }
    if (
      product.reviewCount !== undefined &&
      product.reviewCount !== null &&
      product.reviewCount < 0
    ) {
      throw new Error(
        `ProductValidator: reviewCount cannot be negative (got ${product.reviewCount})`,
      );
    }
  }

  // ── Sort validation ────────────────────────────────────────────────────────

  /**
   * Validates that the given products array is sorted by price in the
   * specified direction.
   *
   * @param products  - Array of products to check.
   * @param direction - 'asc' for ascending (cheapest first), 'desc' for descending.
   * @returns true if correctly sorted (or fewer than 2 items).
   */
  static validateProductsAreSortedByPrice(
    products: ProductData[],
    direction: 'asc' | 'desc',
  ): boolean {
    if (products.length < 2) return true;
    for (let i = 0; i < products.length - 1; i++) {
      const a = products[i].price;
      const b = products[i + 1].price;
      if (direction === 'asc' && a > b) return false;
      if (direction === 'desc' && a < b) return false;
    }
    return true;
  }

  /**
   * Validates that the given products array is sorted alphabetically by
   * name in ascending order (A → Z).
   *
   * @returns true if correctly sorted (or fewer than 2 items).
   */
  static validateProductsAreSortedByName(products: ProductData[]): boolean {
    if (products.length < 2) return true;
    for (let i = 0; i < products.length - 1; i++) {
      const a = products[i].name.toLowerCase();
      const b = products[i + 1].name.toLowerCase();
      if (a > b) return false;
    }
    return true;
  }

  /**
   * Validates that the products array is sorted by rating in descending order
   * (highest-rated first).
   */
  static validateProductsAreSortedByRating(products: ProductData[]): boolean {
    if (products.length < 2) return true;
    for (let i = 0; i < products.length - 1; i++) {
      const a = products[i].rating ?? 0;
      const b = products[i + 1].rating ?? 0;
      if (a < b) return false;
    }
    return true;
  }

  // ── Search match validation ────────────────────────────────────────────────

  /**
   * Returns true if the product name, description, brand, or category
   * contains the given search term (case-insensitive).
   */
  static validateProductMatchesSearch(
    product: ProductData,
    searchTerm: string,
  ): boolean {
    if (!searchTerm || searchTerm.trim().length === 0) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(term) ||
      (product.description?.toLowerCase().includes(term) ?? false) ||
      product.brand.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  }

  // ── Category filter validation ─────────────────────────────────────────────

  /**
   * Returns true if the product's category matches the expected value
   * (case-insensitive).
   */
  static validateProductInCategory(
    product: ProductData,
    category: string,
  ): boolean {
    return product.category.toLowerCase() === category.toLowerCase();
  }

  /**
   * Returns true when all products in the array belong to the given category.
   */
  static validateAllProductsInCategory(
    products: ProductData[],
    category: string,
  ): boolean {
    return products.every((p) => ProductValidator.validateProductInCategory(p, category));
  }

  // ── Price range validation ─────────────────────────────────────────────────

  /**
   * Returns true when the product's price falls within [min, max] (inclusive).
   */
  static validatePriceInRange(
    product: ProductData,
    min: number,
    max: number,
  ): boolean {
    return product.price >= min && product.price <= max;
  }

  /**
   * Returns true when all products in the array have prices within [min, max].
   */
  static validateAllPricesInRange(
    products: ProductData[],
    min: number,
    max: number,
  ): boolean {
    return products.every((p) => ProductValidator.validatePriceInRange(p, min, max));
  }

  // ── Stock validation ───────────────────────────────────────────────────────

  /**
   * Returns true when the product has at least 1 unit in stock.
   */
  static isInStock(product: ProductData): boolean {
    return product.stockQuantity > 0;
  }

  /**
   * Returns true when all products in the array are in stock.
   */
  static validateAllInStock(products: ProductData[]): boolean {
    return products.every(ProductValidator.isInStock);
  }

  // ── Uniqueness ────────────────────────────────────────────────────────────

  /**
   * Returns true when all products in the array have unique IDs.
   */
  static validateUniqueIds(products: ProductData[]): boolean {
    const ids = products.map((p) => p.id).filter(Boolean);
    return new Set(ids).size === ids.length;
  }

  /**
   * Returns true when all products in the array have unique names.
   */
  static validateUniqueNames(products: ProductData[]): boolean {
    const names = products.map((p) => p.name.toLowerCase().trim());
    return new Set(names).size === names.length;
  }

  // ── Completeness ──────────────────────────────────────────────────────────

  /**
   * Returns the list of validation errors for a product without throwing.
   * Useful for reporting multiple issues at once.
   */
  static getValidationErrors(product: ProductData): string[] {
    const errors: string[] = [];
    if (!product) { errors.push('product is null or undefined'); return errors; }
    if (!product.name?.trim()) errors.push('name is required');
    if (product.name?.length > 200) errors.push('name exceeds 200 characters');
    if (product.price === undefined || product.price === null) errors.push('price is required');
    if (typeof product.price === 'number' && product.price < 0) errors.push('price cannot be negative');
    if (!product.category?.trim()) errors.push('category is required');
    if (!product.brand?.trim()) errors.push('brand is required');
    if (product.stockQuantity < 0) errors.push('stockQuantity cannot be negative');
    if (product.rating !== undefined && (product.rating < 0 || product.rating > 5)) {
      errors.push('rating must be 0–5');
    }
    return errors;
  }
}
