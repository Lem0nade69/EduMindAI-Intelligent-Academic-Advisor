/**
 * ============================================================
 *  EduMind AI — Database Service Layer
 *  CSE4104-7B-T07 | Team Leader: Fahim
 * ============================================================
 *  Dual-mode: routes queries to PostgreSQL (Supabase) when
 *  DATABASE_URL is set, otherwise falls back to in-memory
 *  mock store.  Controllers import ONLY from here — they
 *  never touch pool or mockStore directly.
 * ============================================================
 */

import { query, transaction } from './database.js';
import {
  usersStore,
  tokensStore,
  tasksStore,
  weakAreasStore,
  quizSessionsStore,
  flashcardsStore,
  studyPlansStore,
  chatSessionsStore,
  focusSessionsStore,
  activityLogsStore,
  uploadedFilesStore,
} from './mockStore.js';

// Is Postgres available?
function useDB() {
  return !!process.env.DATABASE_URL;
}

// ──────────────────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────────────────
export const Users = {
  async findByEmail(email) {
    if (!useDB()) return usersStore.findByEmail(email);
    const { rows } = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    if (!useDB()) return usersStore.findById(id);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return usersStore.create(data);
    const {
      name, email, password_hash, role,
      university, department, student_id, semester, avatar_url
    } = data;
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, university, department, student_id, semester, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, email, password_hash, role || 'student',
       university || null, department || null, student_id || null,
       semester || null, avatar_url || null]
    );
    return rows[0];
  },

  async update(id, data) {
    if (!useDB()) return usersStore.update(id, data);
    const fields = Object.keys(data);
    if (fields.length === 0) return this.findById(id);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => data[f]);
    const { rows } = await query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  },

  async getAll({ page = 1, limit = 20 } = {}) {
    if (!useDB()) return usersStore.getAll({ page, limit });
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      query('SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      query('SELECT COUNT(*) FROM users'),
    ]);
    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async count() {
    if (!useDB()) return usersStore.count();
    const { rows } = await query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count);
  },

  async countByRole(role) {
    if (!useDB()) return usersStore.countByRole(role);
    const { rows } = await query('SELECT COUNT(*) FROM users WHERE role = $1', [role]);
    return parseInt(rows[0].count);
  },

  async delete(id) {
    if (!useDB()) return usersStore.update(id, { deleted: true });
    const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  },
};

// ──────────────────────────────────────────────────────────
// REFRESH TOKENS
// ──────────────────────────────────────────────────────────
export const Tokens = {
  async create(userId, token, expiresAt) {
    if (!useDB()) return tokensStore.create(userId, token, expiresAt);
    const { rows } = await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3) RETURNING *',
      [userId, token, expiresAt]
    );
    return rows[0];
  },

  async findByToken(token) {
    if (!useDB()) return tokensStore.findByToken(token);
    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return rows[0] || null;
  },

  async deleteByToken(token) {
    if (!useDB()) return tokensStore.deleteByToken(token);
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  },

  async deleteByUserId(userId) {
    if (!useDB()) return tokensStore.deleteByUserId(userId);
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },
};

// ──────────────────────────────────────────────────────────
// TASKS
// ──────────────────────────────────────────────────────────
export const Tasks = {
  async findByUser(userId, { completed, type, page = 1, limit = 50 } = {}) {
    if (!useDB()) return tasksStore.findByUser(userId, { completed, type, page, limit });

    const conditions = ['user_id = $1'];
    const values = [userId];
    let idx = 2;

    if (completed !== undefined) {
      conditions.push(`completed = $${idx++}`);
      values.push(completed);
    }
    if (type) {
      conditions.push(`type = $${idx++}`);
      values.push(type);
    }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        `SELECT * FROM tasks WHERE ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM tasks WHERE ${where}`, values),
    ]);

    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id, userId) {
    if (!useDB()) return tasksStore.findById(id, userId);
    const { rows } = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return tasksStore.create(data);
    const { user_id, title, description, course_id, due_date, type, priority } = data;
    const { rows } = await query(
      `INSERT INTO tasks (user_id, title, description, course_id, due_date, type, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, title, description || null, course_id || null,
       due_date || null, type || 'task', priority || 'medium']
    );
    return rows[0];
  },

  async update(id, userId, data) {
    if (!useDB()) return tasksStore.update(id, userId, data);
    const fields = Object.keys(data);
    if (fields.length === 0) return this.findById(id, userId);
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => data[f]);
    const { rows } = await query(
      `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    if (!useDB()) return tasksStore.delete(id, userId);
    const { rows } = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows.length > 0;
  },

  async countByUser(userId) {
    if (!useDB()) return tasksStore.countByUser(userId);
    const { rows } = await query('SELECT COUNT(*) FROM tasks WHERE user_id = $1', [userId]);
    return parseInt(rows[0].count);
  },

  async countCompleted(userId) {
    if (!useDB()) return tasksStore.countCompleted(userId);
    const { rows } = await query(
      'SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND completed = TRUE',
      [userId]
    );
    return parseInt(rows[0].count);
  },
};

