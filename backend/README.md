# EduMind AI — Backend Server

**Course:** CSE 4104 — Software Development III  
**Section:** 7B | **Team:** CSE4104-7B-T07  
**Backend Lead:** Sk. Pathim Hossain | **Team Leader:** Fahim

---

## Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** PostgreSQL via Supabase (`pg` driver)
- **Auth:** JWT (access + refresh tokens) + bcryptjs
- **File Upload:** Multer + pdf-parse
- **Security:** Helmet, CORS, express-rate-limit
- **Validation:** express-validator

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in .env values (at minimum JWT_SECRET)

# 3. Set up database (optional)
# Run src/config/schema.sql in your Supabase SQL editor
# Then add DATABASE_URL to .env

# 4. Start dev server
npm run dev

# 5. Production
npm start
```

---

## API Base URL

```
http://localhost:5000/api
```

Visit `/api` for the full endpoint listing.

---

## Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Tokens are issued on `/api/auth/login` and `/api/auth/register`.  
Use `/api/auth/refresh` to rotate expired access tokens.

---

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id/toggle` | Toggle complete |
| GET | `/api/weak-areas` | Get weak areas |
| POST | `/api/weak-areas/from-quiz` | Auto-update from quiz result |
| POST | `/api/quiz/sessions` | Save quiz session |
| POST | `/api/flashcards` | Save flashcard deck |
| POST | `/api/study-plans` | Save study plan |
| POST | `/api/chat/sessions` | Create chat session |
| POST | `/api/chat/sessions/:id/messages` | Append messages |
| POST | `/api/focus/sessions` | Log Pomodoro session |
| POST | `/api/upload` | Upload PDF/text for extraction |
| GET | `/api/admin/dashboard` | Admin stats (admin role only) |

---

## Database Modes

- **With DATABASE_URL:** Full PostgreSQL persistence via Supabase
- **Without DATABASE_URL:** In-memory mock store (data resets on restart) — perfect for development

---

## Project Structure

```
src/
├── server.js              # Entry point
├── config/
│   ├── database.js        # PostgreSQL pool
│   ├── mockStore.js       # In-memory store (dev/demo)
│   └── schema.sql         # DB schema (run once in Supabase)
├── middleware/
│   ├── auth.js            # JWT authenticate, requireAdmin
│   ├── validate.js        # express-validator result check
│   └── errorHandler.js    # Global error handler + asyncHandler
├── controllers/
│   ├── authController.js
│   ├── tasksController.js
│   ├── weakAreasController.js
│   ├── quizController.js
│   ├── flashcardsController.js
│   ├── studyPlansController.js
│   ├── chatController.js
│   ├── focusController.js
│   ├── uploadController.js
│   └── adminController.js
└── routes/
    ├── auth.js
    ├── tasks.js
    ├── weakAreas.js
    ├── quiz.js
    └── index.js           # flashcards, studyPlans, chat, focus, upload, admin
```
