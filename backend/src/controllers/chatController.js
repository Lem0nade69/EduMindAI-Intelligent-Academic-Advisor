/**
 * EduMind AI - Chat Sessions Controller
 * Task 4 & 5: AI Chat History APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { ChatSessions } from '../config/db.js';

// GET /api/chat/sessions
export const getChatSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await ChatSessions.findByUser(req.user.id, { page: parseInt(page), limit: parseInt(limit) });
  res.json({ status: 'success', data: result });
});

// GET /api/chat/sessions/:id
export const getChatSession = asyncHandler(async (req, res) => {
  const session = await ChatSessions.findById(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ status: 'error', message: 'Chat session not found.' });
  res.json({ status: 'success', data: { session } });
});

// POST /api/chat/sessions
export const createChatSession = asyncHandler(async (req, res) => {
  const { language } = req.body;
  const session = await ChatSessions.create({
    user_id:  req.user.id,
    language: language || 'en',
    title:    'New Conversation',
  });
  res.status(201).json({ status: 'success', data: { session } });
});

// POST /api/chat/sessions/:id/messages
export const appendMessages = asyncHandler(async (req, res) => {
  const { userMessage, assistantReply } = req.body;

  const exists = await ChatSessions.findById(req.params.id, req.user.id);
  if (!exists) return res.status(404).json({ status: 'error', message: 'Chat session not found.' });

  let session = exists;
  if (userMessage) {
    session = await ChatSessions.appendMessage(req.params.id, req.user.id, {
      role: 'user', text: userMessage,
    });
  }
  if (assistantReply) {
    session = await ChatSessions.appendMessage(req.params.id, req.user.id, {
      role: 'assistant', text: assistantReply,
    });
  }

  res.json({ status: 'success', data: { session } });
});

// DELETE /api/chat/sessions/:id
export const deleteChatSession = asyncHandler(async (req, res) => {
  const deleted = await ChatSessions.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Chat session not found.' });
  res.json({ status: 'success', message: 'Chat session deleted.' });
});
