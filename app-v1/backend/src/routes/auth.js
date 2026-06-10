'use strict';

const express  = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const authService = require('../services/authService');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function handleValidationErrors(req, res) {
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

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email')
      .isEmail().withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name')
      .trim().notEmpty().withMessage('Full name is required.')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),
  ],
  async (req, res, next) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      const { email, password, name } = req.body;
      const { user, token } = await authService.registerUser({ email, password, name });

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required.'),
  ],
  async (req, res, next) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      const { email, password } = req.body;
      const { user, token }     = await authService.loginUser({ email, password });

      res.json({
        success: true,
        message: 'Login successful.',
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// JWT is stateless; the client simply discards the token.
// This endpoint exists so the client can signal intent and clear server-side
// sessions if they are added later.
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Please discard your token.',
  });
});

// ── GET /api/auth/profile ────────────────────────────────────────────────────
router.get('/profile', authenticateToken, (req, res, next) => {
  try {
    const profile = authService.getProfile(req.user.id);
    res.json({ success: true, data: { user: profile } });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put(
  '/profile',
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty.')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 30 }).withMessage('Phone number is too long.'),
    body('address_line1')
      .optional()
      .trim()
      .isLength({ max: 200 }),
    body('address_line2')
      .optional()
      .trim()
      .isLength({ max: 200 }),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('state')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('zip')
      .optional()
      .trim()
      .isLength({ max: 20 }),
    body('country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 3 }).withMessage('Country must be a 2–3 character code.'),
  ],
  (req, res, next) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      const updated = authService.updateProfile(req.user.id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: { user: updated },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
