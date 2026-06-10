'use strict';

/**
 * OrderManagementService
 *
 * Unified service that combines order and cart operations.
 * Handles the full order lifecycle from cart validation through
 * order creation, status updates, and history retrieval.
 *
 * CHANGE-7: This replaces the previously split orderService / cartService
 * approach by consolidating order-related operations in one place.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const cartService = require('./cartService');

const TAX_RATE = 0.10;      // 10%
const SHIPPING_COST = 5.99; // flat rate

class OrderManagementService {
  /**
   * Get the cart with full product details for a user.
   * Delegates to cartService for the actual query.
   *
   * @param {string} userId
   * @returns {{ cart: object, items: object[], totals: object }}
   */
  getCartWithProducts(userId) {
    return cartService.getCart(userId);
  }

  /**
   * Validate the cart for checkout — ensures products are active,
   * in stock, and the cart is not empty.
   *
   * @param {string} userId
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateCartForCheckout(userId) {
    const db = getDb();
    const { cart, items } = this.getCartWithProducts(userId);
    const errors = [];

    if (!items || items.length === 0) {
      errors.push('Cart is empty.');
      return { valid: false, errors, cart: null, items: [] };
    }

    for (const item of items) {
      if (!item.product_is_active) {
        errors.push(`"${item.product_name}" is no longer available.`);
      } else if (item.stock_quantity < item.quantity) {
        errors.push(
          `Insufficient stock for "${item.product_name}". ` +
          `Requested: ${item.quantity}, available: ${item.stock_quantity}.`
        );
      }
    }

    return { valid: errors.length === 0, errors, cart, items };
  }

  /**
   * Calculate order totals from an array of cart items.
   *
   * @param {object[]} cartItems
   * @returns {{ subtotal: number, tax: number, shippingCost: number, total: number }}
   */
  calculateOrderTotals(cartItems) {
    const subtotal = Math.round(
      cartItems.reduce((sum, i) => sum + i.price_at_add * i.quantity, 0) * 100
    ) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax + SHIPPING_COST) * 100) / 100;
    return { subtotal, tax, shippingCost: SHIPPING_COST, total };
  }

  /**
   * Create an order from the authenticated user's current cart.
   * Moved from orderService.createFromCart.
   *
   * @param {string} userId
   * @param {object} shippingData
   * @returns {object} created order with items
   */
  createOrderFromCart(userId, shippingData) {
    const db = getDb();
    const { valid, errors, cart, items } = this.validateCartForCheckout(userId);

    if (!valid) {
      const err = new Error(errors[0] || 'Cart validation failed.');
      err.status = 400;
      throw err;
    }

    const { subtotal, tax, shippingCost, total } = this.calculateOrderTotals(items);
    const orderId = uuidv4();

    const placeOrder = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (
          id, user_id, status,
          subtotal, tax, shipping_cost, total,
          shipping_name, shipping_email,
          shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_state, shipping_zip, shipping_country,
          notes
        ) VALUES (
          @id, @user_id, 'pending',
          @subtotal, @tax, @shipping_cost, @total,
          @shipping_name, @shipping_email,
          @shipping_address_line1, @shipping_address_line2,
          @shipping_city, @shipping_state, @shipping_zip, @shipping_country,
          @notes
        )
      `).run({
        id:                     orderId,
        user_id:                userId,
        subtotal,
        tax,
        shipping_cost:          shippingCost,
        total,
        shipping_name:          shippingData.name,
        shipping_email:         shippingData.email,
        shipping_address_line1: shippingData.address_line1,
        shipping_address_line2: shippingData.address_line2 || null,
        shipping_city:          shippingData.city,
        shipping_state:         shippingData.state,
        shipping_zip:           shippingData.zip,
        shipping_country:       shippingData.country || 'US',
        notes:                  shippingData.notes || null,
      });

      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const decrementStock = db.prepare(`
        UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime('now') WHERE id = ?
      `);

      for (const item of items) {
        const itemSubtotal = Math.round(item.price_at_add * item.quantity * 100) / 100;
        insertItem.run(uuidv4(), orderId, item.product_id, item.product_name, item.price_at_add, item.quantity, itemSubtotal);
        decrementStock.run(item.quantity, item.product_id);
      }

      // Clear cart
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
      db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);
    });

    placeOrder();
    return this.getOrderById(orderId);
  }

  /**
   * Create a guest order (no user_id, stores guest_email).
   * CHANGE-4: supports guest checkout flow.
   *
   * @param {string} guestEmail
   * @param {Array<{productId: string, quantity: number}>} cartItems
   * @param {object} shippingData
   * @returns {object} created order with items
   */
  createGuestOrder(guestEmail, cartItems, shippingData) {
    const db = getDb();

    if (!cartItems || cartItems.length === 0) {
      const err = new Error('Cannot create an order with no items.');
      err.status = 400;
      throw err;
    }

    // Load product details for each cart item
    const resolvedItems = cartItems.map(({ productId, quantity }) => {
      const product = db.prepare(
        'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ?'
      ).get(productId);

      if (!product) {
        const err = new Error(`Product "${productId}" not found.`);
        err.status = 400;
        throw err;
      }
      if (!product.is_active) {
        const err = new Error(`"${product.name}" is no longer available.`);
        err.status = 400;
        throw err;
      }
      if (product.stock_quantity < quantity) {
        const err = new Error(
          `Insufficient stock for "${product.name}". ` +
          `Requested: ${quantity}, available: ${product.stock_quantity}.`
        );
        err.status = 400;
        throw err;
      }

      return { ...product, quantity, price_at_add: product.price };
    });

    const subtotal = Math.round(resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax + SHIPPING_COST) * 100) / 100;
    const orderId = uuidv4();

    const placeGuestOrder = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (
          id, user_id, guest_email, status,
          subtotal, tax, shipping_cost, total,
          shipping_name, shipping_email,
          shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_state, shipping_zip, shipping_country
        ) VALUES (
          @id, NULL, @guest_email, 'pending',
          @subtotal, @tax, @shipping_cost, @total,
          @shipping_name, @shipping_email,
          @shipping_address_line1, @shipping_address_line2,
          @shipping_city, @shipping_state, @shipping_zip, @shipping_country
        )
      `).run({
        id:                     orderId,
        guest_email:            guestEmail,
        subtotal,
        tax,
        shipping_cost:          SHIPPING_COST,
        total,
        shipping_name:          shippingData.name,
        shipping_email:         shippingData.email,
        shipping_address_line1: shippingData.address_line1,
        shipping_address_line2: shippingData.address_line2 || null,
        shipping_city:          shippingData.city,
        shipping_state:         shippingData.state,
        shipping_zip:           shippingData.zip,
        shipping_country:       shippingData.country || 'US',
      });

      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const decrementStock = db.prepare(`
        UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime('now') WHERE id = ?
      `);

      for (const item of resolvedItems) {
        const itemSubtotal = Math.round(item.price * item.quantity * 100) / 100;
        insertItem.run(uuidv4(), orderId, item.id, item.name, item.price, item.quantity, itemSubtotal);
        decrementStock.run(item.quantity, item.id);
      }
    });

    placeGuestOrder();
    return this.getOrderById(orderId);
  }

  /**
   * Update order status (admin operation).
   *
   * @param {string} orderId
   * @param {string} status
   * @param {string} [adminId] - for audit trail (future use)
   * @returns {object} updated order
   */
  updateOrderStatus(orderId, status, adminId = null) {
    const db = getDb();
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      const err = new Error('Order not found.');
      err.status = 404;
      throw err;
    }

    db.prepare(`
      UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, orderId);

    return this.getOrderById(orderId);
  }

  /**
   * Get paginated order history for a user.
   *
   * @param {string} userId
   * @param {number} [page=1]
   * @param {number} [limit=10]
   * @returns {{ orders: object[], total: number, page: number, totalPages: number }}
   */
  getOrderHistory(userId, page = 1, limit = 10) {
    const db = getDb();
    const safeLimit = Math.min(Number(limit) || 10, 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const total = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(userId).n;

    const orders = db.prepare(`
      SELECT * FROM orders WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, safeLimit, offset);

    const withCounts = orders.map((o) => {
      const { item_count } = db.prepare(
        'SELECT COUNT(*) AS item_count FROM order_items WHERE order_id = ?'
      ).get(o.id);
      return { ...o, item_count };
    });

    return {
      orders: withCounts,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Get a single order by ID, optionally scoped to a user.
   *
   * @param {string} orderId
   * @param {string|null} [userId] - if provided, enforces ownership
   * @returns {object}
   */
  getOrderById(orderId, userId = null) {
    const db = getDb();

    const order = userId
      ? db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId)
      : db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      const err = new Error('Order not found.');
      err.status = 404;
      throw err;
    }

    const orderItems = db.prepare(`
      SELECT oi.*, p.image_url AS product_image
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `).all(orderId);

    return { ...order, items: orderItems };
  }

  /**
   * List all orders (admin).
   *
   * @param {{ page?: number, limit?: number, status?: string }} opts
   * @returns {{ orders: object[], total: number, page: number, totalPages: number }}
   */
  getAllOrders(opts = {}) {
    const db = getDb();
    const limit = Math.min(Number(opts.limit) || 20, 100);
    const page = Math.max(Number(opts.page) || 1, 1);
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (opts.status) {
      conditions.push('o.status = ?');
      params.push(opts.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS n FROM orders o ${where}`).get(...params).n;

    // LEFT JOIN to support guest orders (user_id can be null)
    const orders = db.prepare(`
      SELECT o.*, u.name AS customer_name, u.email AS customer_email
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

const orderManagementService = new OrderManagementService();

module.exports = orderManagementService;
module.exports.TAX_RATE = TAX_RATE;
module.exports.SHIPPING_COST = SHIPPING_COST;
