# AI Integration

This directory contains documentation and prompt-engineering artifacts for EduMind AI.

## Implemented AI capabilities

1. **AI Advisor Chatbot** — multi-turn educational conversation with recent history.
2. **AI Quiz Generator** — generates MCQs from supplied study material.
3. **AI Flashcard Generator** — creates question/answer flashcards from study material.
4. **AI Study Planner** — creates a personalised 7-day study schedule.
5. **AI Resource Finder** — uses the AI chat endpoint for educational resource recommendations.

The actual Gemini API integration remains in `backend/src/services/geminiService.js` so application imports and runtime behaviour are not broken.

## Provider and model

- Provider: Google Gemini
- Backend SDK: `@google/generative-ai`
- Model configured in the current backend source: `gemini-3.5-flash`
- API key: backend environment variable `GEMINI_API_KEY` only

Never place API keys in this directory or in source control.
