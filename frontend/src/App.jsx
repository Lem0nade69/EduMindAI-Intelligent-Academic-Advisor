import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, LayoutDashboard, MessageSquare, Calendar,
  BookOpen, Layers, Compass, Clock, CheckSquare, ShieldAlert,
  Settings as SettingsIcon, LogOut, Menu, X, Bell, Sparkles
} from 'lucide-react';

import { authApi, clearTokens, notificationsApi } from './services/apiService';
import AuthScreen          from './components/AuthScreen';
import DashboardView       from './components/DashboardView';
import ChatView            from './components/ChatView';
import StudyPlannerView    from './components/StudyPlannerView';
import QuizGeneratorView   from './components/QuizGeneratorView';
import FlashcardsView      from './components/FlashcardsView';
import ResourceRecommenderView from './components/ResourceRecommenderView';
import FocusTimerView      from './components/FocusTimerView';
import TaskTrackerView     from './components/TaskTrackerView';
import AdminPanelView      from './components/AdminPanelView';
import SettingsView        from './components/SettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('edumind_current_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activeTab, setActiveTab]       = useState(() => localStorage.getItem('edumind_active_tab') || 'dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);

  // Local state (kept for backward compat with child components)
  const [tasks, setTasks] = useState(() => {
    const s = localStorage.getItem('edumind_academic_tasks');
    return s ? JSON.parse(s) : [];
  });
  const [weakAreas, setWeakAreas] = useState(() => {
    const s = localStorage.getItem('edumind_weakness_reports');
    return s ? JSON.parse(s) : [];
  });

  useEffect(() => { localStorage.setItem('edumind_academic_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('edumind_weakness_reports', JSON.stringify(weakAreas)); }, [weakAreas]);
  useEffect(() => { localStorage.setItem('edumind_active_tab', activeTab); }, [activeTab]);

  // Poll notification count every 60s
  useEffect(() => {
    if (!currentUser) return;
    const fetchCount = () => notificationsApi.count().then(d => setUnreadCount(d.data?.unreadCount || 0)).catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => clearInterval(t);
  }, [currentUser]);

  // Listen for session expiry
  useEffect(() => {
    const handler = () => handleLogout(true);
    window.addEventListener('edumind:logout', handler);
    return () => window.removeEventListener('edumind:logout', handler);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('edumind_current_user', JSON.stringify(user));
  };

  const handleLogout = async (silent = false) => {
    if (!silent && !window.confirm('Are you sure you want to sign out?')) return;
    try { await authApi.logout(); } catch (_) {}
    clearTokens();
    setCurrentUser(null);
    localStorage.removeItem('edumind_current_user');
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = (updated) => {
    const merged = { ...currentUser, ...updated };
    setCurrentUser(merged);
    localStorage.setItem('edumind_current_user', JSON.stringify(merged));
  };

  const handleAddTask = (t) => setTasks(prev => [t, ...prev]);
  const handleToggleComplete = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const handleDeleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const handleQuizCompleted = (report) => {
    const isWeak = report.scorePercentage < 70;
    const idx    = weakAreas.findIndex(w => w.subject === report.subject && w.topic === report.topic);
    if (isWeak) {
      const newWeak = { id:'weak_'+Date.now(), subject:report.subject, topic:report.topic, scorePercentage:report.scorePercentage, totalQuizzesTaken:1, recommendation:`Review ${report.topic} with flashcards or the AI Advisor.` };
      if (idx !== -1) { const u=[...weakAreas]; u[idx]={...u[idx],...newWeak,totalQuizzesTaken:u[idx].totalQuizzesTaken+1}; setWeakAreas(u); }
      else setWeakAreas(prev => [newWeak, ...prev]);
    } else {
      if (idx !== -1) setWeakAreas(prev => prev.filter((_,i) => i !== idx));
    }
  };

  if (!currentUser) return <AuthScreen onLoginSuccess={handleLoginSuccess} />;

  const menuItems = [
    { id:'dashboard',   label:'Dashboard',           icon:LayoutDashboard, role:'all' },
    { id:'chatbot',     label:'AI Advisor',           icon:MessageSquare,   role:'all' },
    { id:'planner',     label:'Study Planner',        icon:Calendar,        role:'all' },
    { id:'quiz',        label:'Quiz Builder',         icon:BookOpen,        role:'all' },
    { id:'flashcards',  label:'Flashcards',           icon:Layers,          role:'all' },
    { id:'recommender', label:'Resource Finder',      icon:Compass,         role:'all' },
    { id:'timer',       label:'Focus Timer',          icon:Clock,           role:'all' },
    { id:'tasks',       label:'Task Tracker',         icon:CheckSquare,     role:'all' },
    { id:'admin',       label:'Admin Panel',          icon:ShieldAlert,     role:'admin' },
    { id:'settings',    label:'Settings',             icon:SettingsIcon,    role:'all' },
  ].filter(i => i.role === 'all' || currentUser.role === i.role);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f5f0eb] flex flex-col md:flex-row relative">
      {/* Mobile header */}
      <div className="md:hidden bg-[#111111] border-b border-[#2a2a2a] px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-white" />
          <h1 className="font-extrabold text-base tracking-tight uppercase text-white">EduMind AI</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 text-slate-300">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`bg-[#111111] text-slate-300 w-64 md:sticky md:top-0 h-screen shrink-0 flex flex-col justify-between border-r border-[#2a2a2a] z-45 md:z-auto absolute md:relative transition-all ${
        mobileMenuOpen ? 'left-0' : '-left-64 md:left-0'
      }`}>
        <div className="space-y-5 pt-6">
          {/* Logo */}
          <div className="px-6 flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-xl text-black">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-black text-white text-xl tracking-tight uppercase leading-none">EDUMIND AI</h1>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase font-bold flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-amber-400" /> Powered by Gemini
              </span>
            </div>
          </div>

          {/* User card */}
          <div className="px-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-[#333] shrink-0 bg-[#222] flex items-center justify-center text-white font-bold text-sm">
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : (currentUser.name?.[0] || 'U')}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-bold text-white line-clamp-1">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{currentUser.role}</div>
              </div>
              {unreadCount > 0 && (
                <span className="shrink-0 w-5 h-5 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5 px-3">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all justify-start cursor-pointer ${
                    isActive ? 'text-black font-black' : 'hover:bg-[#1e1e1e] text-[#888] hover:text-[#f5f0eb]'
                  }`}>
                  {isActive && (
                    <motion.div layoutId="sidebar-highlight"
                      className="absolute inset-0 bg-white rounded-xl z-0"
                      transition={{ type:'spring', stiffness:380, damping:30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sign out */}
        <div className="p-4 border-t border-[#2a2a2a]">
          <button onClick={() => handleLogout(false)}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-rose-950/40 border border-[#333] hover:border-rose-900 text-[#888] hover:text-rose-400 rounded-xl py-2 px-3 text-xs font-semibold tracking-wide transition cursor-pointer">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            transition={{ duration:0.15 }} className="w-full">

            {activeTab === 'dashboard' && (
              <DashboardView user={currentUser} tasks={tasks} weakAreas={weakAreas}
                onNavigate={setActiveTab} onRefreshDiagnostics={() => {}} />
            )}
            {activeTab === 'chatbot'    && <ChatView user={currentUser} />}
            {activeTab === 'planner'   && <StudyPlannerView user={currentUser} />}
            {activeTab === 'quiz'      && <QuizGeneratorView user={currentUser} onQuizCompleted={handleQuizCompleted} />}
            {activeTab === 'flashcards'&& <FlashcardsView user={currentUser} />}
            {activeTab === 'recommender'&&<ResourceRecommenderView user={currentUser} />}
            {activeTab === 'timer'     && <FocusTimerView user={currentUser} tasks={tasks} onToggleComplete={handleToggleComplete} onAddTask={handleAddTask} />}
            {activeTab === 'tasks'     && <TaskTrackerView user={currentUser} tasks={tasks} onAddTask={handleAddTask} onToggleComplete={handleToggleComplete} onDeleteTask={handleDeleteTask} />}
            {activeTab === 'admin' && currentUser.role === 'admin' && <AdminPanelView user={currentUser} />}
            {activeTab === 'settings'  && <SettingsView user={currentUser} onUpdateProfile={handleUpdateProfile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
