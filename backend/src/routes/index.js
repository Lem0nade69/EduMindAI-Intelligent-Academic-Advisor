// ── Flashcards ────────────────────────────────────────────
import { Router as FlashRouter } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { getDecks, getDeck, createDeck, updateDeck, deleteDeck } from '../controllers/flashcardsController.js';

export const flashcardsRouter = FlashRouter();
flashcardsRouter.use(authenticate);
flashcardsRouter.get('/', getDecks);
flashcardsRouter.get('/:id', getDeck);
flashcardsRouter.post('/',
  [body('title').trim().notEmpty().withMessage('Deck title is required.').isLength({ max: 200 })],
  validate, createDeck
);
flashcardsRouter.put('/:id', updateDeck);
flashcardsRouter.delete('/:id', deleteDeck);

// ── Study Plans ───────────────────────────────────────────
import { Router as PlanRouter } from 'express';
import { getStudyPlans, getActivePlan, getStudyPlan, saveStudyPlan, updateStudyPlan, deleteStudyPlan } from '../controllers/studyPlansController.js';

export const studyPlansRouter = PlanRouter();
studyPlansRouter.use(authenticate);
studyPlansRouter.get('/active', getActivePlan);
studyPlansRouter.get('/', getStudyPlans);
studyPlansRouter.get('/:id', getStudyPlan);
studyPlansRouter.post('/', saveStudyPlan);
studyPlansRouter.put('/:id', updateStudyPlan);
studyPlansRouter.delete('/:id', deleteStudyPlan);

// ── Chat Sessions ─────────────────────────────────────────
import { Router as ChatRouter } from 'express';
import { getChatSessions, getChatSession, createChatSession, appendMessages, deleteChatSession } from '../controllers/chatController.js';

export const chatRouter = ChatRouter();
chatRouter.use(authenticate);
chatRouter.get('/sessions', getChatSessions);
chatRouter.get('/sessions/:id', getChatSession);
chatRouter.post('/sessions', createChatSession);
chatRouter.post('/sessions/:id/messages', appendMessages);
chatRouter.delete('/sessions/:id', deleteChatSession);

// ── Focus Sessions ────────────────────────────────────────
import { Router as FocusRouter } from 'express';
import { getFocusSessions, getFocusStats, logFocusSession } from '../controllers/focusController.js';

export const focusRouter = FocusRouter();
focusRouter.use(authenticate);
focusRouter.get('/stats', getFocusStats);
focusRouter.get('/sessions', getFocusSessions);
focusRouter.post('/sessions', logFocusSession);

// ── File Upload ───────────────────────────────────────────
import { Router as UploadRouter } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFile } from '../controllers/uploadController.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and text files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

export const uploadRouter = UploadRouter();
uploadRouter.use(authenticate);
uploadRouter.post('/', upload.single('file'), uploadFile);

// ── Admin ─────────────────────────────────────────────────
import { Router as AdminRouter } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getAdminDashboard, getAllUsers, getActivityLogs, deleteUser, updateUserRole } from '../controllers/adminController.js';

export const adminRouter = AdminRouter();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/dashboard', getAdminDashboard);
adminRouter.get('/users', getAllUsers);
adminRouter.get('/activity-logs', getActivityLogs);
adminRouter.delete('/users/:id', deleteUser);
adminRouter.put('/users/:id/role',
  [body('role').isIn(['student', 'admin']).withMessage('Role must be student or admin.')],
  validate,
  updateUserRole
);
