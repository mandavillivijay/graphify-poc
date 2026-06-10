'use strict';

/**
 * orderService — thin wrapper delegating to orderManagementService.
 *
 * CHANGE-7: This file now acts as a backwards-compatible facade.
 * All logic has moved to orderManagementService.js.
 * Existing callers (e.g. admin.js) continue to work unchanged.
 */

const orderManagementService = require('./orderManagementService');

function createFromCart(userId, shippingInfo) {
  return orderManagementService.createOrderFromCart(userId, shippingInfo);
}

function getOrderById(orderId, userId = null) {
  return orderManagementService.getOrderById(orderId, userId);
}

function getOrdersByUser(userId, opts = {}) {
  return orderManagementService.getOrderHistory(userId, opts.page, opts.limit);
}

function getAllOrders(opts = {}) {
  return orderManagementService.getAllOrders(opts);
}

function updateOrderStatus(orderId, status) {
  return orderManagementService.updateOrderStatus(orderId, status);
}

module.exports = {
  createFromCart,
  getOrderById,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  TAX_RATE: orderManagementService.TAX_RATE,
  SHIPPING_COST: orderManagementService.SHIPPING_COST,
};
