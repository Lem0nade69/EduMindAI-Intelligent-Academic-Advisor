# EduMind AI — AI Integration Documentation

**Course:** CSE 4104 — Software Development III  
**Section:** 7B | **Team:** CSE4104-7B-T07  
**Team Leader / AI Lead:** Fahim  
**Backend:** Sk. Pathim Hossain

---

## 1. AI Feature

### What Was Implemented

**EduMind AI Personalized Learning Assistant** — a conversational educational chatbot powered by Google Gemini, integrated into the existing EduMind AI backend.

Students can:
- Ask educational questions in natural language and receive clear, structured answers
- Continue multi-turn conversations with full context (follow-up questions work)
- Generate MCQ quizzes automatically from any study material or uploaded PDF text
- Generate flashcard decks from study material
- Generate a personalised 7-day study schedule based on their subjects, exam dates, and weak areas

### Why It Is Genuinely Useful

This is not a generic chatbot. It is a **personalised educational assistant** that:
- Knows the student's name, university, department, and semester from their profile
- Uses their weak areas (from quiz history) to inform the study plan generator
- Maintains conversation context so "give me an example" correctly refers to the previous topic
- Produces structured, beginner-friendly explanations appropriate for undergraduate level
- Saves all AI conversation history to the existing chat session storage
- Automatically integrates with the existing quiz and flashcard systems

---

## 2. AI Service

**Provider:** Google Gemini API  
**Model:** `gemini-3.5-flash`  
**SDK:** `@google/generative-ai` v0.24.1  
**Key location:** Backend `.env` only — `GEMINI_API_KEY=...`

The Gemini API key is **never** sent to the frontend. All API calls happen exclusively on the backend.

---

## 3. Architecture

```
Student
  │
  │  Types question in chat UI
  ▼
EduMind AI Frontend (React)
  │
  │  POST /api/ai/chat
  │  { "message": "...", "sessionId": "..." }
  │  Authorization: Bearer <JWT>
  ▼
Backend API (Express.js — Port 5000)
  │
  ├── authenticate middleware (JWT verification)
  ├── aiLimiter (30 req / 15 min per user)
  ├── express-validator (input validation)
  │
  ▼
aiController.js
  │
  ├── Load user profile (name, dept, semester) from DB/mockStore
  ├── Load chat session + message history
  ├── Persist user message to chat_sessions
  │
  ▼
geminiService.js
  │
  ├── buildSystemPrompt(userContext)   — Version 3 adaptive prompt
  ├── buildUserPrompt(message, ctx)    — appends student level
  ├── buildGeminiHistory(messages)     — last 10 messages as context
  │
  ▼
Google Gemini API (gemini-3.5-flash)
  │
  ▼
geminiService.js
  │
  └── Clean text response extracted
  │
  ▼
aiController.js
  │
  ├── Persist AI reply to chat_sessions
  ├── Log activity
  │
  ▼
Backend API
  │
  │  { "status": "success", "reply": "...", "sessionId": "..." }
  ▼
EduMind AI Frontend
  │
  ▼
Student reads AI response (Markdown rendered)
```

---

## 4. System Prompt (Final — Version 3)

```
You are EduMind AI, an intelligent educational assistant designed to help
undergraduate students learn effectively.

## Student Profile
Student name: {name}
University: {university}
Department: {department}
Current semester: Semester {semester}

## Your Role
Explain academic concepts clearly, accurately, and in a beginner-friendly
manner. Help students understand — do NOT simply give them answers to
assessments.

## Teaching Behaviour
- Start with a simple explanation, then build up to technical depth.
- Break complex topics into smaller, digestible steps.
- Provide concrete real-world or practical examples when they aid understanding.
- Use appropriate technical terminology but always define unfamiliar terms inline.
- For programming questions: give clear explanations with working, commented
  code examples.
- If a student appears confused, simplify the explanation further without being
  condescending.
- If a question is ambiguous, ask ONE focused clarifying question before
  answering.
- Never invent facts. If uncertain, state that clearly: "I'm not fully certain,
  but..."
- Keep responses focused and relevant — do not pad unnecessarily.
- Maintain a warm, encouraging, patient, and educational tone at all times.

## Response Structure
Use structured sections (Explanation / Example / Key Points / Practice
Suggestion) ONLY when they genuinely improve the answer. For simple, direct
questions — give direct answers. Do not force every response into a rigid format.

## Ethical Boundaries
- You are a learning assistant, not a homework or exam completion service.
- Do not write complete assignment solutions — guide the student to understand
  and solve it themselves.
- Do not fabricate citations, textbook references, or statistics.
- Stay focused on education.
- Prefer examples relevant to {department} when contextually appropriate.

## Conversation Continuity
You have access to recent conversation history. Use it to understand follow-up
questions.
```

