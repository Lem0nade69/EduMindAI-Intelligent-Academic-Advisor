/**
 * EduMind AI - Admin Controller
 * Task 4 & 5: Admin Management APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { Users, ActivityLogs, Tasks, QuizSessions, FocusSessions } from '../config/db.js';

// GET /api/admin/dashboard
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalStudents, totalAdmins, recentLogs] = await Promise.all([
    Users.count(),
    Users.countByRole('student'),
    Users.countByRole('admin'),
    ActivityLogs.getAll({ page: 1, limit: 10 }),
  ]);

  res.json({
    status: 'success',
    data: {
      stats: { totalUsers, totalStudents, totalAdmins },
      recentActivity: recentLogs.data,
    },
  });
});

// GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await Users.getAll({ page: parseInt(page), limit: parseInt(limit) });
  result.data = result.data.map(({ password_hash, ...u }) => u);
  res.json({ status: 'success', data: result });
});

// GET /api/admin/activity-logs
export const getActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId } = req.query;
  const result = await ActivityLogs.getAll({ page: parseInt(page), limit: parseInt(limit), userId });
  res.json({ status: 'success', data: result });
});

// DELETE /api/admin/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  if (targetId === req.user.id) {
    return res.status(400).json({ status: 'error', message: 'You cannot delete your own account.' });
  }

  const user = await Users.findById(targetId);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });

  await Users.delete(targetId);

  await ActivityLogs.create({
    user_id:    req.user.id,
    user_name:  req.user.name,
    action:     'User Deleted',
    details:    `Admin deleted user: ${user.name} (${user.email})`,
    ip_address: req.ip,
  });

  res.json({ status: 'success', message: `User ${user.name} has been removed.` });
});

// PUT /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const user = await Users.update(req.params.id, { role });
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });

  await ActivityLogs.create({
    user_id:    req.user.id,
    user_name:  req.user.name,
    action:     'Role Updated',
    details:    `Changed ${user.name}'s role to ${role}`,
    ip_address: req.ip,
  });

  const { password_hash, ...safe } = user;
  res.json({ status: 'success', message: `User role updated to ${role}.`, data: { user: safe } });
});
