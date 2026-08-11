/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Calendar, BookOpen, MessageSquare, Timer, ChevronRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 26 }
  }
};

function useCountUp(target, duration = 1600, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      startTimeRef.current = null;
      const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuart for a satisfying deceleration
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(eased * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

export default function DashboardView({ user, tasks, weakAreas, onNavigate, onRefreshDiagnostics }) {
  const animatedHours = useCountUp(15, 1400, 300);
  const animatedSyllabus = useCountUp(92, 1600, 500);
  const animatedStreak = useCountUp(user.streak || 3, 1200, 700);


  const quickLinks = [
    { id: 'chatbot', label: 'AI Advisor', sub: '24/7 Tutoring', icon: MessageSquare, color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 hover:border-blue-400/50', iconColor: 'text-blue-400' },
    { id: 'planner', label: 'Study Planner', sub: 'Plan your week', icon: Calendar, color: 'from-violet-500/20 to-violet-600/5 border-violet-500/20 hover:border-violet-400/50', iconColor: 'text-violet-400' },
    { id: 'quiz', label: 'Quiz Builder', sub: 'Test yourself', icon: BookOpen, color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-400/50', iconColor: 'text-emerald-400' },
    { id: 'timer', label: 'Focus Timer', sub: 'Pomodoro sessions', icon: Timer, color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 hover:border-amber-400/50', iconColor: 'text-amber-400' },
  ];

  return (
    <motion.div
      id="dashboard_view"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero: STUDY TO WIN */}
      <motion.div
        variants={itemVariants}
        className="bg-[#161616] rounded-[32px] p-8 md:p-12 border border-[#2a2a2a] shadow-xl flex flex-col justify-between relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-900/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-xs font-bold uppercase tracking-[2px] text-[#f97316] mb-4"
          >
            AISTUDIO ACADEMIC ENGINE
          </motion.div>
          <motion.h2
            id="welcome_message"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="font-extrabold text-[#f5f0eb] leading-none tracking-tighter mb-4"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, textShadow: '0 0 18px rgba(249,115,22,0.85), 0 0 36px rgba(249,115,22,0.45)' }}
          >
            STUDY TO <span className="text-[#f97316] italic">WIN.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed font-medium"
          >
            Plan your win, <span className="text-[#ffffff] font-bold">{user.name}</span>. Welcome back to <strong>EduMind AI</strong>. Track exams, generate custom revision plans, and unlock peak academic performance.
          </motion.p>
        </div>
        <div className="stats-row flex flex-wrap gap-8 md:gap-14 mt-8 pt-8 border-t border-[#2a2a2a] relative z-10">
          <motion.div
            className="stat-item"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          >
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Weekly Roster Plan</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              <motion.span
                key={animatedHours}
                initial={{ opacity: 0.7, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.08 }}
                style={{ display: 'inline-block' }}
              >
                {animatedHours}
              </motion.span>{' '}Hours
            </div>
          </motion.div>
          <motion.div
            className="stat-item"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
          >
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Syllabus Strides</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              <motion.span
                key={animatedSyllabus}
                initial={{ opacity: 0.7, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.08 }}
                style={{ display: 'inline-block' }}
              >
                {animatedSyllabus}%
              </motion.span>{' '}SAFE
            </div>
          </motion.div>
          <motion.div
            className="stat-item"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
          >
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Active Streak</div>
            <div id="streak_counter" className="text-2xl sm:text-3xl font-black text-[#f97316] font-mono">
              <motion.span
                key={animatedStreak}
                initial={{ opacity: 0.7, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.08 }}
                style={{ display: 'inline-block' }}
              >
                {animatedStreak}
              </motion.span>{' '}DAYS
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Navigation Buttons */}
      <motion.div variants={itemVariants}>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-3 px-1">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <motion.button
                key={link.id}
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 22,
                  delay: idx * 0.09,
                }}
                whileHover={{
                  scale: 1.06,
                  y: -6,
                  transition: { type: 'spring', stiffness: 400, damping: 18 },
                }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onNavigate(link.id)}
                className={`bg-gradient-to-br ${link.color} border rounded-[24px] p-5 text-left transition-colors duration-200 cursor-pointer group shadow-lg`}
              >
                <div className={`w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4 ${link.iconColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-bold text-sm text-slate-100">{link.label}</div>
                <div className="text-[11px] text-slate-500 mt-1">{link.sub}</div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>


    </motion.div>
  );
}

