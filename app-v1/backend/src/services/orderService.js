'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { getOrCreateCart, clearCart } = require('./cartService');

const TAX_RATE     = 0.10;   // 10 %
const SHIPPING_COST = 5.99;  // flat rate

/**
 * Create an order from the user's current cart.
 *
 * @param {string} userId
 * @param {object} shippingInfo
 * @param {string} shippingInfo.name
 * @param {string} shippingInfo.email
 * @param {string} shippingInfo.address_line1
 * @param {string} [shippingInfo.address_line2]
 * @param {string} shippingInfo.city
 * @param {string} shippingInfo.state
 * @param {string} shippingInfo.zip
 * @param {string} [shippingInfo.country]
 * @param {string} [shippingInfo.notes]
 * @returns {object} the created order with items
 */
function createFromCart(userId, shippingInfo) {
  const db   = getDb();
  const cart = getOrCreateCart(userId);

  // Load cart items with product details
  const items = db.prepare(`
    SELECT
      ci.id           AS cart_item_id,
      ci.product_id,
      ci.quantity,
      ci.price_at_add,
      p.name          AS product_name,
      p.stock_quantity,
      p.is_active
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
  `).all(cart.id);

  if (items.length === 0) {
    const err = new Error('Cannot create an order from an empty cart.');
    err.status = 400;
    throw err;
  }

  // Validate all products are still active and have sufficient stock
  for (const item of items) {
    if (!item.is_active) {
      const err = new Error(
        `"${item.product_name}" is no longer available and cannot be ordered.`
      );
      err.status = 400;
      throw err;
    }
    if (item.stock_quantity < item.quantity) {
      const err = new Error(
        `Insufficient stock for "${item.product_name}". ` +
        `Requested: ${item.quantity}, available: ${item.stock_quantity}.`
      );
      err.status = 400;
      throw err;
    }
  }

  // Calculate totals
  const subtotal = items.reduce(
    (sum, i) => sum + i.price_at_add * i.quantity, 0
  );
  const tax      = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total    = Math.round((subtotal + tax + SHIPPING_COST) * 100) / 100;

  const orderId = uuidv4();

  // Wrap everything in a transaction
  const placeOrder = db.transaction(() => {
    // Insert order
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
      id:                    orderId,
      user_id:               userId,
      subtotal:              Math.round(subtotal * 100) / 100,
      tax,
      shipping_cost:         SHIPPING_COST,
      total,
      shipping_name:         shippingInfo.name,
      shipping_email:        shippingInfo.email,
      shipping_address_line1: shippingInfo.address_line1,
      shipping_address_line2: shippingInfo.address_line2 || null,
      shipping_city:         shippingInfo.city,
      shipping_state:        shippingInfo.state,
      shipping_zip:          shippingInfo.zip,
      shipping_country:      shippingInfo.country || 'US',
      notes:                 shippingInfo.notes || null,
    });

    // Insert order items and decrement stock
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const decrementStock = db.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity - ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const item of items) {
      const itemSubtotal = Math.round(item.price_at_add * item.quantity * 100) / 100;
      insertItem.run(
        uuidv4(), orderId, item.product_id,
        item.product_name, item.price_at_add,
        item.quantity, itemSubtotal
      );
      decrementStock.run(item.quantity, item.product_id);
    }

    // Clear the cart
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);
  });

  placeOrder();

  return getOrderById(orderId, userId);
}

/**
 * Get a single order with its items.
 * @param {string} orderId
 * @param {string} [userId]  - if provided, verifies ownership (null = admin bypass)
 * @returns {object}
 */
function getOrderById(orderId, userId = null) {
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
 * List orders for a specific user, newest first.
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} opts
 * @returns {{ orders: object[], total: number, page: number, totalPages: number }}
 */
function getOrdersByUser(userId, opts = {}) {
  const db    = getDb();
  const limit = Math.min(Number(opts.limit) || 10, 50);
  const page  = Math.max(Number(opts.page)  || 1,  1);
  const offset = (page - 1) * limit;

  const total = db.prepare(
    'SELECT COUNT(*) AS n FROM orders WHERE user_id = ?'
  ).get(userId).n;

  const orders = db.prepare(`
    SELECT * FROM orders WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  // Attach item counts
  const withCounts = orders.map((o) => {
    const { item_count } = db.prepare(
      'SELECT COUNT(*) AS item_count FROM order_items WHERE order_id = ?'
    ).get(o.id);
    return { ...o, item_count };
  });

  return {
    orders: withCounts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * List all orders (admin).
 * @param {{ page?: number, limit?: number, status?: string }} opts
 * @returns {{ orders: object[], total: number, page: number, totalPages: number }}
 */
function getAllOrders(opts = {}) {
  const db     = getDb();
  const limit  = Math.min(Number(opts.limit) || 20, 100);
  const page   = Math.max(Number(opts.page)  || 1,  1);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params     = [];

  if (opts.status) {
    conditions.push('o.status = ?');
    params.push(opts.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM orders o ${where}`
  ).get(...params).n;

  const orders = db.prepare(`
    SELECT o.*, u.name AS customer_name, u.email AS customer_email
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update the status of an order (admin).
 * @param {string} orderId
 * @param {string} status
 * @returns {object} updated order
 */
function updateOrderStatus(orderId, status) {
  const db = getDb();

  const validStatuses = [
    'pending','confirmed','processing','shipped','delivered','cancelled','refunded'
  ];

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

  return getOrderById(orderId);
}

module.exports = {
  createFromCart,
  getOrderById,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  TAX_RATE,
  SHIPPING_COST,
};
