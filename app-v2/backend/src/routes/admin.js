'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const productService = require('../services/productService');
const orderService   = require('../services/orderService');
const { getDb }      = require('../database/db');

const router = express.Router();

// All admin routes require both authentication and admin role
router.use(authenticateToken, requireAdmin);

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Product management
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/products ───────────────────────────────────────────────────
router.get(
  '/products',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const result = productService.listProducts({
        q:               req.query.q,
        category:        req.query.category,
        brand:           req.query.brand,
        sort:            req.query.sort,
        page:            Number(req.query.page)  || 1,
        limit:           Number(req.query.limit) || 20,
        includeInactive: true,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/admin/products ──────────────────────────────────────────────────
router.post(
  '/products',
  [
    body('name')
      .trim().notEmpty().withMessage('Product name is required.')
      .isLength({ max: 200 }),
    body('price')
      .isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
    body('category')
      .trim().notEmpty().withMessage('Category is required.'),
    body('stock_quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('stock_quantity must be a non-negative integer.'),
    body('rating')
      .optional()
      .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5.'),
    body('review_count')
      .optional()
      .isInt({ min: 0 }),
    body('is_featured')
      .optional()
      .isBoolean(),
    body('is_active')
      .optional()
      .isBoolean(),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const product = productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/admin/products/:id ───────────────────────────────────────────────
router.put(
  '/products/:id',
  [
    param('id').notEmpty(),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be >= 0.'),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('rating').optional().isFloat({ min: 0, max: 5 }),
    body('review_count').optional().isInt({ min: 0 }),
    body('is_featured').optional().isBoolean(),
    body('is_active').optional().isBoolean(),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const product = productService.updateProduct(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Product updated successfully.',
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/admin/products/:id ────────────────────────────────────────────
router.delete(
  '/products/:id',
  [param('id').notEmpty()],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const result = productService.softDeleteProduct(req.params.id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// Order management
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
router.get(
  '/orders',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn([
      'pending','confirmed','processing','shipped','delivered','cancelled','refunded'
    ]).withMessage('Invalid status value.'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const result = orderService.getAllOrders({
        page:   Number(req.query.page)  || 1,
        limit:  Number(req.query.limit) || 20,
        status: req.query.status,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/admin/orders/:id ─────────────────────────────────────────────────
router.get(
  '/orders/:id',
  [param('id').notEmpty()],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      // Pass null as userId to bypass ownership check (admin has full access)
      const order = orderService.getOrderById(req.params.id, null);
      res.json({ success: true, data: { order } });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/admin/orders/:id/status ─────────────────────────────────────────
router.put(
  '/orders/:id/status',
  [
    param('id').notEmpty(),
    body('status')
      .notEmpty().withMessage('Status is required.')
      .isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded'])
      .withMessage('Invalid status value.'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const order = orderService.updateOrderStatus(req.params.id, req.body.status);
      res.json({
        success: true,
        message: `Order status updated to "${req.body.status}".`,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard stats
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', (req, res, next) => {
  try {
    const db = getDb();

    const total_products = db.prepare(
      'SELECT COUNT(*) AS n FROM products'
    ).get().n;

    const total_active_products = db.prepare(
      'SELECT COUNT(*) AS n FROM products WHERE is_active = 1'
    ).get().n;

    const total_orders = db.prepare(
      'SELECT COUNT(*) AS n FROM orders'
    ).get().n;

    const total_users = db.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"
    ).get().n;

    const revenueRow = db.prepare(
      "SELECT COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status NOT IN ('cancelled','refunded')"
    ).get();

    const revenue = Math.round(revenueRow.revenue * 100) / 100;

    const pending_orders = db.prepare(
      "SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"
    ).get().n;

    const low_stock_products = db.prepare(
      'SELECT COUNT(*) AS n FROM products WHERE stock_quantity <= 5 AND is_active = 1'
    ).get().n;

    const recent_orders = db.prepare(`
      SELECT o.id, o.status, o.total, o.created_at,
             u.name AS customer_name, u.email AS customer_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all();

    const orders_by_status = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      data: {
        total_products,
        total_active_products,
        total_orders,
        total_users,
        revenue,
        pending_orders,
        low_stock_products,
        recent_orders,
        orders_by_status,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
