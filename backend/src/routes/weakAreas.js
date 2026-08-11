import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  getWeakAreas, upsertWeakArea, updateFromQuiz, resolveWeakArea, deleteWeakArea
} from '../controllers/weakAreasController.js';

const router = Router();
router.use(authenticate);

router.get('/', getWeakAreas);
router.post('/',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required.'),
    body('topic').trim().notEmpty().withMessage('Topic is required.'),
    body('scorePercentage').isFloat({ min: 0, max: 100 }).withMessage('Score must be 0-100.'),
  ],
  validate, upsertWeakArea
);
router.post('/from-quiz',
  [
    body('subject').notEmpty(),
    body('topic').notEmpty(),
    body('scorePercentage').isFloat({ min: 0, max: 100 }),
  ],
  validate, updateFromQuiz
);
router.patch('/:id/resolve', resolveWeakArea);
router.delete('/:id', deleteWeakArea);

export default router;
