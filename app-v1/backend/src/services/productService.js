'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');

/**
 * List products with filtering, sorting, search, and pagination.
 *
 * @param {object} opts
 * @param {string}  [opts.q]           - Full-text search on name/description
 * @param {string}  [opts.category]    - Filter by category (exact)
 * @param {string}  [opts.brand]       - Filter by brand (exact)
 * @param {number}  [opts.min_price]   - Minimum price
 * @param {number}  [opts.max_price]   - Maximum price
 * @param {boolean} [opts.in_stock]    - Only products with stock > 0
 * @param {string}  [opts.sort]        - 'price_asc'|'price_desc'|'rating'|'name'|'newest'
 * @param {number}  [opts.page]        - Page number (1-based, default 1)
 * @param {number}  [opts.limit]       - Items per page (default 12, max 100)
 * @param {boolean} [opts.includeInactive] - Admin only: include inactive products
 * @returns {{ products: object[], total: number, page: number, totalPages: number }}
 */
function listProducts(opts = {}) {
  const db = getDb();

  const {
    q,
    category,
    brand,
    min_price,
    max_price,
    in_stock,
    sort       = 'newest',
    page       = 1,
    limit      = 12,
    includeInactive = false,
  } = opts;

  const conditions = [];
  const params     = [];

  if (!includeInactive) {
    conditions.push('is_active = 1');
  }

  if (q) {
    conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
    const term = `%${q.toLowerCase()}%`;
    params.push(term, term);
  }

  if (category) {
    conditions.push('LOWER(category) = ?');
    params.push(category.toLowerCase());
  }

  if (brand) {
    conditions.push('LOWER(brand) = ?');
    params.push(brand.toLowerCase());
  }

  if (min_price !== undefined && min_price !== null && !isNaN(min_price)) {
    conditions.push('price >= ?');
    params.push(Number(min_price));
  }

  if (max_price !== undefined && max_price !== null && !isNaN(max_price)) {
    conditions.push('price <= ?');
    params.push(Number(max_price));
  }

  if (in_stock === true || in_stock === 'true' || in_stock === '1') {
    conditions.push('stock_quantity > 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortMap = {
    price_asc:  'price ASC',
    price_desc: 'price DESC',
    rating:     'rating DESC',
    name:       'name ASC',
    newest:     'created_at DESC',
  };
  const orderBy = sortMap[sort] || 'created_at DESC';

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const safePage  = Math.max(Number(page) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM products ${where}`).get(...params).n;

  const products = db.prepare(`
    SELECT id, name, description, price, category, brand,
           stock_quantity, image_url, rating, review_count,
           is_featured, is_active, created_at, updated_at
    FROM products
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, offset);

  return {
    products,
    total,
    page:       safePage,
    limit:      safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}

/**
 * Get a single product by ID.
 * @param {string} id
 * @param {boolean} [includeInactive]
 * @returns {object}
 */
function getProductById(id, includeInactive = false) {
  const db = getDb();
  const extra = includeInactive ? '' : 'AND is_active = 1';
  const product = db.prepare(
    `SELECT * FROM products WHERE id = ? ${extra}`
  ).get(id);

  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }
  return product;
}

/**
 * Get all unique categories (active products only).
 * @returns {string[]}
 */
function getCategories() {
  const db = getDb();
  const rows = db.prepare(
    "SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category"
  ).all();
  return rows.map((r) => r.category);
}

/**
 * Get featured active products.
 * @param {number} [limit=8]
 * @returns {object[]}
 */
function getFeaturedProducts(limit = 8) {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, description, price, category, brand,
           stock_quantity, image_url, rating, review_count, is_featured
    FROM products
    WHERE is_active = 1 AND is_featured = 1
    ORDER BY rating DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Create a new product (admin).
 * @param {object} data
 * @returns {object} created product
 */
function createProduct(data) {
  const db  = getDb();
  const id  = uuidv4();

  db.prepare(`
    INSERT INTO products
      (id, name, description, price, category, brand, stock_quantity,
       image_url, rating, review_count, is_featured, is_active)
    VALUES
      (@id, @name, @description, @price, @category, @brand, @stock_quantity,
       @image_url, @rating, @review_count, @is_featured, @is_active)
  `).run({
    id,
    name:           data.name.trim(),
    description:    data.description || null,
    price:          Number(data.price),
    category:       data.category.trim(),
    brand:          data.brand || null,
    stock_quantity: Number(data.stock_quantity) || 0,
    image_url:      data.image_url || null,
    rating:         Number(data.rating)       || 0,
    review_count:   Number(data.review_count) || 0,
    is_featured:    data.is_featured ? 1 : 0,
    is_active:      data.is_active !== false ? 1 : 0,
  });

  return getProductById(id, true);
}

/**
 * Update an existing product (admin).
 * @param {string} id
 * @param {object} data
 * @returns {object} updated product
 */
function updateProduct(id, data) {
  const db = getDb();

  // Ensure product exists
  getProductById(id, true);

  const allowed = [
    'name','description','price','category','brand',
    'stock_quantity','image_url','rating','review_count',
    'is_featured','is_active',
  ];

  const updates = [];
  const values  = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      updates.push(`${key} = ?`);
      let val = data[key];
      if (['price','stock_quantity','rating','review_count'].includes(key)) val = Number(val);
      if (['is_featured','is_active'].includes(key)) val = val ? 1 : 0;
      values.push(val);
    }
  }

  if (updates.length === 0) {
    const err = new Error('No valid fields provided for update.');
    err.status = 400;
    throw err;
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getProductById(id, true);
}

/**
 * Soft-delete a product (sets is_active = false).
 * @param {string} id
 * @returns {{ message: string }}
 */
function softDeleteProduct(id) {
  const db = getDb();
  getProductById(id, true); // ensure exists

  db.prepare(`
    UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?
  `).run(id);

  return { message: 'Product deactivated successfully.' };
}

module.exports = {
  listProducts,
  getProductById,
  getCategories,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  softDeleteProduct,
};