The `{placeholders}` are replaced at runtime by `buildSystemPrompt(userContext)`.

---

## 5. User Prompt Structure

**Short messages (< 30 characters)** — sent as-is:
```
What is recursion?
```

**Longer messages** — student level appended:
```
Explain the difference between BFS and DFS in graph traversal.

(I am a CSE student, currently in Semester 5. Please give a clear,
undergraduate-level answer.)
```

This is handled by `buildUserPrompt(userMessage, userContext)` in `geminiService.js`.

---

## 6. Expected AI Output Examples

### Example 1 — Concept Explanation

**Student:** "What is recursion?"

**EduMind AI:**
```
Recursion is a programming technique where a function calls itself to solve a
problem by breaking it into smaller versions of the same problem.

**Example:**
Think of looking up a word in a dictionary. If the definition uses a word you
don't know, you look up that word too — and you keep doing this until you reach
a word you already understand. That stopping point is the **base case** in
recursion.

**In code (Python):**
```python
def factorial(n):
    # Base case — stops the recursion
    if n == 0:
        return 1
    # Recursive call — function calls itself
    return n * factorial(n - 1)

print(factorial(5))  # Output: 120
```

**Key Points:**
- Every recursive function needs a **base case** (the stopping condition)
- Without a base case, recursion runs forever → stack overflow
- Each call adds a new frame to the **call stack**

**Practice Suggestion:**  
Try writing a recursive function that calculates the sum of digits of a number.
```

---

### Example 2 — Follow-Up Question (Context Awareness)

**Student:** "What is recursion?"  
**AI:** *(explains recursion)*  
**Student:** "Can you give me a real-life example?"

**EduMind AI:**
```
Sure! Here are two real-life analogies for recursion:

1. **Russian Nesting Dolls (Matryoshka):** Each doll contains a smaller doll
   inside it. You open one, find another, open that one, find another — until
   you reach the smallest doll that cannot be opened. That smallest doll is
   the base case.

2. **Mirror Reflections:** Stand between two mirrors. You see yourself
   reflected, and in that reflection another reflection, and so on — seemingly
   forever. In code, this would be infinite recursion (no base case) — so we
   always need a stopping point!
```

The AI correctly understood "real-life example" refers to **recursion** from history.

---

### Example 3 — Programming Question with Code

**Student:** "Explain binary search to a beginner."

**EduMind AI:**
```
Binary search is an efficient algorithm for finding a target value in a
**sorted** list by repeatedly cutting the search space in half.

**The idea:**
Instead of checking every element one by one (linear search), binary search
always checks the middle element:
- If middle == target → found it!
- If middle > target → search the left half
- If middle < target → search the right half

**Example:**
Searching for 35 in [10, 20, 30, 35, 40, 50, 60]:
1. Middle = 35 → Found! ✓

Searching for 20 in [10, 20, 30, 35, 40, 50, 60]:
1. Middle = 35, 20 < 35 → search left half [10, 20, 30]
2. Middle = 20 → Found! ✓

**Code (Python):**
```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid          # Found at index mid
        elif arr[mid] < target:
            left = mid + 1      # Search right half
        else:
            right = mid - 1     # Search left half
    
    return -1  # Not found

# Example
numbers = [10, 20, 30, 35, 40, 50, 60]
print(binary_search(numbers, 35))  # Output: 3
```

**Key Points:**
- Only works on **sorted** arrays
- Time complexity: O(log n) — much faster than linear search O(n)
- 1 million items → at most ~20 comparisons

**Practice:** Try modifying the function to count how many comparisons it makes.
```

---

## 7. Prompt Engineering — Three Versions Compared

| Criterion | Version 1 (Basic) | Version 2 (Structured) | Version 3 (Adaptive) ✓ |
|---|---|---|---|
| **Accuracy** | 7/10 | 9/10 | 10/10 |
| **Relevance** | 5/10 — generic | 7/10 | 9/10 — dept-aware |
| **Clarity** | 5/10 | 8/10 | 10/10 |
| **Beginner-friendly** | 4/10 | 6/10 — forced structure hurts | 10/10 |
| **Consistency** | 6/10 | 7/10 — robotic | 9/10 |
| **Total** | 27/50 | 37/50 | **48/50** |

### Why Version 3 Was Selected

1. **Student context injection** — name, department, and semester are inserted into the system prompt. This makes answers use CSE-appropriate examples for CSE students.

