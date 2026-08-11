/**
 * EduMind AI — API Service
 * Central service for all backend communication.
 * All AI calls route through backend — GEMINI_API_KEY never touches the frontend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() { return localStorage.getItem('edumind_access_token'); }
export function setTokens(at, rt) {
  localStorage.setItem('edumind_access_token', at);
  if (rt) localStorage.setItem('edumind_refresh_token', rt);
}
export function clearTokens() {
  localStorage.removeItem('edumind_access_token');
  localStorage.removeItem('edumind_refresh_token');
}

async function tryRefresh() {
  const rt = localStorage.getItem('edumind_refresh_token');
  if (!rt) return false;
  try {
    const r = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const d = await r.json();
    if (d.status === 'success') { setTokens(d.data.accessToken, d.data.refreshToken); return true; }
  } catch (_) {}
  return false;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && path !== '/auth/refresh') {
    const ok = await tryRefresh();
    if (ok) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      window.dispatchEvent(new Event('edumind:logout'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (p) => request('/auth/register', { method: 'POST', body: JSON.stringify(p) }),
  login:    (p) => request('/auth/login',    { method: 'POST', body: JSON.stringify(p) }),
  logout:   ()  => { const rt=localStorage.getItem('edumind_refresh_token'); clearTokens(); return request('/auth/logout',{method:'POST',body:JSON.stringify({refreshToken:rt})}).catch(()=>{}); },
  me:            () => request('/auth/me'),
  updateProfile: (p) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(p) }),
  changePassword:(p) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(p) }),
  stats:         () => request('/auth/stats'),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list:   (q='')    => request(`/tasks${q}`),
  stats:  ()        => request('/tasks/stats'),
  overdue:()        => request('/tasks/overdue'),
  upcoming:(d=3)    => request(`/tasks/upcoming?days=${d}`),
  create: (p)       => request('/tasks', { method:'POST', body:JSON.stringify(p) }),
  update: (id,p)    => request(`/tasks/${id}`, { method:'PUT', body:JSON.stringify(p) }),
  toggle: (id)      => request(`/tasks/${id}/toggle`, { method:'PATCH' }),
  delete: (id)      => request(`/tasks/${id}`, { method:'DELETE' }),
  bulkCreate:(arr)  => request('/tasks/bulk', { method:'POST', body:JSON.stringify({tasks:arr}) }),
};

// ── Weak Areas ────────────────────────────────────────────────────────────────
export const weakAreasApi = {
  list:     ()   => request('/weak-areas'),
  stats:    ()   => request('/weak-areas/stats'),
  fromQuiz: (p)  => request('/weak-areas/from-quiz', { method:'POST', body:JSON.stringify(p) }),
  resolve:  (id) => request(`/weak-areas/${id}/resolve`, { method:'PATCH' }),
  delete:   (id) => request(`/weak-areas/${id}`, { method:'DELETE' }),
};

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizApi = {
  sessions:  (p=1) => request(`/quiz/sessions?page=${p}`),
  getSession:(id)  => request(`/quiz/sessions/${id}`),
  save:      (p)   => request('/quiz/sessions', { method:'POST', body:JSON.stringify(p) }),
  stats:     ()    => request('/quiz/stats'),
};

// ── Flashcards ────────────────────────────────────────────────────────────────
export const flashcardsApi = {
  list:    (q='')   => request(`/flashcards${q}`),
  get:     (id)     => request(`/flashcards/${id}`),
  create:  (p)      => request('/flashcards', { method:'POST', body:JSON.stringify(p) }),
  update:  (id,p)   => request(`/flashcards/${id}`, { method:'PUT', body:JSON.stringify(p) }),
  logReview:(id)    => request(`/flashcards/${id}/review`, { method:'POST' }),
  delete:  (id)     => request(`/flashcards/${id}`, { method:'DELETE' }),
};

// ── Study Plans ───────────────────────────────────────────────────────────────
export const studyPlansApi = {
  list:    ()    => request('/study-plans'),
  active:  ()    => request('/study-plans/active'),
  save:    (p)   => request('/study-plans', { method:'POST', body:JSON.stringify(p) }),
  delete:  (id)  => request(`/study-plans/${id}`, { method:'DELETE' }),
  updateProgress:(id,dayKey,done=true) =>
    request(`/study-plans/${id}/progress`, { method:'PATCH', body:JSON.stringify({dayKey,completed:done}) }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  sessions:      (p=1) => request(`/chat/sessions?page=${p}`),
  getSession:    (id)  => request(`/chat/sessions/${id}`),
  create:        (p)   => request('/chat/sessions', { method:'POST', body:JSON.stringify(p) }),
  appendMessages:(id,p)=> request(`/chat/sessions/${id}/messages`, { method:'POST', body:JSON.stringify(p) }),
  delete:        (id)  => request(`/chat/sessions/${id}`, { method:'DELETE' }),
};

// ── Focus ─────────────────────────────────────────────────────────────────────
export const focusApi = {
  stats:   ()   => request('/focus/stats'),
  log:     (p)  => request('/focus/sessions', { method:'POST', body:JSON.stringify(p) }),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  file: (file) => {
    const form = new FormData(); form.append('file', file);
    const token = getToken();
    return fetch(`${BASE_URL}/upload`, {
      method:'POST',
      headers: token ? { Authorization:`Bearer ${token}` } : {},
      body: form,
    }).then(r => r.json());
  },
};

// ── AI APIs (ALL go through backend — key never exposed) ──────────────────────
export const aiApi = {
  health: () => request('/ai/health'),

  /** Conversational AI — reuses existing session or auto-creates one */
  chat: (message, sessionId=null) =>
    request('/ai/chat', { method:'POST', body:JSON.stringify({ message, sessionId }) }),

  /** Start a fresh session + get first reply */
  chatStart: (message) =>
    request('/ai/chat/start', { method:'POST', body:JSON.stringify({ message }) }),

  /** Generate MCQ quiz from study material text */
  generateQuiz: (text, opts={}) =>
    request('/ai/generate/quiz', { method:'POST', body:JSON.stringify({ text, ...opts }) }),

  /** Generate flashcard Q&A pairs from study material text */
  generateFlashcards: (text, opts={}) =>
    request('/ai/generate/flashcards', { method:'POST', body:JSON.stringify({ text, ...opts }) }),

  /** Generate personalised 7-day study plan */
  generateStudyPlan: (payload) =>
    request('/ai/generate/study-plan', { method:'POST', body:JSON.stringify(payload) }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:       (q='') => request(`/notifications${q}`),
  count:      ()     => request('/notifications/count'),
  markRead:   (id)   => request(`/notifications/${id}/read`, { method:'PATCH' }),
  markAllRead:()     => request('/notifications/read-all', { method:'PATCH' }),
  deleteAll:  ()     => request('/notifications', { method:'DELETE' }),
};
