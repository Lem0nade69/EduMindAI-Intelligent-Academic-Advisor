import React, { useState } from 'react';
import { ArrowRight, UserPlus, LogIn, GraduationCap, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi, setTokens } from '../services/apiService';
import './AuthScreen.css';

export default function AuthScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [semester, setSemester] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('Please fill in email and password.'); return; }
    if (mode === 'signup' && !name.trim()) { setErrorMsg('Please enter your name.'); return; }

    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await authApi.login({ email, password });
      } else {
        data = await authApi.register({
          name, email, password, department,
          semester: semester ? parseInt(semester) : undefined,
          university: 'Northern University of Business and Technology',
          adminCode: adminCode || undefined,
        });
      }

      // Persist tokens
      setTokens(data.data.accessToken, data.data.refreshToken);

      // Pass user object to App
      onLoginSuccess({
        ...data.data.user,
        accessToken: data.data.accessToken,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-bg min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-[28px] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-white rounded-xl">
            <GraduationCap className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="font-black text-white text-xl tracking-tight uppercase">EduMind AI</h1>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Academic Advisor</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          {mode === 'login' ? 'Sign in to your EduMind AI account.' : 'Join EduMind AI — your AI-powered learning assistant.'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Fahim Rahman"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/40 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/40 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/40 transition"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Department</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition">
                    <option value="CSE">CSE</option>
                    <option value="EEE">EEE</option>
                    <option value="BBA">BBA</option>
                    <option value="English">English</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Semester</label>
                  <input type="number" min="1" max="12" value={semester} onChange={e => setSemester(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/40 transition" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Admin Code <span className="text-slate-600">(optional)</span></label>
                <input type="text" value={adminCode} onChange={e => setAdminCode(e.target.value)}
                  placeholder="Leave blank for student account"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/40 transition" />
              </div>
            </>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-slate-100 disabled:opacity-60 transition"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              <>{mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}</>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setErrorMsg(''); }}
                className="text-white font-semibold hover:underline">Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setErrorMsg(''); }}
                className="text-white font-semibold hover:underline">Sign in</button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
