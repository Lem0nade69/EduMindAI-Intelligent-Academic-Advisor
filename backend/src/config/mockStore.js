/**
 * EduMind AI - In-Memory Mock Store
 * Used when DATABASE_URL is not configured (development / demo mode)
 * All data resets on server restart — connect PostgreSQL for persistence
 */

import { v4 as uuidv4 } from 'uuid';

const store = {
  users: [],
  refreshTokens: [],
  tasks: [],
  weakAreas: [],
  quizSessions: [],
  flashcardDecks: [],
  studyPlans: [],
  chatSessions: [],
  activityLogs: [],
  focusSessions: [],
  uploadedFiles: [],
};

// ------------------------------------------------------------------
// Generic helpers
// ------------------------------------------------------------------
function now() { return new Date().toISOString(); }

function paginate(arr, page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const start = (p - 1) * l;
  return {
    data: arr.slice(start, start + l),
    total: arr.length,
    page: p,
    limit: l,
    totalPages: Math.ceil(arr.length / l),
  };
}

// ------------------------------------------------------------------
// USERS
// ------------------------------------------------------------------
export const usersStore = {
  findByEmail: (email) => store.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null,
  findById: (id) => store.users.find(u => u.id === id) || null,
  create: (data) => {
    const user = { id: uuidv4(), streak: 0, last_active: now(), created_at: now(), updated_at: now(), ...data };
    store.users.push(user);
    return user;
  },
  update: (id, data) => {
    const idx = store.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    store.users[idx] = { ...store.users[idx], ...data, updated_at: now() };
    return store.users[idx];
  },
  getAll: ({ page, limit } = {}) => paginate([...store.users], page, limit),
  count: () => store.users.length,
  countByRole: (role) => store.users.filter(u => u.role === role).length,
};

// ------------------------------------------------------------------
// REFRESH TOKENS
// ------------------------------------------------------------------
export const tokensStore = {
  create: (userId, token, expiresAt) => {
    const record = { id: uuidv4(), user_id: userId, token, expires_at: expiresAt, created_at: now() };
    store.refreshTokens.push(record);
    return record;
  },
  findByToken: (token) => store.refreshTokens.find(t => t.token === token) || null,
  deleteByToken: (token) => {
    store.refreshTokens = store.refreshTokens.filter(t => t.token !== token);
  },
  deleteByUserId: (userId) => {
    store.refreshTokens = store.refreshTokens.filter(t => t.user_id !== userId);
  },
};

