'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

/**
 * Extract the Bearer token from the Authorization header.
 * Returns the token string or null.
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * authenticateToken — mandatory auth middleware.
 * Sets req.user on success; returns 401/403 on failure.
 */
function authenticateToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Verify the user still exists in the database
    const db = getDb();
    const user = db.prepare(
      'SELECT id, email, name, role FROM users WHERE id = ?'
    ).get(payload.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or malformed token.',
    });
  }
}

/**
 * requireAdmin — must be used after authenticateToken.
 * Returns 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin access required.',
    });
  }
  next();
}

/**
 * optionalAuth — sets req.user if a valid token is present,
 * but does NOT block the request if there is no token or if it's invalid.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare(
      'SELECT id, email, name, role FROM users WHERE id = ?'
    ).get(payload.userId);

    if (user) req.user = user;
  } catch {
    // Ignore token errors for optional auth
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, optionalAuth };
