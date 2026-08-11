# EduMind AI — Intelligent Academic Advisor

**Course:** CSE 4104 — Software Development III  
**Section:** 7B | **Team:** CSE4104-7B-T07  
**Team Leader / AI Lead:** Fahim  
**Backend:** Sk. Pathim Hossain

EduMind AI is an intelligent academic advisor designed to help undergraduate students learn more effectively through personalised AI assistance, study planning, quizzes, flashcards, task tracking, and academic progress features.

## AI Features

### 1. AI Advisor Chatbot
- Conversational educational assistant powered by Google Gemini.
- Multi-turn context using recent conversation history.
- Student profile context such as department and semester.
- Beginner-friendly, adaptive explanations.
- Backend-only API key handling.

### 2. AI Quiz Generator
- Generates MCQs from supplied study material.
- Supports subject, topic, count, and difficulty.
- Requests structured JSON and validates the returned format before use.

### 3. AI Flashcard Generator
- Generates question/answer flashcards from study material.
- Uses structured JSON output.
- Validates the generated array before returning it to the frontend.

### 4. Personalised AI Study Planner
- Generates a 7-day study plan.
- Considers subjects, exam dates, available daily study time, and weak areas.
- Produces structured plan data for the frontend.

### 5. AI Resource Finder
- Uses the AI conversation endpoint to help students find relevant educational resources.

## AI Architecture

```text
Student
   |
   v
React Frontend
   |
   | JWT-authenticated REST request
   v
Express Backend
   |
   +--> Validation + Authentication + Rate Limiting
   |
   v
AI Controller
   |
   +--> Student Profile
   +--> Conversation History
   |
   v
Gemini Service
   |
   +--> Prompt Engineering
   +--> Safety Settings
   +--> Generation Configuration
   +--> Response Parsing / Validation
   |
   v
Google Gemini
   |
   v
Validated AI Response
   |
   v
Frontend
```

The Gemini API key is stored only in the backend environment and is never exposed to the browser.

## Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Lucide React
- Motion

### Backend
- Node.js
- Express.js
- JWT authentication
- PostgreSQL / Supabase
- Multer
- PDF parsing
- Express Validator
- Helmet
- CORS
- Rate limiting

### AI
- Google Gemini API
- `@google/generative-ai`
- Current model configured in the backend: `gemini-3.5-flash`

## Repository Structure

```text
frontend/       React/Vite application
backend/        Express API and Gemini integration
database/       PostgreSQL schema
ai/             AI documentation and prompt-engineering artifacts
documentation/  AI workflow, setup, and GitHub contribution guides
screenshots/    Project screenshots
README.md       Project overview and AI documentation
```

## Local Setup

### Backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and configure your local values:

```env
PORT=5000
JWT_SECRET=your_local_secret
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_gemini_api_key
```

Then:

```bash
npm run dev
```

Backend API:

```text
http://localhost:5000/api
```

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

See `documentation/FRONTEND_SETUP.md` for the complete setup.

## Database

Run `database/schema.sql` in the PostgreSQL/Supabase SQL environment when persistent database mode is required.

If `DATABASE_URL` is not configured, the backend can use its development mock store.

## Security

Never commit `.env` files or API keys. The repository includes `.gitignore` rules for environment files and dependencies.

## Documentation

- `ai/README.md` — AI feature overview
- `ai/prompts/system-prompt-v3.md` — selected prompt-engineering version
- `documentation/AI_WORKFLOW.md` — complete AI workflow and validation/error handling
- `documentation/FRONTEND_SETUP.md` — frontend/backend setup and AI feature mapping
- `documentation/GITHUB_CONTRIBUTION_GUIDE.md` — commit and contribution standards

## Team Contributions

The GitHub commit history should be used to demonstrate individual team contributions. Team members should commit using their own GitHub accounts and use meaningful commit messages.

Do not fabricate contribution history. Add the complete team member list and role assignments here once confirmed by the team.
