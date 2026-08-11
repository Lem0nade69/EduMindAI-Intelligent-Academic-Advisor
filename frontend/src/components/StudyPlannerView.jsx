import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Sparkles, Plus, Trash2, Loader2, AlertCircle,
  CheckCircle2, Clock, BookOpen, ChevronDown, ChevronUp, BarChart3, Flame
} from 'lucide-react';
import { aiApi, studyPlansApi } from '../services/apiService';

const DAY_COLORS = {
  high:   'border-rose-500/40 bg-rose-500/10 text-rose-300',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  low:    'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  study:  'border-blue-500/40 bg-blue-500/10 text-blue-300',
};

const SUBJECT_OPTIONS = [
  'Data Structures','Algorithms','Database Systems','Computer Architecture',
  'Software Engineering','Operating Systems','Computer Networks',
  'Discrete Mathematics','Complex Variables','Digital Electronics',
];

export default function StudyPlannerView({ user }) {
  const [plans, setPlans]             = useState([]);
  const [activePlan, setActivePlan]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [error, setError]             = useState('');
  const [expandedDay, setExpandedDay] = useState(0);

  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [customSubject, setCustomSubject]        = useState('');
  const [examDates, setExamDates]               = useState({});
  const [dailyHours, setDailyHours]             = useState(3);

  useEffect(() => {
    Promise.all([studyPlansApi.list(), studyPlansApi.active()])
      .then(([listData, activeData]) => {
        setPlans(listData.data?.plans || []);
        setActivePlan(activeData.data?.plan || null);
      })
      .catch(() => { setPlans([]); setActivePlan(null); })
      .finally(() => setLoading(false));
  }, []);

  const toggleSubject = (sub) => {
    setSelectedSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const addCustomSubject = () => {
    if (customSubject.trim() && !selectedSubjects.includes(customSubject.trim())) {
      setSelectedSubjects(prev => [...prev, customSubject.trim()]);
      setCustomSubject('');
    }
  };

  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject.');
      return;
    }
    setGenerating(true); setError('');

    try {
      const data = await aiApi.generateStudyPlan({
        subjects: selectedSubjects,
        examDates,
        dailyHours,
      });

      const planData = data.data;
      if (!planData?.planItems?.length) throw new Error('AI returned an empty plan. Please try again.');

      // Save plan to backend
      const saved = await studyPlansApi.save({
        title: `Study Plan — ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`,
        totalWeeklyHours: planData.totalWeeklyHours,
        riskAssessment: planData.riskAssessment,
        subjects: selectedSubjects,
        examDates,
        dailyHours,
        planItems: planData.planItems,
      });

      const newPlan = saved.data?.plan || { id:'local_'+Date.now(), planItems: planData.planItems, riskAssessment: planData.riskAssessment, subjects: selectedSubjects, progress:{} };
      setActivePlan(newPlan);
      setPlans(prev => [newPlan, ...prev]);
      setShowForm(false);
      setExpandedDay(0);
    } catch (err) {
      setError(err.message || 'Failed to generate study plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkDay = async (dayKey) => {
    if (!activePlan) return;
    const alreadyDone = activePlan.progress?.[dayKey];
    try {
      const data = await studyPlansApi.updateProgress(activePlan.id, dayKey, !alreadyDone);
      setActivePlan(prev => ({ ...prev, progress: { ...(prev.progress || {}), [dayKey]: !alreadyDone } }));
    } catch (_) {
      setActivePlan(prev => ({ ...prev, progress: { ...(prev.progress || {}), [dayKey]: !alreadyDone } }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this study plan?')) return;
    try { await studyPlansApi.delete(id); } catch (_) {}
    setPlans(prev => prev.filter(p => p.id !== id));
    if (activePlan?.id === id) setActivePlan(null);
  };

  const completedDays = Object.values(activePlan?.progress || {}).filter(Boolean).length;
  const totalDays     = (activePlan?.plan_items || activePlan?.planItems || []).length;
  const progressPct   = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;
  const planItems     = activePlan?.plan_items || activePlan?.planItems || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-400" /> AI Study Planner
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Get a personalised 7-day study schedule powered by Gemini AI.</p>
        </div>
        <button onClick={() => { setShowForm(f => !f); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 text-sm font-semibold hover:bg-orange-500/30 transition cursor-pointer">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'New Plan'}
        </button>
      </div>

      {/* Generation Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-1">Generate with Gemini AI</p>
            <h3 className="text-lg font-bold text-white mb-5">Build your personalised study plan</h3>

            {/* Subjects */}
            <div className="mb-5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Select Subjects</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SUBJECT_OPTIONS.map(sub => (
                  <button key={sub} onClick={() => toggleSubject(sub)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      selectedSubjects.includes(sub)
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-[#2a2a2a] bg-[#0d0d0d] text-slate-400 hover:border-orange-500/50 hover:text-orange-300'
                    }`}>{sub}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                  placeholder="Add custom subject..."
                  className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition" />
                <button onClick={addCustomSubject}
                  className="px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-300 text-sm hover:text-white transition cursor-pointer">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedSubjects.map(s => (
                    <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/15 border border-orange-500/30 rounded-full text-orange-300 text-xs font-semibold">
                      {s}
                      <button onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))} className="hover:text-white cursor-pointer">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Daily hours */}
            <div className="mb-5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Daily Study Hours: <span className="text-orange-400 font-bold">{dailyHours}h</span>
              </label>
              <input type="range" min="1" max="10" value={dailyHours} onChange={e => setDailyHours(Number(e.target.value))}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>1h (Light)</span><span>5h (Moderate)</span><span>10h (Intensive)</span>
              </div>
            </div>

            {/* Exam dates */}
            <div className="mb-5">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Exam Dates <span className="text-slate-600">(optional — helps AI prioritise)</span>
              </label>
              <div className="space-y-2">
                {selectedSubjects.map(sub => (
                  <div key={sub} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-40 shrink-0 truncate">{sub}</span>
                    <input type="date" value={examDates[sub] || ''}
                      onChange={e => setExamDates(prev => ({ ...prev, [sub]: e.target.value }))}
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 transition" />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating || selectedSubjects.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold py-3.5 rounded-2xl hover:from-orange-400 disabled:opacity-50 transition shadow-[0_8px_30px_rgba(249,115,22,0.3)] cursor-pointer">
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating 7-day plan with Gemini AI...</>
                : <><Sparkles className="h-4 w-4" /> Generate My Study Plan</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your plans...
        </div>
      )}

      {/* Active Plan Viewer */}
      {!loading && activePlan && !showForm && (
        <div className="space-y-4">
          {/* Plan header */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-orange-400 font-bold">Active Plan</p>
                <h3 className="text-lg font-bold text-white mt-1">{activePlan.title || 'My Study Plan'}</h3>
                {activePlan.risk_assessment || activePlan.riskAssessment ? (
                  <p className="text-slate-400 text-sm mt-1 max-w-lg leading-relaxed">
                    {activePlan.risk_assessment || activePlan.riskAssessment}
                  </p>
                ) : null}
              </div>
              <button onClick={() => handleDelete(activePlan.id)}
                className="p-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{completedDays} / {totalDays} days completed</span>
                <span className="font-bold text-orange-400">{progressPct}%</span>
              </div>
              <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                ['Total Days', totalDays, Calendar],
                ['Daily Hours', `${activePlan.daily_hours || activePlan.dailyHours || 3}h`, Clock],
                ['Subjects', (activePlan.subjects || []).length, BookOpen],
              ].map(([label, value, Icon]) => (
                <div key={label} className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 text-center">
                  <Icon className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{value}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Day-by-day schedule */}
          <div className="space-y-3">
            {planItems.map((day, di) => {
              const dayKey = `day_${di + 1}`;
              const done   = activePlan.progress?.[dayKey];
              const isOpen = expandedDay === di;
              const sessions = day.sessions || [];

              return (
                <div key={di} className={`bg-[#111111] border rounded-[22px] overflow-hidden transition ${done ? 'border-emerald-500/30' : 'border-[#2a2a2a]'}`}>
                  <button onClick={() => setExpandedDay(isOpen ? -1 : di)}
                    className="w-full flex items-center justify-between px-5 py-4 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${
                        done ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      }`}>{done ? '✓' : di+1}</div>
                      <div className="text-left">
                        <p className="font-bold text-white text-sm">{day.day}</p>
                        <p className="text-[10px] text-slate-500">{sessions.length} sessions · {sessions.reduce((s,ss) => s + (ss.duration||0), 0)} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); handleMarkDay(dayKey); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          done ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
                               : 'border-[#333] text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400'
                        }`}>
                        {done ? '✓ Done' : 'Mark Done'}
                      </button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                        exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                        className="px-5 pb-5 space-y-2 overflow-hidden border-t border-[#1a1a1a]">
                        <div className="pt-4 space-y-2">
                          {sessions.map((session, si) => (
                            <div key={si}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${DAY_COLORS[session.priority] || DAY_COLORS.study}`}>
                              <div className="shrink-0">
                                <Clock className="h-4 w-4 mt-0.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold truncate">{session.subject}</p>
                                  <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 opacity-70">{session.duration} min</span>
                                </div>
                                <p className="text-xs opacity-80 mt-0.5">{session.topic}</p>
                                {session.notes && <p className="text-xs opacity-60 mt-1 italic">{session.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No plans yet */}
      {!loading && !activePlan && plans.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-500">
          <Calendar className="h-14 w-14 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg text-slate-400">No study plan yet</p>
          <p className="text-sm mt-1">Click "New Plan" to generate a personalised 7-day schedule with Gemini AI.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 font-semibold hover:bg-orange-500/30 transition cursor-pointer">
            <Sparkles className="h-4 w-4" /> Generate My First Plan
          </button>
        </div>
      )}
    </div>
  );
}
