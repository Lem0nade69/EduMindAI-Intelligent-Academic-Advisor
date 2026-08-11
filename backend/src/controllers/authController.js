/**
 * EduMind AI - Authentication Controller
 * Task 4 & 5: Core Auth APIs + Database Connectivity
 * POST /api/auth/register  POST /api/auth/login
 * POST /api/auth/refresh   POST /api/auth/logout
 * GET  /api/auth/me        PUT  /api/auth/profile
 * PUT  /api/auth/change-password
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Users, Tokens, ActivityLogs } from '../config/db.js';

const JWT_SECRET          = process.env.JWT_SECRET          || 'edumind_dev_secret';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '7d';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'edumind_refresh_dev_secret';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const ADMIN_CODE          = process.env.ADMIN_REGISTRATION_CODE || 'EDUMIND_ADMIN_2024';

// ── Helpers ───────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function generateRefreshToken(user) {
  const token     = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await Tokens.create(user.id, token, expiresAt);
  return token;
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

async function logActivity(userId, userName, action, details, ip) {
  try {
    await ActivityLogs.create({ user_id: userId, user_name: userName, action, details, ip_address: ip });
  } catch (_) { /* non-blocking */ }
}

// ── POST /api/auth/register ───────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, university, department, studentId, semester, adminCode } = req.body;

  const existing = await Users.findByEmail(email);
  if (existing) {
    return res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
  }

  const role          = (adminCode && adminCode === ADMIN_CODE) ? 'admin' : 'student';
  const password_hash = await bcrypt.hash(password, 12);

  const user = await Users.create({
    name:        name.trim(),
    email:       email.toLowerCase().trim(),
    password_hash,
    role,
    university:  university || 'Northern University of Business and Technology',
    department:  department || 'CSE',
    student_id:  studentId  || null,
    semester:    semester   || null,
    avatar_url:  null,
  });

  await logActivity(user.id, user.name, 'Account Registered', `New ${role} account`, req.ip);

  const accessToken  = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully. Welcome to EduMind AI!',
    data: { user: sanitizeUser(user), accessToken, refreshToken },
  });
});

// ── POST /api/auth/login ──────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await Users.findByEmail(email);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
  }

  await Users.update(user.id, { last_active: new Date().toISOString() });
  await logActivity(user.id, user.name, 'Signed In', `Login from ${req.ip}`, req.ip);

  const accessToken  = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.json({
    status: 'success',
    message: `Welcome back, ${user.name}!`,
    data: { user: sanitizeUser(user), accessToken, refreshToken },
  });
});

// ── POST /api/auth/refresh ────────────────────────────────
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    return res.status(400).json({ status: 'error', message: 'Refresh token is required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
  }

  const stored = await Tokens.findByToken(token);
  if (!stored) {
    return res.status(401).json({ status: 'error', message: 'Refresh token not found or revoked.' });
  }

  const user = await Users.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'User not found.' });
  }

  await Tokens.deleteByToken(token);
  const newAccessToken  = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user);

  res.json({
    status: 'success',
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  });
});

// ── POST /api/auth/logout ─────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (token) await Tokens.deleteByToken(token);
  if (req.user) {
    await logActivity(req.user.id, req.user.name, 'Signed Out', 'User logged out', req.ip);
  }
  res.json({ status: 'success', message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ──────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const user = await Users.findById(req.user.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });
  res.json({ status: 'success', data: { user: sanitizeUser(user) } });
});

// ── PUT /api/auth/profile ─────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, university, department, studentId, semester, avatarUrl } = req.body;

  const updates = {};
  if (name      !== undefined) updates.name       = name.trim();
  if (university!== undefined) updates.university = university;
  if (department!== undefined) updates.department = department;
  if (studentId !== undefined) updates.student_id = studentId;
  if (semester  !== undefined) updates.semester   = semester;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const updated = await Users.update(req.user.id, updates);
  if (!updated) return res.status(404).json({ status: 'error', message: 'User not found.' });

  await logActivity(req.user.id, updated.name, 'Profile Updated', 'User updated profile', req.ip);
  res.json({ status: 'success', message: 'Profile updated.', data: { user: sanitizeUser(updated) } });
});

// ── PUT /api/auth/change-password ─────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await Users.findById(req.user.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ status: 'error', message: 'Current password is incorrect.' });
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await Users.update(req.user.id, { password_hash });
  await Tokens.deleteByUserId(req.user.id); // invalidate all sessions

  await logActivity(req.user.id, user.name, 'Password Changed', 'User changed password', req.ip);
  res.json({ status: 'success', message: 'Password changed. Please login again with your new password.' });
});
