/**
 * ============================================================
 *  EduMind AI — AI Controller  v2.0
 *  CSE4104-7B-T07 | AI Integration Assignment
 *
 *  POST /api/ai/chat              Main conversational AI
 *  POST /api/ai/chat/start        Create session + first reply
 *  GET  /api/ai/health            AI service status
 *  POST /api/ai/generate/quiz     Generate quiz from text
 *  POST /api/ai/generate/flashcards  Generate flashcards from text
 *  POST /api/ai/generate/study-plan  Generate personalised study plan
 * ============================================================
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import {
  askGemini,
  generateQuizFromText,
  generateFlashcardsFromText,
  generateStudyPlan,
  checkGeminiHealth,
} from '../services/geminiService.js';
import { ChatSessions, Users, ActivityLogs, WeakAreas } from '../config/db.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_TIMEOUT    = 30_000; // 30 s
const GENERATE_TIMEOUT  = 60_000; // 60 s for quiz/flashcard/plan generation

// ── Helpers ───────────────────────────────────────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), ms)
    ),
  ]);
}

/**
 * Map raw errors → user-friendly messages.
 * NEVER expose API keys, stack traces, or internal details to the client.
 */
function friendlyError(err) {
  const msg = err?.message || '';

  if (msg === 'AI_TIMEOUT')
    return { status: 503, message: 'EduMind AI took too long to respond. Please try again.', code: 'AI_TIMEOUT' };

  if (msg.includes('GEMINI_API_KEY') || msg.includes('not configured'))
    return { status: 503, message: 'EduMind AI is not yet configured. Please contact your administrator.', code: 'AI_NOT_CONFIGURED' };

  if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.includes('RATE_LIMIT_EXCEEDED'))
    return { status: 429, message: 'EduMind AI is busy right now. Please wait a moment and try again.', code: 'AI_RATE_LIMITED' };

  if (msg.includes('blocked') || msg.toLowerCase().includes('safety'))
    return { status: 422, message: 'Your message could not be processed. Please rephrase your question.', code: 'AI_CONTENT_BLOCKED' };

  if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('fetch failed'))
    return { status: 503, message: 'EduMind AI is temporarily unreachable. Please check your connection and try again.', code: 'AI_UNREACHABLE' };

  if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED'))
    return { status: 503, message: 'EduMind AI has reached its usage limit. Please try again later.', code: 'AI_QUOTA_EXCEEDED' };

  if (msg.includes('invalid quiz format') || msg.includes('invalid flashcard format') || msg.includes('invalid study plan'))
    return { status: 500, message: msg, code: 'AI_PARSE_ERROR' };

  return { status: 500, message: 'EduMind AI is temporarily unavailable. Please try again.', code: 'AI_ERROR' };
}

/** Load full user context from DB for prompt personalisation */
async function loadUserContext(userId, fallbackName) {
  try {
    const user = await Users.findById(userId);
    if (user) return { name: user.name, university: user.university, department: user.department, semester: user.semester };
  } catch (e) {
    console.warn('⚠️  Could not load user context:', e.message);
  }
  return { name: fallbackName };
}