// ------------------------------------------------------------------
// TASKS
// ------------------------------------------------------------------
export const tasksStore = {
  findByUser: (userId, filters = {}) => {
    let list = store.tasks.filter(t => t.user_id === userId);
    if (filters.completed !== undefined) list = list.filter(t => t.completed === filters.completed);
    if (filters.type) list = list.filter(t => t.type === filters.type);
    list.sort((a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'));
    return paginate(list, filters.page, filters.limit);
  },
  findById: (id, userId) => store.tasks.find(t => t.id === id && t.user_id === userId) || null,
  create: (data) => {
    const task = { id: uuidv4(), completed: false, priority: 'medium', created_at: now(), updated_at: now(), ...data };
    store.tasks.push(task);
    return task;
  },
  update: (id, userId, data) => {
    const idx = store.tasks.findIndex(t => t.id === id && t.user_id === userId);
    if (idx === -1) return null;
    store.tasks[idx] = { ...store.tasks[idx], ...data, updated_at: now() };
    return store.tasks[idx];
  },
  delete: (id, userId) => {
    const exists = store.tasks.some(t => t.id === id && t.user_id === userId);
    store.tasks = store.tasks.filter(t => !(t.id === id && t.user_id === userId));
    return exists;
  },
  countByUser: (userId) => store.tasks.filter(t => t.user_id === userId).length,
  countCompleted: (userId) => store.tasks.filter(t => t.user_id === userId && t.completed).length,
};

// ------------------------------------------------------------------
// WEAK AREAS
// ------------------------------------------------------------------
export const weakAreasStore = {
  findByUser: (userId) => store.weakAreas.filter(w => w.user_id === userId && !w.resolved)
    .sort((a, b) => a.score_percentage - b.score_percentage),
  findByUserSubjectTopic: (userId, subject, topic) =>
    store.weakAreas.find(w => w.user_id === userId && w.subject === subject && w.topic === topic) || null,
  upsert: (userId, data) => {
    const existing = store.weakAreas.find(w => w.user_id === userId && w.subject === data.subject && w.topic === data.topic);
    if (existing) {
      Object.assign(existing, { ...data, updated_at: now() });
      return existing;
    }
    const record = { id: uuidv4(), user_id: userId, resolved: false, created_at: now(), updated_at: now(), ...data };
    store.weakAreas.push(record);
    return record;
  },
  resolve: (id, userId) => {
    const item = store.weakAreas.find(w => w.id === id && w.user_id === userId);
    if (!item) return null;
    item.resolved = true;
    item.updated_at = now();
    return item;
  },
  delete: (id, userId) => {
    const exists = store.weakAreas.some(w => w.id === id && w.user_id === userId);
    store.weakAreas = store.weakAreas.filter(w => !(w.id === id && w.user_id === userId));
    return exists;
  },
};

// ------------------------------------------------------------------
// QUIZ SESSIONS
// ------------------------------------------------------------------
export const quizSessionsStore = {
  findByUser: (userId, { page, limit } = {}) => {
    const list = store.quizSessions.filter(q => q.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return paginate(list, page, limit);
  },
  findById: (id, userId) => store.quizSessions.find(q => q.id === id && q.user_id === userId) || null,
  create: (data) => {
    const session = { id: uuidv4(), created_at: now(), completed_at: now(), ...data };
    store.quizSessions.push(session);
    return session;
  },
  getStats: (userId) => {
    const sessions = store.quizSessions.filter(q => q.user_id === userId);
    if (!sessions.length) return { totalQuizzes: 0, averageScore: 0, bestScore: 0 };
    const scores = sessions.map(s => s.score_percentage);
    return {
      totalQuizzes: sessions.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
    };
  },
};

// ------------------------------------------------------------------
// FLASHCARD DECKS
// ------------------------------------------------------------------
export const flashcardsStore = {
  findByUser: (userId) => store.flashcardDecks.filter(d => d.user_id === userId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
  findById: (id, userId) => store.flashcardDecks.find(d => d.id === id && d.user_id === userId) || null,
  create: (data) => {
    const deck = { id: uuidv4(), cards: [], card_count: 0, created_at: now(), updated_at: now(), ...data };
    deck.card_count = deck.cards.length;
    store.flashcardDecks.push(deck);
    return deck;
  },
  update: (id, userId, data) => {
    const idx = store.flashcardDecks.findIndex(d => d.id === id && d.user_id === userId);
    if (idx === -1) return null;
    store.flashcardDecks[idx] = { ...store.flashcardDecks[idx], ...data, updated_at: now() };
    if (data.cards) store.flashcardDecks[idx].card_count = data.cards.length;
    return store.flashcardDecks[idx];
  },
  delete: (id, userId) => {
    const exists = store.flashcardDecks.some(d => d.id === id && d.user_id === userId);
    store.flashcardDecks = store.flashcardDecks.filter(d => !(d.id === id && d.user_id === userId));
    return exists;
  },
};

// ------------------------------------------------------------------
// STUDY PLANS
// ------------------------------------------------------------------
export const studyPlansStore = {
  findByUser: (userId) => store.studyPlans.filter(p => p.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  findById: (id, userId) => store.studyPlans.find(p => p.id === id && p.user_id === userId) || null,
  create: (data) => {
    const plan = { id: uuidv4(), active: true, created_at: now(), updated_at: now(), ...data };
    store.studyPlans.push(plan);
    return plan;
  },
  update: (id, userId, data) => {
    const idx = store.studyPlans.findIndex(p => p.id === id && p.user_id === userId);
    if (idx === -1) return null;
    store.studyPlans[idx] = { ...store.studyPlans[idx], ...data, updated_at: now() };
    return store.studyPlans[idx];
  },
  delete: (id, userId) => {
    const exists = store.studyPlans.some(p => p.id === id && p.user_id === userId);
    store.studyPlans = store.studyPlans.filter(p => !(p.id === id && p.user_id === userId));
    return exists;
  },
};

// ------------------------------------------------------------------
// CHAT SESSIONS
// ------------------------------------------------------------------
export const chatSessionsStore = {
  findByUser: (userId, { page, limit } = {}) => {
    const list = store.chatSessions.filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return paginate(list, page, limit);
  },
  findById: (id, userId) => store.chatSessions.find(c => c.id === id && c.user_id === userId) || null,
  create: (data) => {
    const session = { id: uuidv4(), messages: [], created_at: now(), updated_at: now(), ...data };
    store.chatSessions.push(session);
    return session;
  },
  appendMessage: (id, userId, message) => {
    const session = store.chatSessions.find(c => c.id === id && c.user_id === userId);
    if (!session) return null;
    session.messages.push({ ...message, timestamp: now() });
    session.updated_at = now();
    if (!session.title && session.messages.length === 2) {
      session.title = session.messages[0].text.slice(0, 60);
    }
    return session;
  },
  delete: (id, userId) => {
    const exists = store.chatSessions.some(c => c.id === id && c.user_id === userId);
    store.chatSessions = store.chatSessions.filter(c => !(c.id === id && c.user_id === userId));
    return exists;
  },
};

// ------------------------------------------------------------------
// ACTIVITY LOGS
// ------------------------------------------------------------------
export const activityLogsStore = {
  create: (data) => {
    const log = { id: uuidv4(), created_at: now(), ...data };
    store.activityLogs.unshift(log);
    if (store.activityLogs.length > 500) store.activityLogs = store.activityLogs.slice(0, 500);
    return log;
  },
  getAll: ({ page, limit, userId } = {}) => {
    let list = [...store.activityLogs];
    if (userId) list = list.filter(l => l.user_id === userId);
    return paginate(list, page, limit);
  },
};

// ------------------------------------------------------------------
// FOCUS SESSIONS
// ------------------------------------------------------------------
export const focusSessionsStore = {
  create: (data) => {
    const session = { id: uuidv4(), created_at: now(), ...data };
    store.focusSessions.push(session);
    return session;
  },
  findByUser: (userId, { page, limit } = {}) => {
    const list = store.focusSessions.filter(f => f.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return paginate(list, page, limit);
  },
  getTotalFocusMinutes: (userId) => {
    return store.focusSessions
      .filter(f => f.user_id === userId && f.completed && f.session_type === 'focus')
      .reduce((sum, f) => sum + f.duration_mins, 0);
  },
};

// ------------------------------------------------------------------
// UPLOADED FILES
// ------------------------------------------------------------------
export const uploadedFilesStore = {
  create: (data) => {
    const file = { id: uuidv4(), created_at: now(), ...data };
    store.uploadedFiles.push(file);
    return file;
  },
  findByUser: (userId) => store.uploadedFiles.filter(f => f.user_id === userId),
};

export default store;

