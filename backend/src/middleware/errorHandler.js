const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message || 'Internal Server Error';

  // PostgreSQL errors
  if (err.code === '23505') { statusCode = 409; message = 'Resource already exists'; }
  if (err.code === '23503') { statusCode = 400; message = 'Referenced resource not found'; }
  if (err.code === '22P02') { statusCode = 400; message = 'Invalid UUID format'; }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error({
      message: err.message,
      stack:   err.stack,
      url:     req.originalUrl,
      method:  req.method,
      user:    req.user?.id,
      body:    req.body,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
