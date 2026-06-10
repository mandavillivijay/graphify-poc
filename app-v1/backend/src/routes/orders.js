'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const orderService = require('../services/orderService');

const router = express.Router();

// All order routes require authentication
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

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const result = orderService.getOrdersByUser(req.user.id, {
        page:  Number(req.query.page)  || 1,
        limit: Number(req.query.limit) || 10,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Order ID is required.')],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      // Pass userId to enforce ownership
      const order = orderService.getOrderById(req.params.id, req.user.id);
      res.json({ success: true, data: { order } });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('shipping.name')
      .trim().notEmpty().withMessage('Shipping name is required.'),
    body('shipping.email')
      .isEmail().withMessage('A valid shipping email is required.')
      .normalizeEmail(),
    body('shipping.address_line1')
      .trim().notEmpty().withMessage('Shipping address line 1 is required.'),
    body('shipping.city')
      .trim().notEmpty().withMessage('Shipping city is required.'),
    body('shipping.state')
      .trim().notEmpty().withMessage('Shipping state is required.'),
    body('shipping.zip')
      .trim().notEmpty().withMessage('Shipping zip code is required.'),
    body('shipping.country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 3 }).withMessage('Country must be a 2–3 character code.'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters.'),
  ],
  (req, res, next) => {
    try {
      const ve = handleValidation(req, res);
      if (ve) return;

      const { shipping, notes } = req.body;

      const order = orderService.createFromCart(req.user.id, {
        name:          shipping.name,
        email:         shipping.email,
        address_line1: shipping.address_line1,
        address_line2: shipping.address_line2 || null,
        city:          shipping.city,
        state:         shipping.state,
        zip:           shipping.zip,
        country:       shipping.country || 'US',
        notes:         notes || null,
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
