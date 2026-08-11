/**
 * EduMind AI - User Profile Routes
 * Task 4: User APIs
 * GET  /api/users/profile
 * PUT  /api/users/profile
 * GET  /api/users/dashboard
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Users, Tasks, QuizSessions, FocusSessions, WeakAreas } from '../config/db.js';

const router = Router();
router.use(authenticate);

// GET /api/users/profile — alias for /api/auth/me with richer data
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await Users.findById(req.user.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });
  const { password_hash, ...safe } = user;
  res.json({ status: 'success', data: { user: safe } });
}));

// PUT /api/users/profile
router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('university').optional().trim().isLength({ max: 150 }),
    body('department').optional().trim().isLength({ max: 100 }),
    body('semester').optional().isInt({ min: 1, max: 12 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, university, department, studentId, semester, avatarUrl } = req.body;
    const updates = {};
    if (name       !== undefined) updates.name       = name.trim();
    if (university !== undefined) updates.university = university;
    if (department !== undefined) updates.department = department;
    if (studentId  !== undefined) updates.student_id = studentId;
    if (semester   !== undefined) updates.semester   = semester;
    if (avatarUrl  !== undefined) updates.avatar_url = avatarUrl;

    const updated = await Users.update(req.user.id, updates);
    if (!updated) return res.status(404).json({ status: 'error', message: 'User not found.' });

    const { password_hash, ...safe } = updated;
    res.json({ status: 'success', message: 'Profile updated successfully.', data: { user: safe } });
  })
);

// GET /api/users/dashboard — personalised summary for the logged-in student
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [taskTotal, taskDone, quizStats, focusMins, weakAreas] = await Promise.all([
    Tasks.countByUser(userId),
    Tasks.countCompleted(userId),
    QuizSessions.getStats(userId),
    FocusSessions.getTotalFocusMinutes(userId),
    WeakAreas.findByUser(userId),
  ]);

  res.json({
    status: 'success',
    data: {
      tasks: {
        total:          taskTotal,
        completed:      taskDone,
        pending:        taskTotal - taskDone,
        completionRate: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0,
      },
      quiz: {
        totalSessions:  Number(quizStats?.total_sessions  || 0),
        avgScore:       Number(parseFloat(quizStats?.avg_score  || 0).toFixed(1)),
        bestScore:      Number(parseFloat(quizStats?.best_score || 0).toFixed(1)),
        totalQuestions: Number(quizStats?.total_questions || 0),
        totalCorrect:   Number(quizStats?.total_correct   || 0),
      },
      focus: {
        totalMinutes: focusMins,
        totalHours:   Math.round((focusMins / 60) * 10) / 10,
      },
      weakAreas: {
        total:    weakAreas.length,
        unresolved: weakAreas.filter(a => !a.resolved).length,
        list:     weakAreas.slice(0, 5),
      },
    },
  });
}));

export default router;