// ──────────────────────────────────────────────────────────
// WEAK AREAS
// ──────────────────────────────────────────────────────────
export const WeakAreas = {
  async findByUser(userId) {
    if (!useDB()) return weakAreasStore.findByUser(userId);
    const { rows } = await query(
      'SELECT * FROM weak_areas WHERE user_id = $1 ORDER BY score_percentage ASC',
      [userId]
    );
    return rows;
  },

  async findByUserSubjectTopic(userId, subject, topic) {
    if (!useDB()) return weakAreasStore.findByUserSubjectTopic(userId, subject, topic);
    const { rows } = await query(
      'SELECT * FROM weak_areas WHERE user_id = $1 AND subject = $2 AND topic = $3',
      [userId, subject, topic]
    );
    return rows[0] || null;
  },

  async upsert(userId, data) {
    if (!useDB()) return weakAreasStore.upsert(userId, data);
    const { subject, topic, score_percentage, total_quizzes_taken, recommendation } = data;
    const { rows } = await query(
      `INSERT INTO weak_areas (user_id, subject, topic, score_percentage, total_quizzes_taken, recommendation)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, subject, topic) DO UPDATE SET
         score_percentage    = EXCLUDED.score_percentage,
         total_quizzes_taken = EXCLUDED.total_quizzes_taken,
         recommendation      = EXCLUDED.recommendation,
         resolved            = FALSE,
         updated_at          = NOW()
       RETURNING *`,
      [userId, subject, topic, score_percentage || 0, total_quizzes_taken || 1, recommendation || null]
    );
    return rows[0];
  },

  async resolve(id, userId) {
    if (!useDB()) return weakAreasStore.resolve(id, userId);
    const { rows } = await query(
      'UPDATE weak_areas SET resolved = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    if (!useDB()) return weakAreasStore.delete(id, userId);
    const { rows } = await query(
      'DELETE FROM weak_areas WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows.length > 0;
  },
};

// ──────────────────────────────────────────────────────────
// QUIZ SESSIONS
// ──────────────────────────────────────────────────────────
export const QuizSessions = {
  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    if (!useDB()) return quizSessionsStore.findByUser(userId, { page, limit });
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        'SELECT * FROM quiz_sessions WHERE user_id = $1 ORDER BY completed_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      query('SELECT COUNT(*) FROM quiz_sessions WHERE user_id = $1', [userId]),
    ]);
    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id, userId) {
    if (!useDB()) return quizSessionsStore.findById(id, userId);
    const { rows } = await query(
      'SELECT * FROM quiz_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return quizSessionsStore.create(data);
    const {
      user_id, title, subject, topic,
      total_questions, correct_answers, score_percentage,
      time_taken_secs, answers, questions
    } = data;
    const { rows } = await query(
      `INSERT INTO quiz_sessions
         (user_id, title, subject, topic, total_questions, correct_answers,
          score_percentage, time_taken_secs, answers, questions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [user_id, title, subject || null, topic || null,
       total_questions || 0, correct_answers || 0, score_percentage || 0,
       time_taken_secs || null,
       JSON.stringify(answers || {}), JSON.stringify(questions || [])]
    );
    return rows[0];
  },

  async getStats(userId) {
    if (!useDB()) return quizSessionsStore.getStats(userId);
    const { rows } = await query(
      `SELECT
         COUNT(*)::int                          AS total_sessions,
         COALESCE(AVG(score_percentage), 0)     AS avg_score,
         COALESCE(MAX(score_percentage), 0)     AS best_score,
         COALESCE(SUM(total_questions), 0)::int AS total_questions,
         COALESCE(SUM(correct_answers), 0)::int AS total_correct
       FROM quiz_sessions WHERE user_id = $1`,
      [userId]
    );
    return rows[0];
  },
};

// ──────────────────────────────────────────────────────────
// FLASHCARD DECKS
// ──────────────────────────────────────────────────────────
export const Flashcards = {
  async findByUser(userId) {
    if (!useDB()) return flashcardsStore.findByUser(userId);
    const { rows } = await query(
      'SELECT * FROM flashcard_decks WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return rows;
  },

  async findById(id, userId) {
    if (!useDB()) return flashcardsStore.findById(id, userId);
    const { rows } = await query(
      'SELECT * FROM flashcard_decks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return flashcardsStore.create(data);
    const { user_id, title, subject, cards } = data;
    const cardArray = cards || [];
    const { rows } = await query(
      `INSERT INTO flashcard_decks (user_id, title, subject, cards, card_count)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, title, subject || null, JSON.stringify(cardArray), cardArray.length]
    );
    return rows[0];
  },

  async update(id, userId, data) {
    if (!useDB()) return flashcardsStore.update(id, userId, data);
    const { title, subject, cards } = data;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (cards !== undefined) {
      updates.cards = JSON.stringify(cards);
      updates.card_count = cards.length;
    }
    const fields = Object.keys(updates);
    if (fields.length === 0) return this.findById(id, userId);
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);
    const { rows } = await query(
      `UPDATE flashcard_decks SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    if (!useDB()) return flashcardsStore.delete(id, userId);
    const { rows } = await query(
      'DELETE FROM flashcard_decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows.length > 0;
  },
};

// ──────────────────────────────────────────────────────────
// STUDY PLANS
// ──────────────────────────────────────────────────────────
export const StudyPlans = {
  async findByUser(userId) {
    if (!useDB()) return studyPlansStore.findByUser(userId);
    const { rows } = await query(
      'SELECT * FROM study_plans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  async findById(id, userId) {
    if (!useDB()) return studyPlansStore.findById(id, userId);
    const { rows } = await query(
      'SELECT * FROM study_plans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return studyPlansStore.create(data);
    const {
      user_id, title, total_weekly_hours, risk_assessment,
      subjects, exam_dates, daily_hours, plan_items, active
    } = data;
    const { rows } = await query(
      `INSERT INTO study_plans
         (user_id, title, total_weekly_hours, risk_assessment, subjects,
          exam_dates, daily_hours, plan_items, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [user_id, title, total_weekly_hours || 0, risk_assessment || null,
       JSON.stringify(subjects || []), JSON.stringify(exam_dates || {}),
       daily_hours || 3, JSON.stringify(plan_items || []), active !== false]
    );
    return rows[0];
  },

  async deactivateAll(userId) {
    if (!useDB()) {
      const plans = studyPlansStore.findByUser(userId);
      for (const p of plans) studyPlansStore.update(p.id, userId, { active: false });
      return;
    }
    await query('UPDATE study_plans SET active = FALSE WHERE user_id = $1', [userId]);
  },

  async update(id, userId, data) {
    if (!useDB()) return studyPlansStore.update(id, userId, data);
    const { title, active, plan_items, risk_assessment } = data;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (active !== undefined) updates.active = active;
    if (plan_items !== undefined) updates.plan_items = JSON.stringify(plan_items);
    if (risk_assessment !== undefined) updates.risk_assessment = risk_assessment;
    const fields = Object.keys(updates);
    if (fields.length === 0) return this.findById(id, userId);
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);
    const { rows } = await query(
      `UPDATE study_plans SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    if (!useDB()) return studyPlansStore.delete(id, userId);
    const { rows } = await query(
      'DELETE FROM study_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows.length > 0;
  },
};

// ──────────────────────────────────────────────────────────
// CHAT SESSIONS
// ──────────────────────────────────────────────────────────
export const ChatSessions = {
  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    if (!useDB()) return chatSessionsStore.findByUser(userId, { page, limit });
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        `SELECT id, user_id, title, language,
                jsonb_array_length(messages) AS message_count,
                created_at, updated_at
         FROM chat_sessions WHERE user_id = $1
         ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      query('SELECT COUNT(*) FROM chat_sessions WHERE user_id = $1', [userId]),
    ]);
    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id, userId) {
    if (!useDB()) return chatSessionsStore.findById(id, userId);
    const { rows } = await query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] || null;
  },

  async create(data) {
    if (!useDB()) return chatSessionsStore.create(data);
    const { user_id, language, title } = data;
    const { rows } = await query(
      `INSERT INTO chat_sessions (user_id, title, language, messages)
       VALUES ($1,$2,$3,'[]') RETURNING *`,
      [user_id, title || 'New Conversation', language || 'en']
    );
    return rows[0];
  },

  async appendMessage(id, userId, message) {
    if (!useDB()) return chatSessionsStore.appendMessage(id, userId, message);
    const msg = { ...message, timestamp: new Date().toISOString() };
    const { rows } = await query(
      `UPDATE chat_sessions
       SET messages   = messages || $3::jsonb,
           title      = CASE WHEN title = 'New Conversation' AND $4 = 'user'
                             THEN LEFT($5, 60) ELSE title END,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, JSON.stringify(msg), message.role, message.text || '']
    );
    return rows[0] || null;
  },

  async delete(id, userId) {
    if (!useDB()) return chatSessionsStore.delete(id, userId);
    const { rows } = await query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows.length > 0;
  },
};

// ──────────────────────────────────────────────────────────
// FOCUS SESSIONS
// ──────────────────────────────────────────────────────────
export const FocusSessions = {
  async findByUser(userId, { page = 1, limit = 30 } = {}) {
    if (!useDB()) return focusSessionsStore.findByUser(userId, { page, limit });
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        'SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      query('SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1', [userId]),
    ]);
    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getTotalFocusMinutes(userId) {
    if (!useDB()) return focusSessionsStore.getTotalFocusMinutes(userId);
    const { rows } = await query(
      `SELECT COALESCE(SUM(duration_mins), 0)::int AS total
       FROM focus_sessions WHERE user_id = $1 AND completed = TRUE AND session_type = 'focus'`,
      [userId]
    );
    return rows[0].total;
  },

  async create(data) {
    if (!useDB()) return focusSessionsStore.create(data);
    const { user_id, task_id, duration_mins, session_type, completed } = data;
    const { rows } = await query(
      `INSERT INTO focus_sessions (user_id, task_id, duration_mins, session_type, completed)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, task_id || null, duration_mins || 25, session_type || 'focus', completed !== false]
    );
    return rows[0];
  },
};

