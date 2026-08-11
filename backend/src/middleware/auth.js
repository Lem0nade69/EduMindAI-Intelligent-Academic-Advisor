/**
 * EduMind AI - Authentication Middleware
 * JWT verification for protected routes
 */

import jwt from 'jsonwebtoken';

/**
 * Verify JWT access token and attach user to request
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required. Please login to continue.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'edumind_dev_secret');
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid access token.',
    });
  }
}

/**
 * Restrict route to admin role only
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
}

/**
 * Optional auth — attach user if token present, but don't block
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'edumind_dev_secret');
    } catch (_) {
      req.user = null;
    }
  }
  next();
}
