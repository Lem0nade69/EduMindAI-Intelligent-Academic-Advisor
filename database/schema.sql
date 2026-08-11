-- ============================================================
-- EduMind AI - PostgreSQL Database Schema
-- Run this in your Supabase SQL editor or psql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar_url    TEXT,
  university    VARCHAR(150),
  department    VARCHAR(100),
  student_id    VARCHAR(50),
  semester      INTEGER,
  streak        INTEGER DEFAULT 0,
  last_active   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE (Academic Tasks / Syllabus Items)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  course_id     VARCHAR(50),
  due_date      DATE,
  completed     BOOLEAN DEFAULT FALSE,
  type          VARCHAR(50) DEFAULT 'task' CHECK (type IN ('task', 'assignment', 'exam', 'revision', 'project')),
  priority      VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- WEAK AREAS TABLE (Performance Diagnostics)
-- ============================================================
CREATE TABLE IF NOT EXISTS weak_areas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject             VARCHAR(100) NOT NULL,
  topic               VARCHAR(200) NOT NULL,
  score_percentage    DECIMAL(5,2) DEFAULT 0,
  total_quizzes_taken INTEGER DEFAULT 0,
  recommendation      TEXT,
  resolved            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject, topic)
);

-- ============================================================
-- QUIZ SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200),
  subject         VARCHAR(100),
  topic           VARCHAR(200),
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) DEFAULT 0,
  time_taken_secs INTEGER,
  answers         JSONB,           -- {questionIndex: selectedIndex}
  questions       JSONB,           -- full quiz questions snapshot
  completed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FLASHCARD DECKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  subject     VARCHAR(100),
  card_count  INTEGER DEFAULT 0,
  cards       JSONB NOT NULL DEFAULT '[]',   -- [{question, answer, subject}]
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STUDY PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS study_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(200) NOT NULL,
  total_weekly_hours  INTEGER,
  risk_assessment     TEXT,
  subjects            JSONB,     -- input subjects array
  exam_dates          JSONB,     -- input exam dates
  daily_hours         INTEGER DEFAULT 3,
  plan_items          JSONB,     -- generated schedule items
  active              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CHAT SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200),
  language    VARCHAR(10) DEFAULT 'en',
  messages    JSONB NOT NULL DEFAULT '[]',  -- [{role, text, timestamp}]
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- UPLOADED FILES TABLE (for quiz/flashcard generation)
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      VARCHAR(300) NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  mime_type     VARCHAR(100),
  file_size     INTEGER,
  extracted_text TEXT,
  purpose       VARCHAR(50) DEFAULT 'study_material',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS TABLE (Admin audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(100),
  action      VARCHAR(100) NOT NULL,
  details     TEXT,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- POMODORO / FOCUS SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  duration_mins   INTEGER NOT NULL,
  session_type    VARCHAR(20) DEFAULT 'focus' CHECK (session_type IN ('focus', 'short_break', 'long_break')),
  completed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES (Performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_weak_areas_user_id ON weak_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weak_areas_updated_at BEFORE UPDATE ON weak_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcard_decks_updated_at BEFORE UPDATE ON flashcard_decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
