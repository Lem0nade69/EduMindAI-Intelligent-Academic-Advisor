import React, { useState } from 'react';
import { BookOpen, Upload, CheckCircle2, AlertCircle, Sparkles, Loader2, RotateCcw, Trophy, Target } from 'lucide-react';
import { aiApi, quizApi, weakAreasApi, uploadApi } from '../services/apiService';

const SUBJECTS = [
  'CSE-305 (Computer Architecture)', 'MATH-201 (Complex Variables)',
  'CSE-301 (Algorithms)', 'CSE-311 (Database Systems)',
  'CSE-401 (Software Engineering)', 'EEE-202 (Electronics)',
  'CSE-205 (Data Structures)', 'CSE-407 (Machine Learning)',
];

const SAMPLE_TEXT = `Instruction pipelining is a technique used in computer architecture to improve processor performance. Instead of waiting for one instruction to complete all steps (Fetch, Decode, Execute, Memory, Writeback) before starting the next, parts of different instructions are overlapped.

Pipeline Hazards can halt or slow instruction execution:
1. Structural Hazards: Occur when hardware resources cannot support all overlapping instructions simultaneously.
2. Data Hazards: Occur when an instruction depends on the result of a previous instruction (Read After Write - RAW).
3. Control Hazards: Caused by branch and jump instructions modifying the Program Counter.

Solutions include forwarding/bypassing, pipeline stalls (bubbles), and branch prediction.`;