2. **Adaptive structure** — Version 2's forced 4-section format was poor for simple questions. Version 3 says: *use sections only when they genuinely help*. This produces natural conversation for simple questions and structured answers for complex ones.

3. **Conversation continuity** — Version 3 explicitly instructs Gemini to use history for follow-up questions. Tested: "explain it using a real-life example" correctly refers to the topic 10 turns back.

4. **Ethical boundaries** — explicitly tells Gemini not to complete assignments; this prevents misuse by students submitting AI-generated homework.

5. **Conditional user prompt enrichment** — for messages under 30 characters, no extra context is appended (keeps it natural). For longer messages, the student level is added.

---

## 8. Error Handling

All errors return a clean JSON response. Raw errors, stack traces, and API keys are **never** sent to the frontend.

| Scenario | HTTP Status | User Message | Code |
|---|---|---|---|
| Missing message | 400 | "A message is required." | `MISSING_MESSAGE` |
| Empty message | 400 | "Message cannot be empty." | `EMPTY_MESSAGE` |
| Message too long | 400 | "Message is too long..." | `MESSAGE_TOO_LONG` |
| Invalid JWT | 401 | "Access token required." | — |
| Rate limited (AI) | 429 | "You have sent too many messages..." | `AI_RATE_LIMITED` |
| Content blocked by safety | 422 | "Please rephrase your question." | `AI_CONTENT_BLOCKED` |
| Gemini timeout (30s) | 503 | "EduMind AI took too long..." | `AI_TIMEOUT` |
| API key not set | 503 | "EduMind AI is not yet configured." | `AI_NOT_CONFIGURED` |
| Quota exceeded | 503 | "EduMind AI has reached its usage limit." | `AI_QUOTA_EXCEEDED` |
| Network error | 503 | "EduMind AI is temporarily unreachable." | `AI_UNREACHABLE` |
| JSON parse failure (generation) | 500 | "AI returned an invalid format. Please try again." | `AI_PARSE_ERROR` |
| Any other error | 500 | "EduMind AI is temporarily unavailable." | `AI_ERROR` |

Backend logs always include the **real** error message for debugging.

---

## 9. Security

| Concern | Mitigation |
|---|---|
| API key exposure | `GEMINI_API_KEY` is in `.env` only; never sent to frontend; not logged |
| `.env` committed to git | `.gitignore` includes `.env`; `.env.example` has placeholders only |
| Unauthenticated AI access | All `/api/ai/*` routes require a valid JWT via `authenticate` middleware |
| Frontend user identity | `req.user.id` comes from verified JWT token, never from request body |
| Prompt injection | User input is passed as the user turn, not interpolated into system prompt |
| Raw error exposure | `friendlyError()` maps all errors to safe messages before responding |
| Input length abuse | All inputs validated: message ≤ 4000 chars, text ≤ 20,000 chars |
| Rate abuse | Per-user rate limiting: 30 AI chat / 10 generation per 15 min |
| Internal stack traces | `errorHandler` suppresses stack traces in production (`NODE_ENV=production`) |

---

## 10. Frontend Integration

The frontend should connect to the AI chat endpoint as follows:

### Start a New Conversation
```javascript
const res = await fetch('/api/ai/chat/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ message: userQuestion }),
});
const { reply, sessionId } = await res.json();
```

### Continue a Conversation
```javascript
const res = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ message: userQuestion, sessionId }),
});
const { reply } = await res.json();
```

### Generate a Quiz from Study Material
```javascript
const res = await fetch('/api/ai/generate/quiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
  body: JSON.stringify({ text: extractedPdfText, subject: 'Data Structures', count: 5 }),
});
const { data: { questions } } = await res.json();
```

### AI Response Display
- AI replies are returned as plain **Markdown** text.
- The frontend should render them with a Markdown renderer (e.g., `react-markdown`).
- This correctly formats: headings, bullet lists, numbered lists, bold/italic, and code blocks with syntax highlighting.
- Never display the raw `reply` string inside a plain `<p>` tag — it will show raw Markdown symbols.

### Loading & Error States
- Show an "EduMind AI is thinking..." indicator while awaiting the response.
- Disable the send button while a request is in progress (prevent duplicate submissions).
- On error: display `response.data.message` (always user-friendly) with a Retry button.

---

## 11. Backend Integration

### Files Added / Modified

| File | Status | Description |
|---|---|---|
| `src/services/geminiService.js` | **Enhanced** | All Gemini calls, full prompt engineering, 4 functions |
| `src/controllers/aiController.js` | **Enhanced** | 6 endpoints with full error handling |
| `src/routes/ai.js` | **Enhanced** | All routes with validation + rate limiting |
| `src/server.js` | Pre-existing | `/api/ai` already registered |
| `.env.example` | **Updated** | `GEMINI_API_KEY` documented |
| `AI_INTEGRATION.md` | **Created** | This file |

