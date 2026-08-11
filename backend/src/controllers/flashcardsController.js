/**
 * EduMind AI - Flashcard Decks Controller
 * Task 4 & 5: Learning Resource APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { Flashcards } from '../config/db.js';

// GET /api/flashcards
export const getDecks = asyncHandler(async (req, res) => {
  const decks = await Flashcards.findByUser(req.user.id);
  res.json({ status: 'success', data: { decks } });
});

// GET /api/flashcards/:id
export const getDeck = asyncHandler(async (req, res) => {
  const deck = await Flashcards.findById(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ status: 'error', message: 'Flashcard deck not found.' });
  res.json({ status: 'success', data: { deck } });
});

// POST /api/flashcards
export const createDeck = asyncHandler(async (req, res) => {
  const { title, subject, cards } = req.body;
  const deck = await Flashcards.create({
    user_id: req.user.id,
    title:   title.trim(),
    subject: subject || null,
    cards:   cards   || [],
  });
  res.status(201).json({ status: 'success', message: 'Flashcard deck saved.', data: { deck } });
});

// PUT /api/flashcards/:id
export const updateDeck = asyncHandler(async (req, res) => {
  const { title, subject, cards } = req.body;
  const updates = {};
  if (title   !== undefined) updates.title   = title.trim();
  if (subject !== undefined) updates.subject = subject;
  if (cards   !== undefined) updates.cards   = cards;

  const deck = await Flashcards.update(req.params.id, req.user.id, updates);
  if (!deck) return res.status(404).json({ status: 'error', message: 'Flashcard deck not found.' });
  res.json({ status: 'success', message: 'Flashcard deck updated.', data: { deck } });
});

// DELETE /api/flashcards/:id
export const deleteDeck = asyncHandler(async (req, res) => {
  const deleted = await Flashcards.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Flashcard deck not found.' });
  res.json({ status: 'success', message: 'Flashcard deck deleted.' });
});
