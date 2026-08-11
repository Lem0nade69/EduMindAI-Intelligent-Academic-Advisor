# EduMind AI — Frontend Setup Guide

**Team:** CSE4104-7B-T07 | **Course:** CSE 4104

---

## What Was Updated

All AI features now call the **real backend** (Express + Gemini API). The Gemini API key is never exposed in the frontend.

### Files Changed

| File | What Changed |
|---|---|
| `src/services/apiService.js` | **NEW** — central API service, all backend calls, auth token management, auto-refresh |
| `src/components/AuthScreen.jsx` | Real backend register/login, JWT token storage |
| `src/components/ChatView.jsx` | Real Gemini AI via `/api/ai/chat`, Markdown rendering, session persistence |
| `src/components/QuizGeneratorView.jsx` | Real AI quiz generation, PDF upload, backend save, weak area auto-update |
| `src/components/FlashcardsView.jsx` | Real AI flashcard generation, deck persistence, PDF upload |
| `src/components/StudyPlannerView.jsx` | Real 7-day AI plan generation, progress tracking, backend save |
| `src/components/ResourceRecommenderView.jsx` | AI-powered resource search via Gemini |
| `src/App.jsx` | Real auth logout, notification badge, session expiry handling |
| `vite.config.ts` | Added `/api` proxy to backend port 5000 |
| `.env.example` | `VITE_API_URL` documented |

---

## Quick Start

### 1. Start the Backend First

```bash
cd edumind-final           # backend folder
cp .env.example .env
# Set GEMINI_API_KEY and JWT_SECRET in .env
npm install
npm run dev                # → http://localhost:5000
```

### 2. Start the Frontend

```bash
cd edumind-frontend        # this folder
npm install
npm run dev                # → http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000`.

---

## AI Features Available in the UI

| Feature | Tab | AI Endpoint |
|---|---|---|
| **AI Advisor Chatbot** | AI Advisor | `POST /api/ai/chat` — Gemini conversation |
| **Quiz Generator** | Quiz Builder | `POST /api/ai/generate/quiz` — MCQ from notes |
| **Flashcard Generator** | Flashcards | `POST /api/ai/generate/flashcards` — Q&A pairs |
| **Study Planner** | Study Planner | `POST /api/ai/generate/study-plan` — 7-day schedule |
| **Resource Finder** | Resource Finder | `POST /api/ai/chat` — curated resource search |

All features:
- Require the user to be logged in (JWT)
- Never expose `GEMINI_API_KEY` to the browser
- Show proper loading states and user-friendly error messages
- Save results to the backend for persistence

---

## Environment Variables

```env
# .env.local (frontend)
VITE_API_URL=http://localhost:5000/api

# .env (backend)
GEMINI_API_KEY=your_key_from_aistudio.google.com
JWT_SECRET=any_32_char_random_string
PORT=5000
```

---

## Getting a Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key into `edumind-final/.env` as `GEMINI_API_KEY=AIza...`

The free tier is sufficient for development and testing.