### API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Send message, get AI reply (reuses session) |
| `POST` | `/api/ai/chat/start` | Create fresh session + first reply |
| `GET` | `/api/ai/health` | Check if Gemini is configured and reachable |
| `POST` | `/api/ai/generate/quiz` | Generate MCQ questions from text |
| `POST` | `/api/ai/generate/flashcards` | Generate flashcard Q&A pairs from text |
| `POST` | `/api/ai/generate/study-plan` | Generate personalised 7-day study schedule |

### Existing Routes Preserved
All pre-existing routes remain untouched:
`/api/auth` · `/api/users` · `/api/tasks` · `/api/weak-areas` · `/api/quiz` · `/api/flashcards` · `/api/study-plans` · `/api/chat` · `/api/focus` · `/api/upload` · `/api/admin`

---

## 12. Testing

### Test Checklist

| # | Test | Input | Expected Result | Status |
|---|---|---|---|---|
| 1 | Normal question | "What is recursion?" | Clear explanation with example and code | ✅ Pass |
| 2 | Follow-up question | "Explain it using a real-life example." | References recursion from history | ✅ Pass |
| 3 | CS concept | "What is the difference between BFS and DFS?" | Comparison with code examples | ✅ Pass |
| 4 | Beginner-level | "Explain binary search to a beginner." | Step-by-step with simple language | ✅ Pass |
| 5 | Empty message | `""` | 400 — "Message cannot be empty." | ✅ Pass |
| 6 | Missing message | `{}` | 400 — "A message is required." | ✅ Pass |
| 7 | Too long (>4000) | 4001-char string | 400 — "Message is too long." | ✅ Pass |
| 8 | No auth header | Request without JWT | 401 — "Access token required." | ✅ Pass |
| 9 | Invalid JWT | Tampered token | 401 — "Invalid access token." | ✅ Pass |
| 10 | API not configured | No `GEMINI_API_KEY` | 503 — user-friendly message | ✅ Pass |
| 11 | API key hidden | Check network tab | Key not visible in any request | ✅ Pass |
| 12 | Quiz generation | PDF text + subject | Array of MCQ questions | ✅ Pass |
| 13 | Flashcard generation | Study text | Array of Q&A pairs | ✅ Pass |
| 14 | Study plan | subjects array | 7-day schedule JSON | ✅ Pass |
| 15 | Refresh page | Navigate away and back | Existing features unaffected | ✅ Pass |
| 16 | Session continuity | 3+ message exchange | Correct context maintained | ✅ Pass |
| 17 | Rate limit | 31 requests in 15 min | 429 — friendly message | ✅ Pass |

---

## 13. How to Run & Test the AI Feature

### Setup

```bash
# 1. Install dependencies (if not already done)
cd edumind-final
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_actual_key_from_aistudio.google.com
#   JWT_SECRET=any_long_random_string

# 3. Start the server
npm run dev
# → http://localhost:5000
```

### Get an API Key
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key (free tier available)
3. Paste it into `.env` as `GEMINI_API_KEY=AIza...`

### Quick Manual Test (curl)

```bash
# 1. Register a student account
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Fahim","email":"fahim@test.com","password":"123456","department":"CSE","semester":8}' \
  | python3 -m json.tool

# 2. Login and capture token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fahim@test.com","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "Token: $TOKEN"

# 3. Check AI health
curl -s http://localhost:5000/api/ai/health \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 4. Send first AI message (starts a new session)
RESULT=$(curl -s -X POST http://localhost:5000/api/ai/chat/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"What is recursion?"}')
echo $RESULT | python3 -m json.tool

# 5. Extract sessionId and ask a follow-up
SESSION=$(echo $RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
curl -s -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"message\":\"Can you give me a real-life example?\",\"sessionId\":\"$SESSION\"}" \
  | python3 -m json.tool

# 6. Test empty message validation
curl -s -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":""}' | python3 -m json.tool

# 7. Generate a quiz
curl -s -X POST http://localhost:5000/api/ai/generate/quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"Recursion is a method where the solution depends on solutions to smaller instances of the same problem. A recursive function calls itself. The base case stops the recursion. Examples include factorial, Fibonacci, and tree traversal.","subject":"Data Structures","topic":"Recursion","count":3}' \
  | python3 -m json.tool
```

---

*Document prepared for CSE 4104 — Software Development III, Week AI Integration Assignment.*  
*Team CSE4104-7B-T07 | Northern University of Business and Technology*
