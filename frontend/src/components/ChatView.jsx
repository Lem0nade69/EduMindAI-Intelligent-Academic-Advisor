import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain, Send, Trash2, Globe, RefreshCw,
  Search, Sun, Moon, Loader2, AlertTriangle, RotateCcw, Sparkles
} from 'lucide-react';
import { aiApi } from '../services/apiService';

// Simple Markdown renderer for AI responses
function renderMarkdown(text) {
  let html = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // code blocks
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_,lang,code) =>
      `<pre class="ai-code-block"><code class="language-${lang||'text'}">${code.trim()}</code></pre>`)
    // inline code
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    // bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // headings
    .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 class="ai-h3">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 class="ai-h2">$1</h2>')
    // bullet lists
    .replace(/^[*\-] (.+)$/gm, '<li>$1</li>')
    // numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ai-ol">$1</li>')
    // line breaks (but not inside pre)
    .replace(/\n\n/g, '</p><p class="ai-p">')
    .replace(/\n/g, '<br/>');

  // Wrap li groups
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/gs, '<ul class="ai-ul">$1</ul>');
  html = html.replace(/((?:<li class="ai-ol">.*?<\/li>\n?)+)/gs, '<ol class="ai-ol-wrap">$1</ol>');

  return `<p class="ai-p">${html}</p>`;
}

const PROMPT_PILLS = [
  { label: 'Explain Recursion', prompt: 'Explain recursion clearly with a real-life example and Python code.' },
  { label: 'BFS vs DFS', prompt: 'What is the difference between BFS and DFS? When should I use each?' },
  { label: 'Study Tips', prompt: 'Give me effective study strategies for a CSE undergraduate student preparing for exams.' },
  { label: 'Database Normalization', prompt: 'Explain 1NF, 2NF, and 3NF in database normalization with examples.' },
];

