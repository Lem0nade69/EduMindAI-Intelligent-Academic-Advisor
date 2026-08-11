/**
 * EduMind AI - Tasks Routes
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  getTasks, getTask, createTask, updateTask, toggleTaskComplete, deleteTask, getTaskStats
} from '../controllers/tasksController.js';

const router = Router();
router.use(authenticate);

router.get('/stats', getTaskStats);
router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/',
  [body('title').trim().notEmpty().withMessage('Task title is required.').isLength({ max: 200 })],
  validate, createTask
);
router.put('/:id',
  [body('title').optional().trim().isLength({ max: 200 })],
  validate, updateTask
);
router.patch('/:id/toggle', toggleTaskComplete);
router.delete('/:id', deleteTask);

export default router;