/** Non-blocking activity log helper */
async function logActivity(userId, userName, action, details, ip) {
  try {
    await ActivityLogs.create({ user_id: userId, user_name: userName, action, details, ip_address: ip });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/chat
//  Main AI conversation endpoint.
//  Steps: validate → user context → session → history → Gemini → persist → respond
// ─────────────────────────────────────────────────────────────────────────────
export const aiChat = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ status: 'error', message: 'A message is required.', code: 'MISSING_MESSAGE' });
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return res.status(400).json({ status: 'error', message: 'Message cannot be empty.', code: 'EMPTY_MESSAGE' });
  }
  if (trimmed.length > 4000) {
    return res.status(400).json({ status: 'error', message: 'Message is too long. Please keep it under 4000 characters.', code: 'MESSAGE_TOO_LONG' });
  }

  // ── 2. User context for personalised prompt ────────────────────────────────
  const userContext = await loadUserContext(req.user.id, req.user.name);

  // ── 3. Load or create chat session ────────────────────────────────────────
  let session = null;
  let history = [];

  if (sessionId) {
    try {
      session = await ChatSessions.findById(sessionId, req.user.id);
      if (session) {
        history = Array.isArray(session.messages) ? session.messages : [];
      }
    } catch (e) {
      console.warn('⚠️  Could not load session:', e.message);
    }
  }

  if (!session) {
    try {
      session = await ChatSessions.create({ user_id: req.user.id, language: 'en', title: 'New Conversation' });
    } catch (e) {
      console.warn('⚠️  Could not create session:', e.message);
    }
  }

  // ── 4. Persist user message (before AI call for history accuracy) ──────────
  if (session) {
    try {
      const updated = await ChatSessions.appendMessage(session.id, req.user.id, { role: 'user', text: trimmed });
      history = Array.isArray(updated?.messages) ? updated.messages : history;
    } catch (e) {
      console.warn('⚠️  Could not save user message:', e.message);
    }
  }

  // ── 5. Call Gemini (with timeout) ──────────────────────────────────────────
  let aiReply;
  try {
    console.log(`🤖 Gemini | user=${req.user.id} session=${session?.id} len=${trimmed.length}`);
    aiReply = await withTimeout(
      askGemini(trimmed, history, userContext),
      GEMINI_TIMEOUT
    );
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    await logActivity(req.user.id, req.user.name, 'AI Chat Error', err.message.slice(0, 200), req.ip);
    const { status, message: msg, code } = friendlyError(err);
    return res.status(status).json({ status: 'error', message: msg, code });
  }

  // ── 6. Persist AI reply ────────────────────────────────────────────────────
  if (session) {
    try {
      await ChatSessions.appendMessage(session.id, req.user.id, { role: 'assistant', text: aiReply });
    } catch (e) {
      console.warn('⚠️  Could not save AI reply:', e.message);
    }
  }

  // ── 7. Activity log ────────────────────────────────────────────────────────
  await logActivity(
    req.user.id, req.user.name,
    'AI Chat',
    `Session: ${session?.id || 'unsaved'} | Q: "${trimmed.slice(0, 80)}"`,
    req.ip
  );

  // ── 8. Respond ─────────────────────────────────────────────────────────────
  res.json({
    status:    'success',
    reply:     aiReply,
    sessionId: session?.id || null,
    data: {
      message:   aiReply,
      sessionId: session?.id || null,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/chat/start
//  Create a fresh session, then send the first message through aiChat.
// ─────────────────────────────────────────────────────────────────────────────
export const aiChatStart = asyncHandler(async (req, res) => {
  if (!req.body.message?.trim()) {
    return res.status(400).json({ status: 'error', message: 'A message is required.' });
  }

  try {
    const session    = await ChatSessions.create({ user_id: req.user.id, language: 'en', title: 'New Conversation' });
    req.body.sessionId = session.id;
  } catch (e) {
    // Proceed anyway — aiChat handles missing session gracefully
  }

  return aiChat(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/ai/health
// ─────────────────────────────────────────────────────────────────────────────
export const aiHealth = asyncHandler(async (req, res) => {
  const configured = !!process.env.GEMINI_API_KEY;
  let   reachable  = false;
  if (configured) reachable = await checkGeminiHealth();

  res.json({
    status: 'success',
    data: {
      aiService:   'Google Gemini',
      model:       'gemini-3.5-flash',
      configured,
      reachable,
      status: configured && reachable ? 'operational' : configured ? 'unreachable' : 'not_configured',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/generate/quiz
//  Generate MCQ questions from uploaded text / extracted PDF content.
// ─────────────────────────────────────────────────────────────────────────────
export const generateQuiz = asyncHandler(async (req, res) => {
  const { text, subject, topic, count = 5, difficulty = 'intermediate' } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Study material text is required.', code: 'MISSING_TEXT' });
  }
  if (text.length > 20000) {
    return res.status(400).json({ status: 'error', message: 'Text is too long. Maximum 20,000 characters.', code: 'TEXT_TOO_LONG' });
  }
  const questionCount = Math.min(20, Math.max(1, parseInt(count) || 5));

  let questions;
  try {
    console.log(`🤖 Quiz generation | user=${req.user.id} | count=${questionCount} | subject=${subject}`);
    questions = await withTimeout(
      generateQuizFromText(text, { count: questionCount, subject, topic, difficulty }),
      GENERATE_TIMEOUT
    );
  } catch (err) {
    console.error('❌ Quiz generation error:', err.message);
    const { status, message: msg, code } = friendlyError(err);
    return res.status(status).json({ status: 'error', message: msg, code });
  }

  await logActivity(req.user.id, req.user.name, 'AI Quiz Generated',
    `${questions.length} questions | Subject: ${subject || 'General'}`, req.ip);

  res.json({
    status:  'success',
    message: `${questions.length} quiz question(s) generated successfully.`,
    data: {
      questions,
      count:      questions.length,
      subject:    subject    || 'General',
      topic:      topic      || 'Study Material',
      difficulty: difficulty || 'intermediate',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/generate/flashcards
//  Generate flashcard Q&A pairs from study material.
// ─────────────────────────────────────────────────────────────────────────────
export const generateFlashcards = asyncHandler(async (req, res) => {
  const { text, subject, topic, count = 10 } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Study material text is required.', code: 'MISSING_TEXT' });
  }
  if (text.length > 20000) {
    return res.status(400).json({ status: 'error', message: 'Text is too long. Maximum 20,000 characters.', code: 'TEXT_TOO_LONG' });
  }
  const cardCount = Math.min(30, Math.max(3, parseInt(count) || 10));

  let cards;
  try {
    console.log(`🤖 Flashcard generation | user=${req.user.id} | count=${cardCount} | subject=${subject}`);
    cards = await withTimeout(
      generateFlashcardsFromText(text, { count: cardCount, subject, topic }),
      GENERATE_TIMEOUT
    );
  } catch (err) {
    console.error('❌ Flashcard generation error:', err.message);
    const { status, message: msg, code } = friendlyError(err);
    return res.status(status).json({ status: 'error', message: msg, code });
  }

  await logActivity(req.user.id, req.user.name, 'AI Flashcards Generated',
    `${cards.length} cards | Subject: ${subject || 'General'}`, req.ip);

  res.json({
    status:  'success',
    message: `${cards.length} flashcard(s) generated successfully.`,
    data: {
      cards,
      count:   cards.length,
      subject: subject || 'General',
      topic:   topic   || 'Study Material',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/generate/study-plan
//  Generate a personalised 7-day study schedule.
// ─────────────────────────────────────────────────────────────────────────────
export const generateStudyPlanAI = asyncHandler(async (req, res) => {
  const { subjects, examDates, dailyHours = 3 } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ status: 'error', message: 'At least one subject is required.', code: 'MISSING_SUBJECTS' });
  }

  const userContext = await loadUserContext(req.user.id, req.user.name);

  // Pull active weak areas to give AI context on what needs extra focus
  let weakAreaList = [];
  try {
    const weakAreas = await WeakAreas.findByUser(req.user.id);
    weakAreaList = weakAreas.filter(w => !w.resolved).map(w => `${w.subject} — ${w.topic}`);
  } catch (_) {}

  let plan;
  try {
    console.log(`🤖 Study plan | user=${req.user.id} | subjects=${subjects.join(', ')}`);
    plan = await withTimeout(
      generateStudyPlan({ subjects, examDates: examDates || {}, dailyHours, weakAreas: weakAreaList, userContext }),
      GENERATE_TIMEOUT
    );
  } catch (err) {
    console.error('❌ Study plan error:', err.message);
    const { status, message: msg, code } = friendlyError(err);
    return res.status(status).json({ status: 'error', message: msg, code });
  }

  await logActivity(req.user.id, req.user.name, 'AI Study Plan Generated',
    `Subjects: ${subjects.join(', ')}`, req.ip);

  res.json({
    status:  'success',
    message: 'Personalised study plan generated.',
    data:    plan,
  });
});