// ──────────────────────────────────────────────────────────
// ACTIVITY LOGS
// ──────────────────────────────────────────────────────────
export const ActivityLogs = {
  async create(data) {
    if (!useDB()) return activityLogsStore.create(data);
    const { user_id, user_name, action, details, ip_address } = data;
    const { rows } = await query(
      `INSERT INTO activity_logs (user_id, user_name, action, details, ip_address)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id || null, user_name || null, action, details || null, ip_address || null]
    );
    return rows[0];
  },

  async getAll({ page = 1, limit = 50, userId } = {}) {
    if (!useDB()) return activityLogsStore.getAll({ page, limit, userId });
    const conditions = [];
    const values = [];
    let idx = 1;
    if (userId) { conditions.push(`user_id = $${idx++}`); values.push(userId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM activity_logs ${where}`, values),
    ]);
    const total = parseInt(countRows[0].count);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

// ──────────────────────────────────────────────────────────
// UPLOADED FILES
// ──────────────────────────────────────────────────────────
export const UploadedFiles = {
  async create(data) {
    if (!useDB()) return uploadedFilesStore ? uploadedFilesStore.create(data) : data;
    const { user_id, filename, original_name, mime_type, file_size, extracted_text, purpose } = data;
    const { rows } = await query(
      `INSERT INTO uploaded_files
         (user_id, filename, original_name, mime_type, file_size, extracted_text, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, filename, original_name, mime_type || null,
       file_size || null, extracted_text || null, purpose || 'study_material']
    );
    return rows[0];
  },
};
