/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  generateChatFallback,
  generateQuizFallback,
  generatePlanFallback,
  generateResourcesFallback,
  generateWeakAreasFallback,
  generateFlashcardsFallback
} from './server-fallbacks.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app.use(express.json());

// Lazy-initialization of Gemini SDK to prevent startup crashes when GEMINI_API_KEY is missing
let aiInstance = null;
function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    throw new Error('GEMINI_API_KEY is missing or invalid. Please configure it in your Settings > Secrets panel.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Global error handler utility for API routes
function handleError(res, error, customMessage) {
  console.error(`${customMessage}:`, error);
  res.status(500).json({
    status: 'error',
    message: customMessage,
    details: error instanceof Error ? error.message : String(error)
  });
}

// ---------------------------------------------------------
// 1. Contextual AI Chatbot Route (supports English & Bangla)
// ---------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lang } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    try {
      const ai = getAI();
      const systemPrompt = `You are "EduMind AI", an Intelligent Academic Advisor and Tutor for university students, especially designed with the academic context of students in Bangladesh in mind.
Your goal is to provide insightful, accurate, and constructive university-level academic guidance, programming tutor answers, conceptual explanations, or study tips.
Bilingual Constraint:
- You must respond in the language specified: "${lang || 'en'}".
- If the language is "bn" (Bangla), communicate in fluent, elegant, and standard academic Bangla.
- If the language is "en" (English), communicate in clear, encouraging, and scholarly English.
History Tracking:
- Keep track of the chat history and context provided. Give direct, high-value explanations. Never start responses with redundant headers or robot filler. Keep responses readable with clear Markdown layout.`;

      const chatHistoryParts = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Generate response using gemini-3.5-flash as the fast, solid model for general chatbot
      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: chatHistoryParts,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      res.json({
        reply: result.text || 'I could not generate a response. Please try again.',
        timestamp: new Date().toISOString()
      });
    } catch (apiErr) {
      console.warn('Gemini Chat API error caught: attempting resilient local fallback response.', apiErr);
      const fallbackResult = generateChatFallback(messages, lang);
      res.json(fallbackResult);
    }
  } catch (err) {
    handleError(res, err, 'Chat advisor failed to formulate a response');
  }
});

// ---------------------------------------------------------
// 2. AI Quiz Generator (generates MCQs from content notes)
// ---------------------------------------------------------
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required to generate a quiz.' });
      return;
    }

    try {
      const ai = getAI();
      const prompt = `Review the following lecture notes or study material, and generate an interactive study quiz with exactly 5 matching multiple-choice questions (each containing 4 options, a correct answer index starting at 0, and a supportive explanatory lesson on why it is correct).
Material Content:
"${content.slice(0, 10000)}"`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert university examiner. Create a rigorous, curriculum-oriented academic quiz in the requested JSON structure.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A high-quality descriptive title of the quiz covering the content" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: "The specific MCQ question formulated clearly" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 options"
                    },
                    correctAnswerIndex: { type: Type.INTEGER, description: "Index of correct option (0-3)" },
                    explanation: { type: Type.STRING, description: "A highly educational explanation of the correct answer" }
                  },
                  required: ["question", "options", "correctAnswerIndex", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      const quizData = JSON.parse(result.text || '{}');
      res.json(quizData);
    } catch (apiErr) {
      console.warn('Gemini Quiz API error caught: attempting resilient local fallback formulation.', apiErr);
      const fallbackQuiz = generateQuizFallback(content, title);
      res.json(fallbackQuiz);
    }
  } catch (err) {
    handleError(res, err, 'Quiz generator failed to build interactive questions');
  }
});

