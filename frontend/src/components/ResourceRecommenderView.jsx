import React, { useState } from 'react';
import { Compass, Search, Loader2, Sparkles, ExternalLink, Youtube, FileText, Globe, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { aiApi } from '../services/apiService';

const TYPE_ICONS = { video: Youtube, article: FileText, pdf: FileText, link: Globe, book: BookOpen, exercise: Sparkles, note: FileText };
const TYPE_COLORS = {
  video:    'text-rose-400 bg-rose-500/10 border-rose-500/30',
  article:  'text-blue-400 bg-blue-500/10 border-blue-500/30',
  pdf:      'text-amber-400 bg-amber-500/10 border-amber-500/30',
  link:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  book:     'text-purple-400 bg-purple-500/10 border-purple-500/30',
  exercise: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  note:     'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const SUGGESTION_PILLS = [
  'Recursion and Dynamic Programming',
  'Database Normalization',
  'TCP/IP Networking Basics',
  'Fourier Transform Applications',
  'Object-Oriented Design Patterns',
];

export default function ResourceRecommenderView({ user }) {
  const [topic, setTopic]         = useState('');
  const [subject, setSubject]     = useState('Computer Science');
  const [level, setLevel]         = useState('undergraduate');
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [searched, setSearched]   = useState(false);

  const handleSearch = async (overrideTopic) => {
    const searchTopic = (overrideTopic || topic).trim();
    if (!searchTopic) { setError('Please enter a topic to search.'); return; }

    setLoading(true); setError(''); setSearched(false);
    if (overrideTopic) setTopic(overrideTopic);

    try {
      // Use Gemini AI to generate curated resource recommendations
      const data = await aiApi.chat(
        `Generate a curated list of 6 high-quality learning resources for: "${searchTopic}" (${subject}, ${level} level).

For each resource provide ONLY a JSON array — no markdown, no explanation. Format exactly:
[
  {
    "title": "resource title",
    "type": "video|article|book|link|exercise",
    "url": "https://real-url.com",
    "source": "MIT OpenCourseWare",
    "description": "2 sentence description of what this covers",
    "relevance": "why this helps with ${searchTopic}",
    "difficulty": "beginner|intermediate|advanced"
  }
]

Use REAL, verifiable URLs only (MIT OCW, Khan Academy, GeeksforGeeks, YouTube official channels, official docs, Coursera, etc). No invented URLs.`
      );

      const reply = data.reply || data.data?.message || '';
      // Extract JSON from reply
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse resource list from AI response.');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No resources found for this topic.');

      setResources(parsed);
      setSearched(true);
    } catch (err) {
      if (err.message.includes('parse') || err.message.includes('JSON')) {
        // Fallback resources
        setResources([
          { title: 'MIT OpenCourseWare — Computer Science', type: 'link', url: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/', source: 'MIT OCW', description: `Comprehensive MIT course materials covering ${searchTopic} and related topics. Includes lecture notes, problem sets, and exams.`, relevance: `Directly applicable to ${searchTopic} with rigorous academic depth.`, difficulty: 'intermediate' },
          { title: 'Khan Academy — Computer Science', type: 'video', url: 'https://www.khanacademy.org/computing/computer-science', source: 'Khan Academy', description: `Video tutorials and interactive exercises on core CS fundamentals. Excellent for building foundational understanding.`, relevance: `Beginner-friendly introduction to ${searchTopic} concepts.`, difficulty: 'beginner' },
          { title: `GeeksforGeeks — ${searchTopic}`, type: 'article', url: `https://www.geeksforgeeks.org/`, source: 'GeeksforGeeks', description: `Detailed articles with examples, code snippets, and practice problems for ${searchTopic}.`, relevance: 'Practical implementation examples and interview preparation.', difficulty: 'intermediate' },
          { title: 'Coursera — CS Fundamentals', type: 'link', url: 'https://www.coursera.org/browse/computer-science', source: 'Coursera', description: `University-level courses from top institutions covering ${searchTopic} with video lectures, quizzes, and projects.`, relevance: 'Structured learning with certificates from leading universities.', difficulty: 'intermediate' },
        ]);
        setSearched(true);
      } else {
        setError(err.message || 'Resource search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Compass className="h-5 w-5 text-teal-400" /> AI Resource Finder
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">Get AI-curated learning resources for any topic — powered by Gemini.</p>
      </div>

      {/* Search Panel */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Subject Area</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition">
              {['Computer Science','Mathematics','Electronics','Physics','General'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition">
              <option value="beginner">Beginner</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex items-center gap-3 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 focus-within:border-teal-500/40 transition">
            <Search className="h-4 w-4 text-slate-500 shrink-0" />
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search topic e.g. Binary Search Trees, Fourier Transforms..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" />
          </div>
          <button onClick={() => handleSearch()} disabled={loading || !topic.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-bold rounded-xl hover:from-teal-400 disabled:opacity-50 transition shadow-[0_8px_25px_rgba(20,184,166,0.25)] cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Searching...' : 'Find Resources'}
          </button>
        </div>

        {/* Suggestion pills */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_PILLS.map(p => (
            <button key={p} onClick={() => handleSearch(p)}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#2a2a2a] bg-[#0d0d0d] text-slate-400 hover:border-teal-500/40 hover:text-teal-300 transition cursor-pointer">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#2a2a2a] rounded-[20px] p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#1a1a1a]" />
                <div>
                  <div className="h-3.5 w-48 bg-[#1a1a1a] rounded mb-2" />
                  <div className="h-2.5 w-24 bg-[#1a1a1a] rounded" />
                </div>
              </div>
              <div className="h-2.5 w-full bg-[#1a1a1a] rounded mb-2" />
              <div className="h-2.5 w-3/4 bg-[#1a1a1a] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && resources.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {resources.length} AI-curated resources for "{topic}"
          </p>
          {resources.map((r, i) => {
            const TypeIcon  = TYPE_ICONS[r.type] || Globe;
            const typeColor = TYPE_COLORS[r.type] || TYPE_COLORS.link;
            return (
              <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                className="bg-[#111111] border border-[#2a2a2a] rounded-[22px] p-5 hover:border-teal-500/20 transition group">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${typeColor}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition line-clamp-1">{r.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold">{r.source}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${typeColor}`}>{r.type}</span>
                          {r.difficulty && (
                            <span className="text-[9px] text-slate-600 uppercase tracking-wider">{r.difficulty}</span>
                          )}
                        </div>
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs font-semibold text-slate-300 hover:text-teal-300 hover:border-teal-500/30 transition shrink-0"
                        onClick={e => e.stopPropagation()}>
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{r.description}</p>
                    {r.relevance && (
                      <p className="text-teal-500/70 text-xs mt-1.5 italic">✦ {r.relevance}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && searched && resources.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Compass className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No resources found for that topic. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
