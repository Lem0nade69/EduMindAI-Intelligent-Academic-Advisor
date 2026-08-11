/**
 * EduMind AI - Tasks Controller
 * Task 4 & 5: Academic Tasks CRUD + Database Connectivity
 * GET/POST/PUT/PATCH/DELETE /api/tasks
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { Tasks } from '../config/db.js';

// GET /api/tasks
export const getTasks = asyncHandler(async (req, res) => {
  const { completed, type, page = 1, limit = 50 } = req.query;
  const filters = { page: parseInt(page), limit: parseInt(limit) };
  if (completed !== undefined) filters.completed = completed === 'true';
  if (type) filters.type = type;

  const result = await Tasks.findByUser(req.user.id, filters);
  res.json({ status: 'success', data: result });
});

// GET /api/tasks/stats
export const getTaskStats = asyncHandler(async (req, res) => {
  const [total, completed] = await Promise.all([
    Tasks.countByUser(req.user.id),
    Tasks.countCompleted(req.user.id),
  ]);

  res.json({
    status: 'success',
    data: {
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  });
});

// GET /api/tasks/:id
export const getTask = asyncHandler(async (req, res) => {
  const task = await Tasks.findById(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ status: 'error', message: 'Task not found.' });
  res.json({ status: 'success', data: { task } });
});

// POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, courseId, dueDate, type, priority } = req.body;

  const task = await Tasks.create({
    user_id:     req.user.id,
    title:       title.trim(),
    description: description || null,
    course_id:   courseId   || null,
    due_date:    dueDate    || null,
    type:        type       || 'task',
    priority:    priority   || 'medium',
  });

  res.status(201).json({ status: 'success', message: 'Task created successfully.', data: { task } });
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const { title, description, courseId, dueDate, type, priority, completed } = req.body;

  const updates = {};
  if (title       !== undefined) updates.title       = title.trim();
  if (description !== undefined) updates.description = description;
  if (courseId    !== undefined) updates.course_id   = courseId;
  if (dueDate     !== undefined) updates.due_date    = dueDate;
  if (type        !== undefined) updates.type        = type;
  if (priority    !== undefined) updates.priority    = priority;
  if (completed   !== undefined) {
    updates.completed    = completed;
    updates.completed_at = completed ? new Date().toISOString() : null;
  }

  const task = await Tasks.update(req.params.id, req.user.id, updates);
  if (!task) return res.status(404).json({ status: 'error', message: 'Task not found.' });
  res.json({ status: 'success', message: 'Task updated.', data: { task } });
});

// PATCH /api/tasks/:id/toggle
export const toggleTaskComplete = asyncHandler(async (req, res) => {
  const existing = await Tasks.findById(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ status: 'error', message: 'Task not found.' });

  const newCompleted = !existing.completed;
  const task = await Tasks.update(req.params.id, req.user.id, {
    completed:    newCompleted,
    completed_at: newCompleted ? new Date().toISOString() : null,
  });

  res.json({
    status: 'success',
    message: newCompleted ? 'Task marked as completed! 🎉' : 'Task reopened.',
    data: { task },
  });
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const deleted = await Tasks.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Task not found.' });
  res.json({ status: 'success', message: 'Task deleted.' });
});