export default function QuizGeneratorView({ user, onQuizCompleted }) {
  const [text, setText]           = useState('');
  const [subject, setSubject]     = useState('CSE-305 (Computer Architecture)');
  const [topic, setTopic]         = useState('');
  const [count, setCount]         = useState(5);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [uploadedFile, setUploadedFile] = useState('');
  const [quiz, setQuiz]           = useState(null);
  const [answers, setAnswers]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.pdf')) {
      // Send PDF to backend for text extraction
      setUploading(true);
      setError('');
      try {
        const data = await uploadApi.file(file);
        if (data.data?.extractedText) {
          setText(data.data.extractedText);
          setUploadedFile(file.name + ` (${data.data.characterCount} chars extracted)`);
        } else {
          throw new Error(data.message || 'Text extraction failed.');
        }
      } catch (err) {
        setError('PDF upload failed: ' + err.message);
      } finally {
        setUploading(false);
      }
    } else {
      // Plain text/markdown
      const reader = new FileReader();
      reader.onload = (ev) => { setText(ev.target.result || ''); setUploadedFile(file.name); };
      reader.readAsText(file);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) { setError('Please enter study material or upload a file first.'); return; }
    if (text.trim().length < 50) { setError('Study material is too short. Please provide more content.'); return; }

    setLoading(true); setError(''); setQuiz(null); setSubmitted(false); setAnswers({}); setScore(null);

    try {
      const data = await aiApi.generateQuiz(text, {
        subject: subject.split(' ')[0],
        topic: topic || subject,
        count,
        difficulty,
      });

      const questions = data.data?.questions || [];
      if (!questions.length) throw new Error('No questions were generated. Please try with more detailed study material.');

      setQuiz({ title: `${subject} — AI Quiz`, questions });
    } catch (err) {
      setError(err.message || 'Quiz generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!window.confirm('Some questions are unanswered. Submit anyway?')) return;
    }

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const pct = Math.round((correct / quiz.questions.length) * 100);
    setScore({ correct, total: quiz.questions.length, pct });
    setSubmitted(true);

    // Save to backend + update weak areas
    try {
      await quizApi.save({
        title: quiz.title, subject: subject.split(' ')[0], topic: topic || subject,
        totalQuestions: quiz.questions.length, correctAnswers: correct,
        scorePercentage: pct, answers, questions: quiz.questions,
      });
      await weakAreasApi.fromQuiz({
        subject: subject.split(' ')[0], topic: topic || subject, scorePercentage: pct,
      });
      if (onQuizCompleted) onQuizCompleted({ subject: subject.split(' ')[0], topic: topic || subject, scorePercentage: pct });
    } catch (e) { console.warn('Could not save quiz to backend:', e.message); }
  };

  const handleReset = () => { setQuiz(null); setAnswers({}); setSubmitted(false); setScore(null); setError(''); };

  return (
    <div className="space-y-6 max-w-4xl">
      {!quiz ? (
        <div className="bg-[#111111] border border-[#2c2c2c] rounded-[28px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400 font-bold">AI Quiz Builder</p>
              <h2 className="mt-1 text-xl font-bold text-white">Generate from your study material</h2>
              <p className="text-slate-400 text-sm mt-1">Paste notes, upload a PDF, or use the sample material to generate adaptive MCQs.</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <BookOpen className="h-6 w-6 text-amber-400" />
            </div>
          </div>

          {/* Config row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Questions</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition">
                {[3,5,8,10,15].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Topic */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Topic <span className="text-slate-600">(optional)</span></label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Pipeline Hazards, Recursion, Database Normalization..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition" />
          </div>

          {/* Upload */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400">Upload PDF / TXT</label>
              {uploadedFile && <span className="text-[10px] text-emerald-400 font-semibold">✓ {uploadedFile}</span>}
            </div>
            <label className="relative flex items-center gap-3 border border-dashed border-[#333] rounded-xl px-4 py-3 cursor-pointer hover:border-amber-500/50 transition">
              <Upload className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm text-slate-400">{uploading ? 'Extracting text...' : 'Click to upload PDF or text file'}</span>
              {uploading && <Loader2 className="h-4 w-4 text-amber-400 animate-spin ml-auto" />}
              <input type="file" accept=".txt,.md,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>

          {/* Text area */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400">Study Material</label>
              <button onClick={() => setText(SAMPLE_TEXT)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider">
                Load Sample
              </button>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
              placeholder="Paste your lecture notes, textbook excerpts, or revision points here..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-[20px] px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40 resize-none transition" />
            <p className="text-[10px] text-slate-600 mt-1">{text.length} / 20,000 characters</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading || !text.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold py-3.5 rounded-2xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition shadow-[0_8px_30px_rgba(245,158,11,0.3)] cursor-pointer">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating quiz with Gemini AI...</>
                     : <><Sparkles className="h-4 w-4" /> Generate AI Quiz ({count} Questions)</>}
          </button>
        </div>
      ) : (
        /* Quiz Taking / Results */
        <div className="space-y-5">
          {/* Header */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">{subject}</p>
                <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
                {submitted && score && (
                  <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${score.pct >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {score.pct >= 70 ? <Trophy className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    Score: {score.correct}/{score.total} ({score.pct}%)
                    {score.pct >= 70 ? ' — Great job! 🎉' : ' — Keep practising!'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {submitted && (
                  <div className={`text-center px-4 py-2 rounded-xl font-black text-2xl border ${
                    score?.pct >= 70 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  }`}>{score?.pct}%</div>
                )}
                <button onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-300 text-xs font-semibold hover:text-white transition cursor-pointer">
                  <RotateCcw className="h-3.5 w-3.5" /> New Quiz
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[['Questions', quiz.questions.length],['Answered',Object.keys(answers).length],['Status',submitted?'Graded':'In Progress']].map(([l,v])=>(
                <div key={l} className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">{l}</div>
                  <div className="text-lg font-bold text-white mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          {quiz.questions.map((q, qi) => {
            const selected = answers[qi];
            const correct  = q.correctIndex ?? q.correctAnswerIndex;
            return (
              <div key={qi} className="bg-[#111111] border border-[#252525] rounded-[24px] p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center">{qi+1}</span>
                  <p className="text-white font-semibold text-sm leading-relaxed">{q.question}</p>
                </div>
                <div className="space-y-2.5 pl-10">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrect  = submitted && oi === correct;
                    const isWrong    = submitted && isSelected && oi !== correct;
                    return (
                      <button key={oi} onClick={() => !submitted && setAnswers(a => ({...a,[qi]:oi}))}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all cursor-pointer ${
                          isCorrect ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                            : isWrong ? 'border-rose-500/60 bg-rose-500/10 text-rose-300'
                            : isSelected ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-[#2a2a2a] bg-[#0d0d0d] text-slate-300 hover:border-amber-500/40 hover:text-white'
                        }`}>
                        <span className="flex items-center justify-between gap-3">
                          <span>{String.fromCharCode(65+oi)}. {opt}</span>
                          {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                          {isWrong   && <AlertCircle  className="h-4 w-4 text-rose-400 shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="mt-4 pl-10 p-3 bg-[#0d1117] border border-[#1e2530] rounded-xl text-slate-400 text-xs leading-relaxed">
                    <span className="text-slate-300 font-semibold">Explanation: </span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit / retry */}
          {!submitted ? (
            <button onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold py-4 rounded-2xl hover:from-amber-400 hover:to-orange-400 transition shadow-[0_8px_30px_rgba(245,158,11,0.3)] cursor-pointer">
              <CheckCircle2 className="h-5 w-5" /> Submit Quiz & See Results
            </button>
          ) : (
            <button onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-stone-100 transition cursor-pointer">
              <RotateCcw className="h-5 w-5" /> Generate Another Quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}
