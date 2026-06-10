/**
 * OrderValidator.ts — Pure utility class for validating order data
 * in test assertions.
 *
 * All methods are static — no state is stored on instances.
 */

import type { OrderData, CartItemData, ShippingData } from '../models/Product';

export class OrderValidator {
  // ── Structural validation ──────────────────────────────────────────────────

  /**
   * Validates that an OrderData object was successfully created.
   * Throws a descriptive Error if any required field is missing.
   */
  static validateOrderCreated(order: OrderData): void {
    if (!order) {
      throw new Error('OrderValidator: order object is null or undefined');
    }
    if (!order.id || order.id.trim().length === 0) {
      throw new Error('OrderValidator: order.id is required');
    }
    if (!order.status || order.status.trim().length === 0) {
      throw new Error('OrderValidator: order.status is required');
    }
    if (order.total === undefined || order.total === null) {
      throw new Error('OrderValidator: order.total is required');
    }
    if (typeof order.total !== 'number' || isNaN(order.total) || order.total < 0) {
      throw new Error(
        `OrderValidator: order.total must be a non-negative number (got ${order.total})`,
      );
    }
    if (!order.createdAt) {
      throw new Error('OrderValidator: order.createdAt is required');
    }
    // Validate createdAt is a parseable date
    const created = new Date(order.createdAt);
    if (isNaN(created.getTime())) {
      throw new Error(`OrderValidator: order.createdAt is not a valid date: "${order.createdAt}"`);
    }
  }

  // ── Total validation ───────────────────────────────────────────────────────

  /**
   * Validates that the order total is consistent with the given subtotal
   * (after adding 8% tax and calculating shipping).
   *
   * Uses a tolerance of $1.00 by default to handle rounding differences.
   */
  static validateOrderTotals(
    order: OrderData,
    expectedSubtotal: number,
    tolerance = 1.0,
  ): boolean {
    const tax = expectedSubtotal * 0.08;
    const shipping = expectedSubtotal >= 50 ? 0 : 5.99;
    const expectedTotal = expectedSubtotal + tax + shipping;
    const diff = Math.abs(order.total - expectedTotal);
    return diff <= tolerance;
  }

  /**
   * Returns true when the order total equals the sum of all line item totals
   * (plus tax + shipping), within a reasonable tolerance.
   */
  static validateTotalMatchesLineItems(
    order: OrderData,
    tolerance = 1.0,
  ): boolean {
    if (!order.items || order.items.length === 0) return true;
    const itemSubtotal = order.items.reduce((s, i) => s + i.lineTotal, 0);
    const tax = itemSubtotal * 0.08;
    const shipping = itemSubtotal >= 50 ? 0 : 5.99;
    const computedTotal = itemSubtotal + tax + shipping;
    return Math.abs(order.total - computedTotal) <= tolerance;
  }

  // ── Item validation ────────────────────────────────────────────────────────

  /**
   * Validates that all expected CartItemData items are present in the order,
   * matching by product name and quantity.
   */
  static validateOrderItems(
    order: OrderData,
    expectedItems: CartItemData[],
  ): boolean {
    if (!order.items) return expectedItems.length === 0;
    for (const expected of expectedItems) {
      const found = order.items.find(
        (item) =>
          item.productName?.toLowerCase() === expected.productName.toLowerCase() &&
          item.quantity === expected.quantity,
      );
      if (!found) return false;
    }
    return true;
  }

  /**
   * Returns true when the order contains at least one item.
   */
  static validateHasItems(order: OrderData): boolean {
    return Array.isArray(order.items) && order.items.length > 0;
  }

  /**
   * Returns true when every item's lineTotal equals price × quantity
   * (within a $0.01 tolerance for floating point).
   */
  static validateLineTotals(order: OrderData): boolean {
    if (!order.items) return true;
    for (const item of order.items) {
      const expected = item.price * item.quantity;
      if (Math.abs(item.lineTotal - expected) > 0.01) return false;
    }
    return true;
  }

  // ── Status validation ──────────────────────────────────────────────────────

  /**
   * Validates that the order has the expected status (case-insensitive).
   */
  static validateOrderStatus(
    order: OrderData,
    expectedStatus: string,
  ): boolean {
    return order.status.toLowerCase() === expectedStatus.toLowerCase();
  }

  /**
   * Returns true when the order status is one of the valid values.
   */
  static validateStatusIsValid(order: OrderData): boolean {
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ];
    return validStatuses.includes(order.status.toLowerCase());
  }

  // ── Shipping address validation ────────────────────────────────────────────

  /**
   * Validates that the order's shipping address matches the provided ShippingData.
   * All comparisons are case-insensitive.
   */
  static validateShippingAddress(
    order: OrderData,
    expected: ShippingData,
  ): boolean {
    const addr = order.shippingAddress;
    if (!addr) return false;
    return (
      addr.name.toLowerCase() === expected.name.toLowerCase() &&
      addr.email.toLowerCase() === expected.email.toLowerCase() &&
      addr.addressLine1.toLowerCase() === expected.addressLine1.toLowerCase() &&
      addr.city.toLowerCase() === expected.city.toLowerCase() &&
      addr.state.toLowerCase() === expected.state.toLowerCase() &&
      addr.zip === expected.zip &&
      addr.country.toLowerCase() === (expected.country ?? 'us').toLowerCase()
    );
  }

  // ── Summary helpers ────────────────────────────────────────────────────────

  /**
   * Returns a list of validation errors for an order without throwing.
   */
  static getValidationErrors(order: OrderData): string[] {
    const errors: string[] = [];
    if (!order) { errors.push('order is null or undefined'); return errors; }
    if (!order.id?.trim()) errors.push('id is required');
    if (!order.status?.trim()) errors.push('status is required');
    if (order.total === undefined || order.total < 0) errors.push('total must be non-negative');
    if (!order.createdAt) errors.push('createdAt is required');
    if (!OrderValidator.validateStatusIsValid(order)) {
      errors.push(`status "${order.status}" is not a recognised value`);
    }
    return errors;
  }
}