// ---------------------------------------------------------
// 3. AI Study Planner (generates structured weekly timetables)
// ---------------------------------------------------------
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { subjects, dailyHours, examDates } = req.body;
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      res.status(400).json({ error: 'At least one subject is required.' });
      return;
    }

    try {
      const ai = getAI();
      const prompt = `Generate a personalized weekly undergraduate study schedule for the following profile:
Subjects: ${JSON.stringify(subjects)}
Target Daily Hours Budget: ${dailyHours || 3} hours/day
Exam Dates/Deadlines: ${JSON.stringify(examDates || {})}

Provide a strict weekly review distribution showing slots for each day (e.g. Saturday to Friday since this is Bangladesh's academic week). High-importance/high-risk courses with closer exam dates should occupy highest proportion of study time and have higher priority flags.
Output exactly matches the structural JSON schema.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert university academic counselor. Analyze student deadlines and credit loads, then generate an optimal study timeline in structured JSON format.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Descriptive plan recommendation title" },
              totalWeeklyHours: { type: Type.INTEGER },
              riskAssessment: { type: Type.STRING, description: "Brief analysis of the workload, stating if it is low, moderate, or high risk, plus a proactive warning on tight exam dates" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: "Standard day of the week, e.g. Saturday, Sunday, Monday" },
                    timeSlot: { type: Type.STRING, description: "Suggested hours slot, e.g., '07:00 PM - 09:00 PM'" },
                    subjectCode: { type: Type.STRING, description: "Subject code short name" },
                    subjectName: { type: Type.STRING, description: "Full descriptive course name" },
                    topic: { type: Type.STRING, description: "Critical chapter theme to review" },
                    priority: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
                    hours: { type: Type.NUMBER, description: "Study duration" }
                  },
                  required: ["day", "timeSlot", "subjectCode", "subjectName", "topic", "priority", "hours"]
                }
              }
            },
            required: ["title", "totalWeeklyHours", "riskAssessment", "items"]
          }
        }
      });

      const planData = JSON.parse(result.text || '{}');
      res.json(planData);
    } catch (apiErr) {
      console.warn('Gemini Plan API error caught: attempting resilient local fallback schedule computation.', apiErr);
      const fallbackPlan = generatePlanFallback(subjects, dailyHours, examDates);
      res.json(fallbackPlan);
    }
  } catch (err) {
    handleError(res, err, 'Study planner failed to compile custom timetable');
  }
});

// ---------------------------------------------------------
// 4. Resource Recommender (Suggests videos, articles, tutorials)
// ---------------------------------------------------------
app.post('/api/recommend-resources', async (req, res) => {
  try {
    const { topic, subject } = req.body;
    if (!topic || topic.trim() === '') {
      res.status(400).json({ error: 'Topic is required.' });
      return;
    }

    try {
      const ai = getAI();
      const prompt = `Recommend exactly 4 highly-rated tutorials, academic videos, articles, and interactive playgrounds/practice sites for:
Subject: ${subject || 'General Engineering/Science'}
Topic: ${topic}

For each resource, include a realistic and actual title, its type ('youtube', 'article', or 'practice_site'), standard educational sources (like Coursera, YouTube, Khan Academy, MIT OpenCourseWare, stackoverflow, geeksforgeeks), mock but realistic educational URLs, a clear description of the content, and a highly specific explanatory note detailing its exact academic relevance to study preparation.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are an intelligent educational resource engine. Curate clean, high-relevance resources designed to target academic topics in structured JSON format.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, description: "Must be 'youtube', 'article', or 'practice_site'" },
                url: { type: Type.STRING },
                source: { type: Type.STRING, description: "Primary source channel or portal name, e.g., 'MIT OCW', 'Khan Academy', 'freeCodeCamp'" },
                description: { type: Type.STRING },
                relevanceReason: { type: Type.STRING }
              },
              required: ["title", "type", "url", "source", "description", "relevanceReason"]
            }
          }
        }
      });

      const resources = JSON.parse(result.text || '[]');
      res.json(resources);
    } catch (apiErr) {
      console.warn('Gemini Recommend Resources API error caught: attempting resilient local fallback formulation.', apiErr);
      const fallbackResources = generateResourcesFallback(topic, subject);
      res.json(fallbackResources);
    }
  } catch (err) {
    handleError(res, err, 'Resource engine failed to curate recommendations');
  }
});

// ---------------------------------------------------------
// 5. Weak Area Detector (Analyzes quiz achievements to pinpoint weaknesses)
// ---------------------------------------------------------
app.post('/api/analyze-weak-areas', async (req, res) => {
  try {
    const { quizScores } = req.body;
    if (!quizScores || !Array.isArray(quizScores)) {
      res.status(400).json({ error: 'Quiz scores array is required.' });
      return;
    }

    try {
      const ai = getAI();
      const prompt = `Identify top weak areas based on the student's recent academic evaluation records:
Recent Quiz Results: ${JSON.stringify(quizScores)}

Analyze performance values lower than 70% as high risk. Formulate supportive diagnostic insights containing subject title, specific topic, average percentage, total attempts count, and clear, structured, actionable advise to help the student master the content.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are an academic diagnostics coach. Spot performance weaknesses, assign priorities, and compile targeted recovery advice into structured JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                topic: { type: Type.STRING },
                scorePercentage: { type: Type.NUMBER },
                totalQuizzesTaken: { type: Type.INTEGER },
                recommendation: { type: Type.STRING, description: "Clear study advise, e.g., 'Re-read memory hierarchy chapter and attempt self-quizzes focusing on clock cycles.'" }
              },
              required: ["subject", "topic", "scorePercentage", "totalQuizzesTaken", "recommendation"]
            }
          }
        }
      });

      const diagnostics = JSON.parse(result.text || '[]');
      res.json(diagnostics);
    } catch (apiErr) {
      console.warn('Gemini Weak Areas API error caught: attempting resilient local fallback formulation.', apiErr);
      const fallbackDiagnostics = generateWeakAreasFallback(quizScores);
      res.json(fallbackDiagnostics);
    }
  } catch (err) {
    handleError(res, err, 'Weak Area analyzer failed to output academic diagnostics');
  }
});

// ---------------------------------------------------------
// 6. AI Flashcard Generator (Converts study material into cards)
// ---------------------------------------------------------
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { content, subject } = req.body;
    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Content notes are required to generate flashcards.' });
      return;
    }

    try {
      const ai = getAI();
      const prompt = `Extract core definitions, terminology, and theoretical assertions from the provided revision material, compiling exactly 8 high-utility study flashcards:
Subject: ${subject || 'Selected Subject'}
Material Notes:
"${content.slice(0, 10000)}"`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are a study efficiency expert. Extract crucial terminology questions and concise answers for spaced-repetition flashcards in structured JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Core terminology question or blank-filling statement" },
                answer: { type: Type.STRING, description: "Concise exact fact or definition" },
                subject: { type: Type.STRING }
              },
              required: ["question", "answer", "subject"]
            }
          }
        }
      });

      const flashcards = JSON.parse(result.text || '[]');
      res.json(flashcards);
    } catch (apiErr) {
      console.warn('Gemini Flashcard API error caught: attempting resilient local fallback formulation.', apiErr);
      const fallbackFlashcards = generateFlashcardsFallback(content, subject);
      res.json(fallbackFlashcards);
    }
  } catch (err) {
    handleError(res, err, 'Flashcard generator failed to convert study notes');
  }
});

// Vite middleware & Static Files Serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduMind AI Full-stack server running successfully on port ${PORT}`);
  });
}

startServer();
