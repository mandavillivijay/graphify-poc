'use strict';

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');

const JWT_SECRET     = process.env.JWT_SECRET     || 'fallback_secret_do_not_use_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS    = 10;

/**
 * Hash a plain-text password.
 * @param {string} plain
 * @returns {Promise<string>}
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Sign a JWT for the given user.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string}
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{ userId: string, email: string, role: string }}
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Register a new user account.
 * @param {{ email: string, password: string, name: string }} data
 * @returns {{ user: object, token: string }}
 */
async function registerUser({ email, password, name }) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    const err = new Error('An account with that email address already exists.');
    err.status = 409;
    throw err;
  }

  const id            = uuidv4();
  const password_hash = await hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, 'customer')
  `).run(id, email.toLowerCase(), password_hash, name.trim());

  const user  = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id);
  const token = generateToken(user);

  return { user, token };
}

/**
 * Authenticate a user with email + password.
 * @param {{ email: string, password: string }} credentials
 * @returns {{ user: object, token: string }}
 */
async function loginUser({ email, password }) {
  const db = getDb();

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const match = await verifyPassword(password, row.password_hash);
  if (!match) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone,
    address_line1: row.address_line1,
    address_line2: row.address_line2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    created_at: row.created_at,
  };

  const token = generateToken(user);
  return { user, token };
}

/**
 * Get a user's profile (without the password hash).
 * @param {string} userId
 * @returns {object}
 */
function getProfile(userId) {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, email, name, role, phone,
           address_line1, address_line2, city, state, zip, country,
           created_at, updated_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return user;
}

/**
 * Update a user's profile fields (non-sensitive only).
 * @param {string} userId
 * @param {object} fields
 * @returns {object} updated profile
 */
function updateProfile(userId, fields) {
  const db = getDb();
  const allowed = ['name','phone','address_line1','address_line2','city','state','zip','country'];
  const updates = [];
  const values  = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) {
    const err = new Error('No valid fields provided for update.');
    err.status = 400;
    throw err;
  }

  updates.push("updated_at = datetime('now')");
  values.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getProfile(userId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
};
