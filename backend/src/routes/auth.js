/**
 * EduMind AI - Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 * PUT  /api/auth/profile
 * PUT  /api/auth/change-password
 */

import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  register, login, refreshToken, logout, getMe, updateProfile, changePassword
} from '../controllers/authController.js';

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { status: 'error', message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Register ──────────────────────────────────────────────
router.post('/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ min: 2, max: 100 }),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  register
);

// ── Login ─────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// ── Refresh Token ─────────────────────────────────────────
router.post('/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required.')],
  validate,
  refreshToken
);

// ── Logout ────────────────────────────────────────────────
router.post('/logout', authenticate, logout);

// ── Get Current User ──────────────────────────────────────
router.get('/me', authenticate, getMe);

// ── Update Profile ────────────────────────────────────────
router.put('/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('semester').optional().isInt({ min: 1, max: 12 }),
  ],
  validate,
  updateProfile
);

// ── Change Password ───────────────────────────────────────
router.put('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  ],
  validate,
  changePassword
);

export default router;