export default function ChatView({ user }) {
  const [messages, setMessages]       = useState(() => {
    const stored = localStorage.getItem('edumind_chat_history_v2');
    if (stored) return JSON.parse(stored);
    return [{ id:'welcome', role:'assistant', text:`Assalamu Alaikum, **${user?.name || 'Student'}**! 👋\n\nI am **EduMind AI**, your personalized academic assistant powered by Google Gemini.\n\nI can help you:\n- Understand difficult concepts step-by-step\n- Generate practice quizzes and flashcards\n- Explain programming with working code examples\n- Create a personalized study plan\n\nWhat would you like to learn today?`, timestamp: new Date().toISOString() }];
  });
  const [input, setInput]             = useState('');
  const [sessionId, setSessionId]     = useState(() => localStorage.getItem('edumind_chat_session_id') || null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [lang, setLang]               = useState('en');
  const [darkMode, setDarkMode]       = useState(true);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    localStorage.setItem('edumind_chat_history_v2', JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (sessionId) localStorage.setItem('edumind_chat_session_id', sessionId);
  }, [sessionId]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setError('');

    const userMsg = { id: 'u_' + Date.now(), role: 'user', text: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      let data;
      if (sessionId) {
        data = await aiApi.chat(msg, sessionId);
      } else {
        data = await aiApi.chatStart(msg);
        if (data.sessionId) setSessionId(data.sessionId);
      }

      const reply = data.reply || data.data?.message || 'No response received.';
      setMessages(prev => [...prev, { id: 'a_' + Date.now(), role: 'assistant', text: reply, timestamp: new Date().toISOString() }]);
    } catch (err) {
      const errText = err.message || 'EduMind AI is temporarily unavailable. Please try again.';
      setError(errText);
      setMessages(prev => [...prev, {
        id: 'err_' + Date.now(), role: 'assistant', isError: true,
        text: `⚠️ **AI temporarily unavailable**\n\n${errText}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClear = () => {
    if (!window.confirm('Clear conversation history?')) return;
    setMessages([{ id:'reset', role:'assistant', text:`Fresh start! I'm EduMind AI. What would you like to study today?`, timestamp: new Date().toISOString() }]);
    setSessionId(null);
    setError('');
    localStorage.removeItem('edumind_chat_history_v2');
    localStorage.removeItem('edumind_chat_session_id');
  };

  const dk = darkMode;
  const isLanding = messages.length <= 1;

  return (
    <>
      <style>{`
        .ai-p    { margin: 0.4em 0; line-height: 1.75; }
        .ai-h2   { font-size:1.15em; font-weight:800; margin:0.8em 0 0.3em; }
        .ai-h3   { font-size:1.05em; font-weight:700; margin:0.7em 0 0.3em; }
        .ai-h4   { font-size:0.95em; font-weight:700; margin:0.6em 0 0.2em; color:#94a3b8; }
        .ai-ul   { padding-left:1.4em; margin:0.4em 0; list-style:disc; }
        .ai-ol-wrap{ padding-left:1.4em; margin:0.4em 0; list-style:decimal; }
        .ai-ul li, .ai-ol-wrap li { margin:0.25em 0; line-height:1.6; }
        .ai-code-block { background:#0d1117; border:1px solid #30363d; border-radius:10px; padding:1em; margin:0.7em 0; overflow-x:auto; font-size:0.82em; line-height:1.6; font-family:monospace; white-space:pre; }
        .ai-inline-code { background:#1e2530; border-radius:4px; padding:0.15em 0.4em; font-size:0.85em; font-family:monospace; color:#e2c089; }
      `}</style>

      <div className={`border rounded-[28px] shadow-[0_40px_80px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col min-h-[80vh] transition-colors ${
        dk ? 'bg-[#080808] border-white/10 text-[#f5f0eb]' : 'bg-[#fafafa] border-stone-200 text-stone-900'
      }`}>

        {/* Header */}
        <header className={`px-6 py-4 flex items-center justify-between border-b ${dk ? 'bg-[#0d0d0d]/90 border-white/10' : 'bg-white/90 border-stone-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-black border border-white/25 rounded-xl">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold uppercase tracking-wider text-sm font-display text-slate-900 flex items-center gap-2">
                EduMind AI <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </h3>
              <span className={`text-[9px] font-mono tracking-widest uppercase font-bold flex items-center gap-1.5 ${dk ? 'text-stone-400' : 'text-stone-500'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Powered by Google Gemini
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l==='en'?'bn':'en')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border cursor-pointer ${dk ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700'}`}>
              <Globe className="h-3.5 w-3.5 text-stone-400" />
              {lang === 'en' ? 'English' : 'বাংলা'}
            </button>
            <button onClick={() => setDarkMode(d => !d)}
              className={`p-2 rounded-xl border cursor-pointer ${dk ? 'bg-white/5 hover:bg-white/10 border-white/10 text-yellow-400' : 'bg-stone-100 border-stone-200 text-stone-600'}`}>
              {dk ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!isLanding && (
              <button onClick={handleClear}
                className={`p-2 rounded-xl border cursor-pointer ${dk ? 'bg-white/5 hover:bg-white/10 border-white/10 text-stone-300' : 'bg-stone-100 border-stone-200 text-stone-600'}`}
                title="Clear conversation">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-5 ${dk ? 'bg-[#080808]' : 'bg-[#fcfcfa]'}`}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-mono font-bold ${
                msg.role === 'user'
                  ? 'bg-white text-black border border-white/20'
                  : (dk ? 'bg-[#1a1a1a] border border-white/10 text-slate-900' : 'bg-stone-100 border border-stone-200 text-stone-900')
              }`}>
                {msg.role === 'user' ? (user?.name?.[0] || 'U') : 'AI'}
              </div>
              <div className={`rounded-[22px] px-5 py-4 text-sm leading-relaxed max-w-2xl ${
                msg.role === 'user'
                  ? (dk ? 'bg-white text-black font-medium' : 'bg-stone-900 text-white font-medium')
                  : msg.isError
                    ? (dk ? 'bg-red-950/30 border border-red-900/40 text-red-300' : 'bg-red-50 border border-red-200 text-red-700')
                    : (dk ? 'bg-[#121212] border border-white/5 text-stone-100' : 'bg-white border border-stone-200 text-stone-850')
              }`}>
                {msg.role === 'user'
                  ? <p className="whitespace-pre-wrap">{msg.text}</p>
                  : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 mr-auto">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-mono font-bold ${dk ? 'bg-[#1a1a1a] border border-white/10 text-slate-900' : 'bg-stone-100 border border-stone-200 text-stone-900'}`}>AI</div>
              <div className={`border rounded-[22px] px-5 py-3.5 text-sm flex items-center gap-3 ${dk ? 'bg-[#121212] border-white/5 text-stone-400' : 'bg-white border-stone-200 text-stone-500'}`}>
                <span className="flex gap-1.5">
                  {['-0.3s','-0.15s','0s'].map((d,i) => (
                    <span key={i} className={`w-2 h-2 rounded-full animate-bounce ${dk?'bg-white/40':'bg-stone-400'}`} style={{animationDelay:d}} />
                  ))}
                </span>
                <span className="text-xs italic font-semibold">EduMind AI is thinking...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl p-3 max-w-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input footer */}
        <div className={`p-4 border-t ${dk ? 'bg-[#0c0c0c] border-white/10' : 'bg-stone-50 border-stone-200'}`}>
          {/* Quick pills */}
          {isLanding && (
            <div className="flex flex-wrap gap-2 mb-3 justify-center">
              {PROMPT_PILLS.map((p,i) => (
                <button key={i} onClick={() => handleSend(p.prompt)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    dk ? 'bg-[#121212] hover:bg-[#1e1e1e] border-white/10 text-stone-400 hover:text-white' : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600'
                  }`}>{p.label}</button>
              ))}
            </div>
          )}

          <div className={`max-w-3xl mx-auto flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${
            dk ? 'bg-[#121212] border-white/10 focus-within:border-white/30' : 'bg-white border-stone-200 focus-within:border-stone-400'
          } transition`}>
            <input
              ref={inputRef}
              type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={lang === 'bn' ? 'যেকোনো একাডেমিক প্রশ্ন করুন...' : 'Ask EduMind AI anything about your studies...'}
              disabled={loading}
              className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-stone-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-stone-200 disabled:opacity-40 transition cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Ask
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
