/**
 * CartValidator.ts — Pure utility class for validating cart state
 * in test assertions.
 *
 * All methods are static — no state is stored on instances.
 */

import type { CartItemData } from '../models/Product';

export class CartValidator {
  // ── Item presence ──────────────────────────────────────────────────────────

  /**
   * Returns true when the given product (matched by name, case-insensitive)
   * is present in the cart with exactly the expected quantity.
   *
   * @param cartItems   - Current cart item list.
   * @param productName - Product name to search for (partial match).
   * @param expectedQty - The exact quantity expected.
   */
  static validateItemInCart(
    cartItems: CartItemData[],
    productName: string,
    expectedQty: number,
  ): boolean {
    if (!cartItems || cartItems.length === 0) return false;
    const item = cartItems.find((i) =>
      i.productName.toLowerCase().includes(productName.toLowerCase()),
    );
    if (!item) return false;
    return item.quantity === expectedQty;
  }

  /**
   * Returns true when the product is present regardless of quantity.
   */
  static validateItemExists(
    cartItems: CartItemData[],
    productName: string,
  ): boolean {
    return cartItems.some((i) =>
      i.productName.toLowerCase().includes(productName.toLowerCase()),
    );
  }

  /**
   * Returns true when the product is NOT present in the cart.
   */
  static validateItemNotInCart(
    cartItems: CartItemData[],
    productName: string,
  ): boolean {
    return !CartValidator.validateItemExists(cartItems, productName);
  }

  // ── Total validation ───────────────────────────────────────────────────────

  /**
   * Validates that the sum of all line totals matches the expected cart total.
   *
   * @param cartItems     - Current cart item list.
   * @param expectedTotal - The expected grand total (post tax/shipping).
   * @param tolerance     - Acceptable floating-point difference (default $0.10).
   */
  static validateCartTotal(
    cartItems: CartItemData[],
    expectedTotal: number,
    tolerance = 0.10,
  ): boolean {
    if (!cartItems || cartItems.length === 0) {
      return expectedTotal === 0;
    }
    const actualSubtotal = cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const tax = actualSubtotal * 0.08;
    const shipping = actualSubtotal >= 50 ? 0 : 5.99;
    const computedTotal = actualSubtotal + tax + shipping;
    return Math.abs(computedTotal - expectedTotal) <= tolerance;
  }

  /**
   * Validates that the subtotal (sum of line totals) matches the expected value.
   */
  static validateSubtotal(
    cartItems: CartItemData[],
    expectedSubtotal: number,
    tolerance = 0.01,
  ): boolean {
    const actual = cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
    return Math.abs(actual - expectedSubtotal) <= tolerance;
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  /**
   * Returns true when the cart is empty (no items).
   */
  static validateCartEmpty(cartItems: CartItemData[]): boolean {
    return !cartItems || cartItems.length === 0;
  }

  /**
   * Returns true when the cart is not empty.
   */
  static validateCartNotEmpty(cartItems: CartItemData[]): boolean {
    return !CartValidator.validateCartEmpty(cartItems);
  }

  // ── Quantity range ─────────────────────────────────────────────────────────

  /**
   * Returns true when the given quantity is a positive integer within the
   * allowed range (1–99).
   */
  static validateQuantityRange(qty: number, min = 1, max = 99): boolean {
    return Number.isInteger(qty) && qty >= min && qty <= max;
  }

  // ── Line total integrity ───────────────────────────────────────────────────

  /**
   * Returns true when every item's lineTotal equals price × quantity
   * (within a $0.01 tolerance).
   */
  static validateLineTotals(cartItems: CartItemData[]): boolean {
    for (const item of cartItems) {
      const expected = item.price * item.quantity;
      if (Math.abs(item.lineTotal - expected) > 0.01) return false;
    }
    return true;
  }

  // ── Count helpers ──────────────────────────────────────────────────────────

  /**
   * Returns the total number of individual units across all cart items.
   */
  static getTotalItemCount(cartItems: CartItemData[]): number {
    return cartItems.reduce((sum, i) => sum + i.quantity, 0);
  }

  /**
   * Returns the subtotal (price × qty) for all items.
   */
  static computeSubtotal(cartItems: CartItemData[]): number {
    return cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
  }

  /**
   * Returns the computed tax amount for the cart.
   */
  static computeTax(cartItems: CartItemData[]): number {
    const subtotal = CartValidator.computeSubtotal(cartItems);
    return Math.round(subtotal * 0.08 * 100) / 100;
  }

  /**
   * Returns the shipping charge ($0 for orders over $50, else $5.99).
   */
  static computeShipping(cartItems: CartItemData[]): number {
    const subtotal = CartValidator.computeSubtotal(cartItems);
    if (subtotal === 0) return 0;
    return subtotal >= 50 ? 0 : 5.99;
  }

  /**
   * Returns the full expected grand total including tax and shipping.
   */
  static computeGrandTotal(cartItems: CartItemData[]): number {
    const subtotal = CartValidator.computeSubtotal(cartItems);
    const tax = CartValidator.computeTax(cartItems);
    const shipping = CartValidator.computeShipping(cartItems);
    return Math.round((subtotal + tax + shipping) * 100) / 100;
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  /**
   * Returns a list of validation issues without throwing.
   */
  static getValidationErrors(cartItems: CartItemData[]): string[] {
    const errors: string[] = [];
    if (!Array.isArray(cartItems)) {
      errors.push('cartItems must be an array');
      return errors;
    }
    for (const item of cartItems) {
      if (!item.productName?.trim()) errors.push(`Item has no productName`);
      if (!CartValidator.validateQuantityRange(item.quantity)) {
        errors.push(`Item "${item.productName}" has invalid quantity ${item.quantity}`);
      }
      if (item.price < 0) {
        errors.push(`Item "${item.productName}" has negative price ${item.price}`);
      }
      if (item.lineTotal < 0) {
        errors.push(`Item "${item.productName}" has negative lineTotal ${item.lineTotal}`);
      }
    }
    return errors;
  }
}
