/**
 * ============================================================
 *  EduMind AI — Backend Server
 *  Node.js + Express.js | CSE4104-7B-T07
 *  Team Leader: Fahim | Backend: Sk. Pathim Hossain
 * ============================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import weakAreaRoutes from './routes/weakAreas.js';
import quizRoutes from './routes/quiz.js';
import {
  flashcardsRouter,
  studyPlansRouter,
  chatRouter,
  focusRouter,
  uploadRouter,
  adminRouter,
} from './routes/index.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT) || 5000;

// ──────────────────────────────────────────────────────────
// Security & Performance Middleware
// ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// HTTP request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Global rate limiter (100 req / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { status: 'error', message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health', // don't limit health check
});
app.use(globalLimiter);

// ──────────────────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EduMind AI Backend',
    version: '1.0.0',
    team: 'CSE4104-7B-T07',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
  });
});

// ──────────────────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/weak-areas', weakAreaRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/flashcards', flashcardsRouter);
app.use('/api/study-plans', studyPlansRouter);
app.use('/api/chat', chatRouter);
app.use('/api/focus', focusRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai',    aiRoutes);

// ──────────────────────────────────────────────────────────
// API route listing (dev helper)
// ──────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    message: '🎓 EduMind AI Backend API — v1.0.0',
    team: 'CSE4104-7B-T07',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password',
      },
      users: {
        profile:   'GET /api/users/profile',
        update:    'PUT /api/users/profile',
        dashboard: 'GET /api/users/dashboard',
      },
      tasks: {
        list: 'GET /api/tasks',
        stats: 'GET /api/tasks/stats',
        get: 'GET /api/tasks/:id',
        create: 'POST /api/tasks',
        update: 'PUT /api/tasks/:id',
        toggle: 'PATCH /api/tasks/:id/toggle',
        delete: 'DELETE /api/tasks/:id',
      },
      weakAreas: {
        list: 'GET /api/weak-areas',
        upsert: 'POST /api/weak-areas',
        fromQuiz: 'POST /api/weak-areas/from-quiz',
        resolve: 'PATCH /api/weak-areas/:id/resolve',
        delete: 'DELETE /api/weak-areas/:id',
      },
      quiz: {
        sessions: 'GET /api/quiz/sessions',
        stats: 'GET /api/quiz/stats',
        save: 'POST /api/quiz/sessions',
        get: 'GET /api/quiz/sessions/:id',
      },
      flashcards: {
        list: 'GET /api/flashcards',
        get: 'GET /api/flashcards/:id',
        create: 'POST /api/flashcards',
        update: 'PUT /api/flashcards/:id',
        delete: 'DELETE /api/flashcards/:id',
      },
      studyPlans: {
        list: 'GET /api/study-plans',
        active: 'GET /api/study-plans/active',
        save: 'POST /api/study-plans',
        update: 'PUT /api/study-plans/:id',
        delete: 'DELETE /api/study-plans/:id',
      },
      chat: {
        sessions: 'GET /api/chat/sessions',
        create: 'POST /api/chat/sessions',
        get: 'GET /api/chat/sessions/:id',
        append: 'POST /api/chat/sessions/:id/messages',
        delete: 'DELETE /api/chat/sessions/:id',
      },
      focus: {
        sessions: 'GET /api/focus/sessions',
        stats: 'GET /api/focus/stats',
        log: 'POST /api/focus/sessions',
      },
      upload: 'POST /api/upload',
      ai: {
        chat:  'POST /api/ai/chat',
        start: 'POST /api/ai/chat/start',
        health:'GET  /api/ai/health',
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        users: 'GET /api/admin/users',
        logs: 'GET /api/admin/activity-logs',
        deleteUser: 'DELETE /api/admin/users/:id',
        updateRole: 'PUT /api/admin/users/:id/role',
      },
    },
  });
});

// ──────────────────────────────────────────────────────────
// Error Handling (always last)
// ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ──────────────────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────────────────
async function startServer() {
  console.log('\n🎓 EduMind AI Backend — Starting up...');
  console.log(`   Team: CSE4104-7B-T07 | Course: CSE 4104`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Attempt DB connection (non-blocking — falls back to mock store)
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ EduMind AI Backend running on port ${PORT}`);
    console.log(`   API:    http://localhost:${PORT}/api`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

startServer();

export default app;
