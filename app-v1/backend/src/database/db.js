'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'ecommerce.db');

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const database = getDb();

  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
      phone       TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city        TEXT,
      state       TEXT,
      zip         TEXT,
      country     TEXT DEFAULT 'US',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      description    TEXT,
      price          REAL NOT NULL CHECK(price >= 0),
      category       TEXT NOT NULL,
      brand          TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
      image_url      TEXT,
      rating         REAL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
      review_count   INTEGER DEFAULT 0,
      is_featured    INTEGER NOT NULL DEFAULT 0,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Carts table (one active cart per user)
    CREATE TABLE IF NOT EXISTS carts (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Cart items table
    CREATE TABLE IF NOT EXISTS cart_items (
      id           TEXT PRIMARY KEY,
      cart_id      TEXT NOT NULL,
      product_id   TEXT NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      price_at_add REAL NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      UNIQUE(cart_id, product_id)
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
      subtotal              REAL NOT NULL,
      tax                   REAL NOT NULL,
      shipping_cost         REAL NOT NULL,
      total                 REAL NOT NULL,
      shipping_name         TEXT NOT NULL,
      shipping_email        TEXT NOT NULL,
      shipping_address_line1 TEXT NOT NULL,
      shipping_address_line2 TEXT,
      shipping_city         TEXT NOT NULL,
      shipping_state        TEXT NOT NULL,
      shipping_zip          TEXT NOT NULL,
      shipping_country      TEXT NOT NULL DEFAULT 'US',
      notes                 TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- Order items table (snapshot of product data at time of order)
    CREATE TABLE IF NOT EXISTS order_items (
      id            TEXT PRIMARY KEY,
      order_id      TEXT NOT NULL,
      product_id    TEXT,
      product_name  TEXT NOT NULL,
      product_price REAL NOT NULL,
      quantity      INTEGER NOT NULL CHECK(quantity > 0),
      subtotal      REAL NOT NULL,
      FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_is_active  ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
    CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id  ON cart_items(cart_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);

  console.log('[db] Database initialized at', DB_PATH);
  return database;
}

module.exports = { getDb, initializeDatabase };
