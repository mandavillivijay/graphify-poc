'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');

/**
 * Retrieve (or create) a cart for a user.
 * @param {string} userId
 * @returns {{ id: string, user_id: string }}
 */
function getOrCreateCart(userId) {
  const db = getDb();

  let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);

  if (!cart) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO carts (id, user_id) VALUES (?, ?)
    `).run(id, userId);
    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
  }

  return cart;
}

/**
 * Get the full cart (with items and product details) for a user.
 * @param {string} userId
 * @returns {{ cart: object, items: object[], totals: object }}
 */
function getCart(userId) {
  const db   = getDb();
  const cart = getOrCreateCart(userId);

  const items = db.prepare(`
    SELECT
      ci.id,
      ci.cart_id,
      ci.product_id,
      ci.quantity,
      ci.price_at_add,
      ci.created_at,
      ci.updated_at,
      p.name          AS product_name,
      p.image_url     AS product_image,
      p.price         AS current_price,
      p.stock_quantity,
      p.is_active     AS product_is_active
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at ASC
  `).all(cart.id);

  const totals = calculateTotals(items);

  return { cart, items, totals };
}

/**
 * Add an item to the cart (or increment quantity if already present).
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity
 * @returns {{ cart: object, items: object[], totals: object }}
 */
function addItem(userId, productId, quantity = 1) {
  const db = getDb();

  // Validate product
  const product = db.prepare(
    'SELECT * FROM products WHERE id = ? AND is_active = 1'
  ).get(productId);

  if (!product) {
    const err = new Error('Product not found or is no longer available.');
    err.status = 404;
    throw err;
  }

  if (product.stock_quantity < quantity) {
    const err = new Error(
      `Insufficient stock. Only ${product.stock_quantity} unit(s) available.`
    );
    err.status = 400;
    throw err;
  }

  const cart = getOrCreateCart(userId);

  // Check if item is already in cart
  const existing = db.prepare(
    'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?'
  ).get(cart.id, productId);

  if (existing) {
    const newQty = existing.quantity + quantity;

    if (newQty > product.stock_quantity) {
      const err = new Error(
        `Cannot add ${quantity} more. You already have ${existing.quantity} in cart and only ${product.stock_quantity} are available.`
      );
      err.status = 400;
      throw err;
    }

    db.prepare(`
      UPDATE cart_items
      SET quantity = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newQty, existing.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items (id, cart_id, product_id, quantity, price_at_add)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), cart.id, productId, quantity, product.price);
  }

  // Update cart timestamp
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(userId);
}

/**
 * Update the quantity of an existing cart item.
 * @param {string} userId
 * @param {string} itemId
 * @param {number} quantity
 * @returns {{ cart: object, items: object[], totals: object }}
 */
function updateItem(userId, itemId, quantity) {
  const db   = getDb();
  const cart = getOrCreateCart(userId);

  const item = db.prepare(
    'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?'
  ).get(itemId, cart.id);

  if (!item) {
    const err = new Error('Cart item not found.');
    err.status = 404;
    throw err;
  }

  if (quantity <= 0) {
    return removeItem(userId, itemId);
  }

  const product = db.prepare(
    'SELECT stock_quantity FROM products WHERE id = ?'
  ).get(item.product_id);

  if (product && quantity > product.stock_quantity) {
    const err = new Error(
      `Requested quantity (${quantity}) exceeds available stock (${product.stock_quantity}).`
    );
    err.status = 400;
    throw err;
  }

  db.prepare(`
    UPDATE cart_items
    SET quantity = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(quantity, itemId);

  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(userId);
}

/**
 * Remove a specific item from the cart.
 * @param {string} userId
 * @param {string} itemId
 * @returns {{ cart: object, items: object[], totals: object }}
 */
function removeItem(userId, itemId) {
  const db   = getDb();
  const cart = getOrCreateCart(userId);

  const item = db.prepare(
    'SELECT id FROM cart_items WHERE id = ? AND cart_id = ?'
  ).get(itemId, cart.id);

  if (!item) {
    const err = new Error('Cart item not found.');
    err.status = 404;
    throw err;
  }

  db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(userId);
}

/**
 * Remove all items from the user's cart.
 * @param {string} userId
 * @returns {{ message: string }}
 */
function clearCart(userId) {
  const db   = getDb();
  const cart = getOrCreateCart(userId);

  db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return { message: 'Cart cleared successfully.' };
}

/**
 * Calculate cart totals from an array of cart items.
 * @param {object[]} items
 * @returns {{ itemCount: number, subtotal: number }}
 */
function calculateTotals(items) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal  = items.reduce((sum, i) => sum + i.price_at_add * i.quantity, 0);

  return {
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

module.exports = {
  getOrCreateCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  calculateTotals,
};
