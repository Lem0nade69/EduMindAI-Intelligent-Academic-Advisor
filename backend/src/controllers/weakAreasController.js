/**
 * EduMind AI - Weak Areas Controller
 * Task 4 & 5: Performance Diagnostics APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { WeakAreas } from '../config/db.js';

// GET /api/weak-areas
export const getWeakAreas = asyncHandler(async (req, res) => {
  const areas = await WeakAreas.findByUser(req.user.id);
  res.json({ status: 'success', data: { weakAreas: areas } });
});

// POST /api/weak-areas
export const upsertWeakArea = asyncHandler(async (req, res) => {
  const { subject, topic, scorePercentage, totalQuizzesTaken, recommendation } = req.body;

  const area = await WeakAreas.upsert(req.user.id, {
    subject,
    topic,
    score_percentage:    scorePercentage,
    total_quizzes_taken: totalQuizzesTaken || 1,
    recommendation:      recommendation || `Review ${topic} and attempt practice quizzes.`,
  });

  res.status(200).json({
    status: 'success',
    message: 'Weak area diagnostic recorded.',
    data: { weakArea: area },
  });
});

// POST /api/weak-areas/from-quiz
export const updateFromQuiz = asyncHandler(async (req, res) => {
  const { subject, topic, scorePercentage } = req.body;

  if (scorePercentage < 70) {
    const existing = await WeakAreas.findByUserSubjectTopic(req.user.id, subject, topic);
    const totalQuizzesTaken = existing ? (existing.total_quizzes_taken || 0) + 1 : 1;

    const area = await WeakAreas.upsert(req.user.id, {
      subject,
      topic,
      score_percentage:    scorePercentage,
      total_quizzes_taken: totalQuizzesTaken,
      recommendation:      `Focus on ${topic}: review definitions, solve flashcards, or ask the EduMind AI Advisor.`,
    });

    return res.json({
      status: 'success',
      message: 'Weak area detected and logged.',
      data: { weakArea: area, flagged: true },
    });
  } else {
    const existing = await WeakAreas.findByUserSubjectTopic(req.user.id, subject, topic);
    if (existing) {
      await WeakAreas.resolve(existing.id, req.user.id);
      return res.json({
        status: 'success',
        message: `Great job! ${topic} removed from weak areas. 🎉`,
        data: { flagged: false },
      });
    }
    return res.json({
      status: 'success',
      message: 'Performance is good. No weak area recorded.',
      data: { flagged: false },
    });
  }
});

// PATCH /api/weak-areas/:id/resolve
export const resolveWeakArea = asyncHandler(async (req, res) => {
  const area = await WeakAreas.resolve(req.params.id, req.user.id);
  if (!area) return res.status(404).json({ status: 'error', message: 'Weak area not found.' });
  res.json({ status: 'success', message: 'Marked as resolved. Keep it up!', data: { weakArea: area } });
});

// DELETE /api/weak-areas/:id
export const deleteWeakArea = asyncHandler(async (req, res) => {
  const deleted = await WeakAreas.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Weak area not found.' });
  res.json({ status: 'success', message: 'Weak area record deleted.' });
});
