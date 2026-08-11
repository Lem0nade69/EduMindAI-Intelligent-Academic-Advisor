import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, RotateCw, Sparkles, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Upload, AlertCircle, BookOpen, Check } from 'lucide-react';
import { aiApi, flashcardsApi, uploadApi } from '../services/apiService';

const SUBJECTS = ['CSE-305','MATH-201','CSE-301','CSE-311','CSE-401','EEE-202','CSE-205'];
const SAMPLE_TEXT = `Database normalization is the process of structuring a relational database to reduce data redundancy and improve data integrity.
First Normal Form (1NF): Table must contain only atomic values. No multivalued attributes.
Second Normal Form (2NF): Must be in 1NF, and all non-key attributes must be fully functionally dependent on the entire primary key, eliminating partial dependency.
Third Normal Form (3NF): Must be in 2NF. Transitive dependencies must be removed.
BCNF: Every determinant must be a candidate key.`;

export default function FlashcardsView({ user }) {
  const [decks, setDecks]           = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [activeDeck, setActiveDeck]  = useState(null);
  const [cardIdx, setCardIdx]        = useState(0);
  const [flipped, setFlipped]        = useState(false);

  // Generation state
  const [genMode, setGenMode]        = useState(false);
  const [text, setText]              = useState('');
  const [subject, setSubject]        = useState('CSE-311');
  const [topic, setTopic]            = useState('');
  const [count, setCount]            = useState(10);
  const [generating, setGenerating]  = useState(false);
  const [uploading, setUploading]    = useState(false);
  const [error, setError]            = useState('');
  const [uploadedFile, setUploadedFile] = useState('');
  const [saved, setSaved]            = useState(false);

  // Load existing decks on mount
  useEffect(() => {
    flashcardsApi.list().then(data => {
      setDecks(data.data?.decks || []);
    }).catch(() => {
      // Falls back to empty — backend may not be running
      setDecks([]);
    }).finally(() => setLoadingDecks(false));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.pdf')) {
      setUploading(true); setError('');
      try {
        const data = await uploadApi.file(file);
        if (data.data?.extractedText) { setText(data.data.extractedText); setUploadedFile(file.name); }
        else throw new Error(data.message || 'Extraction failed.');
      } catch (err) { setError('Upload failed: ' + err.message); }
      finally { setUploading(false); }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => { setText(ev.target.result || ''); setUploadedFile(file.name); };
      reader.readAsText(file);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) { setError('Please enter study material first.'); return; }
    setGenerating(true); setError(''); setSaved(false);
    try {
      const data = await aiApi.generateFlashcards(text, { subject, topic: topic || subject, count });
      const cards = data.data?.cards || [];
      if (!cards.length) throw new Error('No flashcards generated. Please try with more detailed text.');

      // Auto-save to backend and show immediately
      const deck = await flashcardsApi.create({ title: topic || `${subject} Flashcards`, subject, cards });
      const newDeck = deck.data?.deck || { id: 'local_' + Date.now(), title: topic || `${subject} Flashcards`, subject, cards, card_count: cards.length };
      setDecks(prev => [newDeck, ...prev]);
      setActiveDeck(newDeck);
      setCardIdx(0); setFlipped(false);
      setGenMode(false); setSaved(true);
    } catch (err) {
      setError(err.message || 'Flashcard generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteDeck = async (id) => {
    if (!window.confirm('Delete this deck?')) return;
    try { await flashcardsApi.delete(id); } catch (_) {}
    setDecks(prev => prev.filter(d => d.id !== id));
    if (activeDeck?.id === id) setActiveDeck(null);
  };

  const cards = activeDeck?.cards || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="h-5 w-5 text-purple-400" /> AI Flashcard Generator</h2>
          <p className="text-slate-400 text-sm mt-0.5">Generate smart Q&A flashcards from any study material using Gemini AI.</p>
        </div>
        <button onClick={() => { setGenMode(true); setActiveDeck(null); setError(''); setSaved(false); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition cursor-pointer">
          <Plus className="h-4 w-4" /> New Deck
        </button>
      </div>

      {/* Generator Panel */}
      {genMode && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-bold mb-1">Generate with Gemini AI</p>
          <h3 className="text-lg font-bold text-white mb-4">Create flashcard deck from notes</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Cards</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition">
                {[5,8,10,15,20].map(n => <option key={n} value={n}>{n} Cards</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Topic <span className="text-slate-600">(optional)</span></label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Normalization"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition" />
            </div>
          </div>

          <label className="relative flex items-center gap-3 border border-dashed border-[#333] rounded-xl px-4 py-3 mb-3 cursor-pointer hover:border-purple-500/50 transition">
            <Upload className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="text-sm text-slate-400">{uploading ? 'Extracting...' : uploadedFile || 'Upload PDF or text file'}</span>
            {uploading && <Loader2 className="h-4 w-4 text-purple-400 animate-spin ml-auto" />}
            <input type="file" accept=".txt,.md,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400">Study Material</label>
              <button onClick={() => { setText(SAMPLE_TEXT); setSubject('CSE-311'); }}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider">Load Sample</button>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={7}
              placeholder="Paste lecture notes, textbook content, or revision material..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-[18px] px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none resize-none transition" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={generating || !text.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 rounded-xl hover:from-purple-500 disabled:opacity-50 transition cursor-pointer shadow-[0_8px_25px_rgba(147,51,234,0.3)]">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating flashcards...</>
                          : <><Sparkles className="h-4 w-4" /> Generate {count} Flashcards</>}
            </button>
            <button onClick={() => { setGenMode(false); setError(''); }}
              className="px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-400 text-sm hover:text-white transition cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* Active Deck — Card Viewer */}
      {activeDeck && cards.length > 0 && !genMode && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white">{activeDeck.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{activeDeck.subject} · {cards.length} cards · Card {cardIdx+1}/{cards.length}</p>
            </div>
            <button onClick={() => { setActiveDeck(null); setCardIdx(0); setFlipped(false); }}
              className="text-slate-500 hover:text-white text-xs font-semibold transition cursor-pointer">← Back</button>
          </div>

          {/* Flip Card */}
          <div className="perspective-1000 h-52 cursor-pointer mb-5" onClick={() => setFlipped(f => !f)}>
            <AnimatePresence mode="wait">
              <motion.div key={`${cardIdx}-${flipped}`}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`w-full h-full rounded-[22px] flex flex-col items-center justify-center p-8 border text-center ${
                  flipped ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#0d0d0d] border-[#2a2a2a]'
                }`}>
                <div className="text-[10px] uppercase tracking-widest font-bold mb-4 text-slate-500">
                  {flipped ? '✓ Answer' : '? Question'}
                </div>
                <p className={`text-base leading-relaxed font-semibold ${flipped ? 'text-purple-200' : 'text-white'}`}>
                  {flipped ? cards[cardIdx]?.answer : cards[cardIdx]?.question}
                </p>
                <p className="mt-4 text-[10px] text-slate-600">Click to {flipped ? 'see question' : 'reveal answer'}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => { setCardIdx(i => Math.max(0,i-1)); setFlipped(false); }}
              disabled={cardIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-300 text-sm disabled:opacity-40 hover:text-white transition cursor-pointer">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <div className="flex gap-1.5">
              {cards.map((_,i) => (
                <div key={i} onClick={() => { setCardIdx(i); setFlipped(false); }}
                  className={`w-2 h-2 rounded-full cursor-pointer transition ${i === cardIdx ? 'bg-purple-400' : 'bg-[#333] hover:bg-[#555]'}`} />
              ))}
            </div>
            <button onClick={() => { setCardIdx(i => Math.min(cards.length-1,i+1)); setFlipped(false); }}
              disabled={cardIdx === cards.length-1}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-300 text-sm disabled:opacity-40 hover:text-white transition cursor-pointer">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deck List */}
      {!genMode && !activeDeck && (
        <div>
          {loadingDecks ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your decks...
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No flashcard decks yet.</p>
              <p className="text-sm mt-1">Click "New Deck" to generate one with AI from your study notes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decks.map(deck => (
                <div key={deck.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-[22px] p-5 hover:border-purple-500/30 transition cursor-pointer group"
                  onClick={() => { setActiveDeck(deck); setCardIdx(0); setFlipped(false); }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">{deck.subject}</p>
                      <h4 className="font-bold text-white mt-1 group-hover:text-purple-200 transition">{deck.title}</h4>
                      <p className="text-slate-500 text-xs mt-1">{deck.card_count || deck.cards?.length || 0} cards</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <BookOpen className="h-4 w-4 text-purple-400" />
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                        className="p-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600 uppercase tracking-wider font-semibold group-hover:text-purple-400 transition">
                    Study deck <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
