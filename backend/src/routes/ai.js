/**
 * ============================================================
 *  EduMind AI — AI Routes  v2.0
 *  CSE4104-7B-T07 | AI Integration Assignment
 *
 *  POST /api/ai/chat                    Conversational AI
 *  POST /api/ai/chat/start              New session + first reply
 *  GET  /api/ai/health                  Service status
 *  POST /api/ai/generate/quiz           MCQ quiz from text
 *  POST /api/ai/generate/flashcards     Flashcards from text
 *  POST /api/ai/generate/study-plan     7-day study schedule
 * ============================================================
 */

import { Router }      from 'express';
import { body }        from 'express-validator';
import rateLimit       from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { validate }     from '../middleware/validate.js';
import {
  aiChat,
  aiChatStart,
  aiHealth,
  generateQuiz,
  generateFlashcards,
  generateStudyPlanAI,
} from '../controllers/aiController.js';

const router = Router();

// ── Per-user AI rate limiter (30 req / 15 min) ────────────────────────────────
// Prevents Gemini quota abuse; keyed by user ID so VPN/NAT can't affect others
const aiLimiter = rateLimit({
  windowMs:     15 * 60 * 1000,
  max:          1000,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    status:  'error',
    message: 'You have sent too many messages to EduMind AI. Please wait a few minutes before trying again.',
    code:    'AI_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => req.path === '/health',
});

// Stricter limit for generation endpoints (more expensive API calls)
const generateLimiter = rateLimit({
  windowMs:     15 * 60 * 1000,
  max:          1000,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    status:  'error',
    message: 'You have made too many generation requests. Please wait before generating again.',
    code:    'GENERATE_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// All AI routes require a valid JWT
router.use(authenticate);

// ── GET /api/ai/health ────────────────────────────────────────────────────────
router.get('/health', aiHealth);

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post(
  '/chat',
  aiLimiter,
  [
    body('message')
      .notEmpty().withMessage('Message is required.')
      .isString().withMessage('Message must be a string.')
      .trim()
      .isLength({ min: 1, max: 4000 }).withMessage('Message must be 1–4000 characters.'),
    body('sessionId')
      .optional()
      .isString().withMessage('sessionId must be a string.'),
  ],
  validate,
  aiChat
);

// ── POST /api/ai/chat/start ───────────────────────────────────────────────────
router.post(
  '/chat/start',
  aiLimiter,
  [
    body('message')
      .notEmpty().withMessage('Message is required.')
      .isString()
      .trim()
      .isLength({ min: 1, max: 4000 }).withMessage('Message must be 1–4000 characters.'),
  ],
  validate,
  aiChatStart
);

// ── POST /api/ai/generate/quiz ────────────────────────────────────────────────
router.post(
  '/generate/quiz',
  generateLimiter,
  [
    body('text')
      .notEmpty().withMessage('Study material text is required.')
      .isString()
      .isLength({ min: 50, max: 20000 }).withMessage('Text must be 50–20,000 characters.'),
    body('subject').optional().isString().trim().isLength({ max: 100 }),
    body('topic').optional().isString().trim().isLength({ max: 200 }),
    body('count')
      .optional()
      .isInt({ min: 1, max: 20 }).withMessage('count must be 1–20.'),
    body('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced']).withMessage('difficulty must be beginner, intermediate, or advanced.'),
  ],
  validate,
  generateQuiz
);

// ── POST /api/ai/generate/flashcards ─────────────────────────────────────────
router.post(
  '/generate/flashcards',
  generateLimiter,
  [
    body('text')
      .notEmpty().withMessage('Study material text is required.')
      .isString()
      .isLength({ min: 50, max: 20000 }).withMessage('Text must be 50–20,000 characters.'),
    body('subject').optional().isString().trim().isLength({ max: 100 }),
    body('topic').optional().isString().trim().isLength({ max: 200 }),
    body('count')
      .optional()
      .isInt({ min: 3, max: 30 }).withMessage('count must be 3–30.'),
  ],
  validate,
  generateFlashcards
);

// ── POST /api/ai/generate/study-plan ─────────────────────────────────────────
router.post(
  '/generate/study-plan',
  generateLimiter,
  [
    body('subjects')
      .isArray({ min: 1, max: 10 }).withMessage('Provide 1–10 subjects.'),
    body('subjects.*')
      .isString().trim().isLength({ min: 1, max: 100 }),
    body('examDates')
      .optional().isObject(),
    body('dailyHours')
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage('dailyHours must be 1–12.'),
  ],
  validate,
  generateStudyPlanAI
);

export default router;
