'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const cartService = require('../services/cartService');
// CHANGE-7: use orderManagementService for cart retrieval
const orderManagementService = require('../services/orderManagementService');

const router = express.Router();

// All cart routes require authentication
router.use(authenticateToken);

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

// ── GET /api/cart ─────────────────────────────────────────────────────────────
// CHANGE-7: now uses orderManagementService.getCartWithProducts()
router.get('/', (req, res, next) => {
  try {
    const cartData = orderManagementService.getCartWithProducts(req.user.id);
    res.json({ success: true, data: cartData });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cart/items ──────────────────────────────────────────────────────
router.post(
  '/items',
  [
    body('product_id')
      .notEmpty().withMessage('product_id is required.'),
    body('quantity')
      .optional()
      .isInt({ min: 1 }).withMessage('quantity must be a positive integer.'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const { product_id, quantity = 1 } = req.body;
      const cartData = cartService.addItem(req.user.id, product_id, Number(quantity));

      res.status(201).json({
        success: true,
        message: 'Item added to cart.',
        data: cartData,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/cart/items/:itemId ───────────────────────────────────────────────
router.put(
  '/items/:itemId',
  [
    param('itemId').notEmpty().withMessage('itemId is required.'),
    body('quantity')
      .isInt({ min: 0 }).withMessage('quantity must be a non-negative integer.'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const { quantity } = req.body;
      const cartData = cartService.updateItem(
        req.user.id,
        req.params.itemId,
        Number(quantity)
      );

      res.json({
        success: true,
        message: quantity === 0 ? 'Item removed from cart.' : 'Cart item updated.',
        data: cartData,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/cart/items/:itemId ────────────────────────────────────────────
router.delete(
  '/items/:itemId',
  [param('itemId').notEmpty().withMessage('itemId is required.')],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const cartData = cartService.removeItem(req.user.id, req.params.itemId);
      res.json({
        success: true,
        message: 'Item removed from cart.',
        data: cartData,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/cart ──────────────────────────────────────────────────────────
router.delete('/', (req, res, next) => {
  try {
    const result = cartService.clearCart(req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
