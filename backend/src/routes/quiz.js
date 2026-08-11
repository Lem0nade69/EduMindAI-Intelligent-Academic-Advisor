import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { getQuizSessions, getQuizSession, saveQuizSession, getQuizStats } from '../controllers/quizController.js';

const router = Router();
router.use(authenticate);

router.get('/stats', getQuizStats);
router.get('/sessions', getQuizSessions);
router.get('/sessions/:id', getQuizSession);
router.post('/sessions',
  [
    body('totalQuestions').optional().isInt({ min: 1 }),
    body('correctAnswers').optional().isInt({ min: 0 }),
    body('scorePercentage').optional().isFloat({ min: 0, max: 100 }),
  ],
  validate, saveQuizSession
);

export default router;
