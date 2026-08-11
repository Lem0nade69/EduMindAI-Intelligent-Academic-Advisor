/**
 * EduMind AI - Quiz Sessions Controller
 * Task 4 & 5: Quiz APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { QuizSessions } from '../config/db.js';

// GET /api/quiz/sessions
export const getQuizSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await QuizSessions.findByUser(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
  res.json({ status: 'success', data: result });
});

// GET /api/quiz/sessions/:id
export const getQuizSession = asyncHandler(async (req, res) => {
  const session = await QuizSessions.findById(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ status: 'error', message: 'Quiz session not found.' });
  res.json({ status: 'success', data: { session } });
});

// POST /api/quiz/sessions
export const saveQuizSession = asyncHandler(async (req, res) => {
  const { title, subject, topic, totalQuestions, correctAnswers, scorePercentage, timeTakenSecs, answers, questions } = req.body;

  const session = await QuizSessions.create({
    user_id:          req.user.id,
    title:            title || `${subject || 'Quiz'} — ${topic || 'General'}`,
    subject:          subject          || null,
    topic:            topic            || null,
    total_questions:  totalQuestions   || 0,
    correct_answers:  correctAnswers   || 0,
    score_percentage: scorePercentage  || 0,
    time_taken_secs:  timeTakenSecs    || null,
    answers:          answers          || {},
    questions:        questions        || [],
  });

  res.status(201).json({ status: 'success', message: 'Quiz session saved.', data: { session } });
});

// GET /api/quiz/stats
export const getQuizStats = asyncHandler(async (req, res) => {
  const stats = await QuizSessions.getStats(req.user.id);
  res.json({ status: 'success', data: { stats } });
});
