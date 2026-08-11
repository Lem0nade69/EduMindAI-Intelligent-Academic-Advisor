/**
 * EduMind AI - Focus Sessions Controller (Pomodoro)
 * Task 4 & 5: Focus Tracking APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { FocusSessions } from '../config/db.js';

// GET /api/focus/sessions
export const getFocusSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const result = await FocusSessions.findByUser(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
  res.json({ status: 'success', data: result });
});

// GET /api/focus/stats
export const getFocusStats = asyncHandler(async (req, res) => {
  const totalMins = await FocusSessions.getTotalFocusMinutes(req.user.id);
  res.json({
    status: 'success',
    data: {
      totalFocusMinutes: totalMins,
      totalFocusHours:   Math.round((totalMins / 60) * 10) / 10,
    },
  });
});

// POST /api/focus/sessions
export const logFocusSession = asyncHandler(async (req, res) => {
  const { taskId, durationMins, sessionType, completed } = req.body;
  const session = await FocusSessions.create({
    user_id:      req.user.id,
    task_id:      taskId      || null,
    duration_mins: durationMins || 25,
    session_type: sessionType  || 'focus',
    completed:    completed !== undefined ? completed : true,
  });
  res.status(201).json({ status: 'success', message: 'Focus session logged.', data: { session } });
});
