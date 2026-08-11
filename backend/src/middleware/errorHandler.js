/**
 * EduMind AI - Global Error Handler Middleware
 */

/**
 * 404 Not Found handler — place after all routes
 */
export function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — place last in middleware chain
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Unhandled error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      status: 'error',
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
    });
  }

  // express-validator errors (passed as error)
  if (err.type === 'validation') {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed.',
      errors: err.errors,
    });
  }

  // JWT errors (edge case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token.',
    });
  }

  // DB unique constraint violation (PostgreSQL)
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'error',
      message: 'A record with this value already exists.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Async route wrapper — eliminates try/catch boilerplate
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
