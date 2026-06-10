'use strict';

/**
 * notFoundHandler — catches any request that didn't match a route.
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * errorHandler — global Express error-handling middleware.
 * Must have exactly four parameters (err, req, res, next) so Express
 * recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the error (in production you'd send this to a logging service)
  if (process.env.NODE_ENV !== 'test') {
    console.error('[error]', err.stack || err.message || err);
  }

  // Handle specific known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors || [],
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: err.message || 'Unauthorized.',
    });
  }

  // SQLite constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
    });
  }

  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      success: false,
      message: 'A database error occurred. Please try again.',
    });
  }

  // Application-level errors that set their own status code
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
