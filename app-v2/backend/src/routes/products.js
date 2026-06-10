'use strict';

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { optionalAuth } = require('../middleware/auth');
const productService = require('../services/productService');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ── GET /api/products/categories ─────────────────────────────────────────────
// Must be before /:id to avoid "categories" being treated as an ID
router.get('/categories', (req, res, next) => {
  try {
    const categories = productService.getCategories();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/featured ────────────────────────────────────────────────
router.get('/featured', (req, res, next) => {
  try {
    const limit    = Math.min(Number(req.query.limit) || 8, 20);
    const products = productService.getFeaturedProducts(limit);
    res.json({ success: true, data: { products } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
    query('min_price').optional().isFloat({ min: 0 }).withMessage('min_price must be >= 0'),
    query('max_price').optional().isFloat({ min: 0 }).withMessage('max_price must be >= 0'),
    query('sort').optional().isIn(['price_asc','price_desc','rating','name','newest'])
      .withMessage('sort must be price_asc|price_desc|rating|name|newest'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const {
        q, category, brand, min_price, max_price,
        in_stock, sort, page, limit,
      } = req.query;

      const result = productService.listProducts({
        q,
        category,
        brand,
        min_price: min_price !== undefined ? Number(min_price) : undefined,
        max_price: max_price !== undefined ? Number(max_price) : undefined,
        in_stock,
        sort,
        page:  Number(page)  || 1,
        limit: Number(limit) || 12,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Product ID is required.')],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const product = productService.getProductById(req.params.id);
      res.json({ success: true, data: { product } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
