/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Check,
  Edit2,
  Trophy,
  Flame,
  Sparkles,
  Music,
  Volume2,
  Trash2,
  Maximize2,
  ExternalLink
} from 'lucide-react';

export default function FocusTimerView({ user, tasks: propTasks, onToggleComplete, onAddTask }) {
  // Preset AI Focus Configurations
  const timingPresets = [
    { name: 'Core Revision Block', focusMin: 25, restMin: 5, description: 'Best for reviewing terminology notes and vocabulary flashcards successfully.' },
    { name: 'Heavy Programming Lab', focusMin: 50, restMin: 10, description: 'Optimal duration for uninterrupted coding loops and compilation debugs.' },
    { name: 'Mathematical Derivation', focusMin: 40, restMin: 8, description: 'Excellent fit for solving complex equations and circuit gain formulas.' }
  ];

  // Local Task Fallback in case props are not passed
  const [localTasks, setLocalTasks] = useState(() => {
    const stored = localStorage.getItem('edumind_academic_tasks');
    return stored ? JSON.parse(stored) : [];
  });

  const activeTasks = propTasks || localTasks;

  // Local active task focus ID (default: first incomplete task)
  const [focusTaskId, setFocusTaskId] = useState(() => {
    const stored = localStorage.getItem('edumind_focus_active_id');
    if (stored) return stored;
    const firstIncomplete = (propTasks || localTasks || []).find(t => !t.completed);
    return firstIncomplete ? firstIncomplete.id : '';
  });

  // Track state
  const [activePresetIdx, setActivePresetIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isFocusingMode, setIsFocusingMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [sessionGoal, setSessionGoal] = useState(4);
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Daily stats state
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(() => {
    return parseInt(localStorage.getItem('edumind_focus_daily_goal') || '60');
  });
  const [streakDays, setStreakDays] = useState(() => {
    return parseInt(localStorage.getItem('edumind_focus_streak') || '0');
  });
  const [yesterdayMinutes, setYesterdayMinutes] = useState(() => {
    return parseInt(localStorage.getItem('edumind_focus_yesterday') || '0');
  });
  const [completedMinutesToday, setCompletedMinutesToday] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('edumind_focus_last_date');
    if (lastDate === todayStr) {
      return parseInt(localStorage.getItem('edumind_focus_completed_today') || '0');
    }
    return 0;
  });

  // Show inline editor for daily goals
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInputVal, setGoalInputVal] = useState(dailyGoalMinutes);

  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Audio Player States
  const [musicMode, setMusicMode] = useState('embed'); // 'embed' or 'ambient'
  const [playingAmbient, setPlayingAmbient] = useState({
    lofi: false,
    rain: false,
    cafe: false,
    noise: false
  });
  const [volumes, setVolumes] = useState({
    lofi: 50,
    rain: 30,
    cafe: 20,
    noise: 15
  });

  const timerRef = useRef(null);
  const audioPlayers = useRef({});

  const activePreset = timingPresets[activePresetIdx];
  const totalSecondsAllocated = (isFocusingMode ? activePreset.focusMin : activePreset.restMin) * 60;

  // Sound loops configurations
  const soundUrls = {
    lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    rain: 'https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav',
    cafe: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    noise: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  };

  // Sync active task focus target
  useEffect(() => {
    if (focusTaskId) {
      localStorage.setItem('edumind_focus_active_id', focusTaskId);
    }
  }, [focusTaskId]);

  // If focus task gets completed, pick the next incomplete one
  useEffect(() => {
    const activeTask = activeTasks.find(t => t.id === focusTaskId);
    if (!activeTask || activeTask.completed) {
      const nextIncomplete = activeTasks.find(t => !t.completed);
      if (nextIncomplete) {
        setFocusTaskId(nextIncomplete.id);
      } else {
        setFocusTaskId('');
      }
    }
  }, [activeTasks, focusTaskId]);

  // Preset configuration change
  useEffect(() => {
    setIsRunning(false);
    setIsFocusingMode(true);
    setSecondsRemaining(activePreset.focusMin * 60);
  }, [activePresetIdx]);

  // Timer Tick Core Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Focus completed
            setIsRunning(false);
            clearInterval(timerRef.current);

            if (isFocusingMode) {
              // Complete focus session
              const addedMinutes = activePreset.focusMin;
              const newTotal = completedMinutesToday + addedMinutes;
              setCompletedMinutesToday(newTotal);

              // Update localStorage
              const todayStr = new Date().toISOString().split('T')[0];
              localStorage.setItem('edumind_focus_completed_today', String(newTotal));
              localStorage.setItem('edumind_focus_last_date', todayStr);

              // Log activities locally
              logActivity(
                user.id,
                user.name,
                'Focus Period Done',
                `Finished focus session ${sessionCount}/${sessionGoal} using preset: ${activePreset.name}`
              );

              // Update total study slots completed count
              const totalSlots = parseInt(localStorage.getItem('edumind_sessions_completed') || '0') + 1;
              localStorage.setItem('edumind_sessions_completed', String(totalSlots));

              // Streak updater logic
              updateStreak();

              alert(`Focus Session #${sessionCount} Completed! Fantastic work. Take a ${activePreset.restMin} minute break.`);

              // Increment session count
              if (sessionCount < sessionGoal) {
                setSessionCount(prev => prev + 1);
              } else {
                setSessionCount(1); // Cycle wraps around
              }

              setIsFocusingMode(false);
              return activePreset.restMin * 60;
            } else {
              alert('Break completed! Ready to lock back into focusing?');
              setIsFocusingMode(true);
              return activePreset.focusMin * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isFocusingMode, activePresetIdx, sessionCount, sessionGoal, completedMinutesToday]);

  // Clean up audio players on unmount
  useEffect(() => {
    return () => {
      Object.values(audioPlayers.current).forEach(audio => {
        if (audio) {
          audio.pause();
        }
      });
    };
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining((isFocusingMode ? activePreset.focusMin : activePreset.restMin) * 60);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (isFocusingMode) {
      setIsFocusingMode(false);
      setSecondsRemaining(activePreset.restMin * 60);
    } else {
      setIsFocusingMode(true);
      setSecondsRemaining(activePreset.focusMin * 60);
      if (sessionCount < sessionGoal) {
        setSessionCount(prev => prev + 1);
      } else {
        setSessionCount(1);
      }
    }
  };

  const updateStreak = () => {
    const lastDateWithProgress = localStorage.getItem('edumind_focus_streak_last_date');
    const todayStr = new Date().toISOString().split('T')[0];

    if (lastDateWithProgress !== todayStr) {
      let currentStreak = streakDays;
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (lastDateWithProgress === yesterdayStr) {
        currentStreak += 1;
      } else if (!lastDateWithProgress) {
        currentStreak = 1;
      }

      setStreakDays(currentStreak);
      localStorage.setItem('edumind_focus_streak', String(currentStreak));
      localStorage.setItem('edumind_focus_streak_last_date', todayStr);
    }
  };

  const logActivity = (userId, userName, action, details) => {
    const storedLogs = localStorage.getItem('edumind_activity_logs');
    const logs = storedLogs ? JSON.parse(storedLogs) : [];
    const newLog = {
      id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem('edumind_activity_logs', JSON.stringify(logs.slice(0, 100)));
  };

  // Human readable time
  const formatTimeStr = (secs) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Math coordinates generator for radial ticks
  const generateRadialTicks = (numTicks = 60) => {
    const ticks = [];
    for (let i = 0; i < numTicks; i++) {
      const angle = (i * 360 / numTicks) - 90; // Start at 12 o'clock
      const theta = (angle * Math.PI) / 180;
      const r1 = 80; // Inner radius
      const r2 = 92; // Outer radius
      const x1 = 120 + r1 * Math.cos(theta);
      const y1 = 120 + r1 * Math.sin(theta);
      const x2 = 120 + r2 * Math.cos(theta);
      const y2 = 120 + r2 * Math.sin(theta);
      ticks.push({ x1, y1, x2, y2 });
    }
    return ticks;
  };

  const radialTicks = generateRadialTicks(60);
  const progressRatio = secondsRemaining / totalSecondsAllocated;
  const activeTicksCount = Math.ceil(progressRatio * 60);

  // Synced Task Handlers
  const handleTaskCheckToggle = (id) => {
    if (onToggleComplete) {
      onToggleComplete(id);
    } else {
      const updated = localTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setLocalTasks(updated);
      localStorage.setItem('edumind_academic_tasks', JSON.stringify(updated));
    }
  };

  const handleAddTaskSubmit = () => {
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: 'task_' + Date.now(),
      title: newTaskTitle.trim(),
      description: 'Added from Focus session',
      courseId: activePreset.name,
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      type: 'revision'
    };

    if (onAddTask) {
      onAddTask(newTask);
    } else {
      const updated = [newTask, ...localTasks];
      setLocalTasks(updated);
      localStorage.setItem('edumind_academic_tasks', JSON.stringify(updated));
    }

    setNewTaskTitle('');
    if (!focusTaskId) {
      setFocusTaskId(newTask.id);
    }
  };

  // Soundscape Board Control
  const handleToggleAmbient = (type) => {
    const isPlaying = !playingAmbient[type];
    setPlayingAmbient(prev => ({ ...prev, [type]: isPlaying }));

    let audio = audioPlayers.current[type];
    if (!audio) {
      audio = new Audio(soundUrls[type]);
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      audioPlayers.current[type] = audio;
    }

    audio.volume = volumes[type] / 100;

    if (isPlaying) {
      audio.play().catch(err => {
        console.warn('Audio play blocked or unavailable. Interactive gesture required first.', err);
        setPlayingAmbient(prev => ({ ...prev, [type]: false }));
      });
    } else {
      audio.pause();
    }
  };

  const handleAmbientVolumeChange = (type, val) => {
    setVolumes(prev => ({ ...prev, [type]: val }));
    const audio = audioPlayers.current[type];
    if (audio) {
      audio.volume = val / 100;
      if (val > 0 && !playingAmbient[type]) {
        audio.play().catch(() => {});
        setPlayingAmbient(prev => ({ ...prev, [type]: true }));
      } else if (val === 0 && playingAmbient[type]) {
        audio.pause();
        setPlayingAmbient(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const handleSaveGoal = () => {
    const goalVal = parseInt(goalInputVal);
    if (!isNaN(goalVal) && goalVal > 0) {
      setDailyGoalMinutes(goalVal);
      localStorage.setItem('edumind_focus_daily_goal', String(goalVal));
      setIsEditingGoal(false);
    }
  };

  // Percent calculation for donut chart
  const progressPercent = Math.min(Math.round((completedMinutesToday / dailyGoalMinutes) * 100), 100);
  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutStrokeOffset = donutCircumference - (progressPercent / 100) * donutCircumference;

  // Selected active focusing task object details
  const currentFocusingTask = activeTasks.find(t => t.id === focusTaskId);

  return (
    <div id="focus_timer_view" className="space-y-6 max-w-5xl mx-auto text-zinc-100">
      
      {/* 1. Pill Presets AI Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161616]/90 p-4 rounded-2xl border border-[#242424] shadow-sm backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase animate-fade-in" style={{ color: 'var(--ink)' }}>AI Suggested Presets</h2>
            <p className="text-[10px] text-zinc-400">Click a preset to load specialized study block times</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {timingPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setActivePresetIdx(idx)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                idx === activePresetIdx
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/10'
                  : 'bg-[#202020] text-zinc-400 hover:text-white border border-[#2b2b2b] hover:bg-[#252525]'
              }`}
            >
              {preset.name} ({preset.focusMin}m / {preset.restMin}m)
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= COLUMN 1 ================= */}
        <div className="space-y-6">

          {/* CARD A: FOCUS PERIOD TIMER */}
          <div className="bg-[#161616] rounded-2xl border border-[#242424] p-6 flex flex-col items-center relative overflow-hidden shadow-md">
            
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-xs font-black tracking-wider uppercase text-zinc-400">
                {isFocusingMode ? `Focus period (${sessionCount} of ${sessionGoal})` : 'Break Interval'}
              </span>
              <div className="flex items-center gap-2 text-zinc-400">
                <button
                  onClick={() => setShowGoalInput(!showGoalInput)}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Configure session count goal"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Inline Goal Editor */}
            {showGoalInput && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#202020] p-3 rounded-xl border border-[#2a2a2a] w-full mb-4 flex items-center justify-between gap-2 text-xs"
              >
                <span>Focus loops goal:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="bg-[#161616] border border-[#333] rounded px-2 py-1 w-14 text-center font-bold text-white focus:outline-hidden"
                    value={sessionGoal}
                    onChange={(e) => setSessionGoal(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    onClick={() => setShowGoalInput(false)}
                    className="bg-orange-500 text-black px-2.5 py-1 rounded font-bold hover:bg-orange-400 transition-colors"
                  >
                    Set
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Glowing Dial Radial Ticks SVG */}
            <div className="relative w-60 h-60 flex items-center justify-center mb-6">
              <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full">
                <defs>
                  <filter id="glow-coral" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-teal" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Draw 60 clock ticks */}
                {radialTicks.map((tick, i) => {
                  const isActive = i < activeTicksCount;
                  let strokeColor = '#242424'; // Inactive tick color

                  if (isActive) {
                    strokeColor = isFocusingMode ? '#f87171' : '#10b981'; // Coral for Focus, Teal for Rest
                  }

                  return (
                    <line
                      key={i}
                      x1={tick.x1}
                      y1={tick.y1}
                      x2={tick.x2}
                      y2={tick.y2}
                      stroke={strokeColor}
                      strokeWidth={isActive ? '3.5' : '2'}
                      strokeLinecap="round"
                      filter={isActive ? (isFocusingMode ? 'url(#glow-coral)' : 'url(#glow-teal)') : ''}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              {/* Central Time Numbers Overlay */}
              <div className="relative z-10 text-center flex flex-col justify-center items-center">
                <motion.div
                  id="timer_countdown_display"
                  animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="text-4xl font-extrabold font-mono tracking-wider text-white"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {formatTimeStr(secondsRemaining)}
                </motion.div>
                <div
                  className="text-[9px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isFocusingMode ? 'rgba(248,113,113,0.1)' : 'rgba(16,185,129,0.1)',
                    color: '#ffffff'
                  }}
                >
                  {isFocusingMode ? 'Focusing' : 'Resting'}
                </div>
              </div>
            </div>

            {/* Timer Controls Row */}
            <div className="flex items-center gap-3.5 z-10">
              {/* Play / Pause */}
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-lg active:scale-95"
                style={{
                  backgroundColor: isFocusingMode ? '#f87171' : '#10b981'
                }}
              >
                {isRunning ? (
                  <Pause className="h-5 w-5 text-black fill-current" />
                ) : (
                  <Play className="h-5 w-5 text-black fill-current ml-0.5" />
                )}
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="w-9 h-9 bg-[#202020] hover:bg-[#282828] border border-[#333] text-zinc-300 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
                title="Reset timer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Skip */}
              <button
                onClick={handleSkip}
                className="w-9 h-9 bg-[#202020] hover:bg-[#282828] border border-[#333] text-zinc-300 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
                title="Skip to next block"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom Status label */}
            <div className="mt-5 text-[10px] text-zinc-400 font-semibold tracking-wide">
              Up next: {isFocusingMode ? `${activePreset.restMin} min break` : `${activePreset.focusMin} min focus`}
            </div>

          </div>

          {/* CARD B: SYNCED TASKS LIST */}
          <div className="bg-[#161616] rounded-2xl border border-[#242424] p-6 shadow-md flex flex-col h-[278px]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-zinc-400">Tasks</span>
              <span className="text-[10px] bg-[#202020] border border-[#2c2c2c] px-2 py-0.5 rounded text-zinc-400">
                {activeTasks.filter(t => !t.completed).length} remaining
              </span>
            </div>

            {/* Focusing Sub-card */}
            {currentFocusingTask ? (
              <div className="bg-[#202020] p-3 rounded-xl border border-orange-500/20 mb-3 flex items-center gap-3">
                <div className="w-1.5 h-7 rounded bg-orange-500 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-[9px] text-orange-500 font-black uppercase tracking-wider">You are focusing on</div>
                  <div className="text-xs font-bold text-white truncate">{currentFocusingTask.title}</div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 italic p-3 bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] mb-3 text-center">
                Select a task target below to begin focusing
              </div>
            )}

            {/* Scrollable Tasks list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {activeTasks.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-6">No tasks. Add one below to track!</div>
              ) : (
                activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      task.id === focusTaskId
                        ? 'bg-[#202020] border-[#3a3a3a] shadow-xs'
                        : 'bg-[#1b1b1b] border-[#252525] hover:border-[#2f2f2f]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden w-[75%]">
                      {/* Round Checkbox */}
                      <button
                        onClick={() => handleTaskCheckToggle(task.id)}
                        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          task.completed
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-zinc-500 hover:border-white'
                        }`}
                      >
                        {task.completed && <Check className="h-3 w-3 text-black stroke-[3]" />}
                      </button>
                      <span
                        className={`text-xs font-semibold truncate ${
                          task.completed ? 'line-through text-zinc-500 opacity-60' : 'text-zinc-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    
                    {/* Focus Target Selector Button */}
                    {!task.completed && task.id !== focusTaskId && (
                      <button
                        onClick={() => setFocusTaskId(task.id)}
                        className="text-[9px] bg-[#282828] hover:bg-[#333] border border-[#3a3a3a] text-zinc-400 hover:text-white px-2 py-0.5 rounded-md transition-colors shrink-0 cursor-pointer"
                      >
                        Focus
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Form */}
            <div className="flex gap-2 items-center bg-[#202020] p-2 rounded-xl border border-[#2d2d2d] mt-3">
              <input
                type="text"
                placeholder="Add focus task... (Press Enter)"
                className="bg-transparent border-0 text-xs text-white focus:outline-hidden w-full px-1 font-semibold placeholder:text-zinc-500"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTaskSubmit();
                }}
              />
              <button
                onClick={handleAddTaskSubmit}
                className="p-1 text-orange-500 hover:text-white transition-colors cursor-pointer"
                title="Add task"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>

        {/* ================= COLUMN 2 ================= */}
        <div className="space-y-6">

          {/* CARD C: DAILY PROGRESS */}
          <div className="bg-[#161616] rounded-2xl border border-[#242424] p-6 shadow-md flex flex-col relative">
            <div className="w-full flex justify-between items-center mb-5">
              <span className="text-xs font-black tracking-wider uppercase text-zinc-400">Daily progress</span>
              <button
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Edit daily goal"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            {/* Goal Input form overlay */}
            {isEditingGoal && (
              <div className="bg-[#202020] p-3 rounded-xl border border-[#2a2a2a] w-full mb-4 flex items-center justify-between gap-2 text-xs">
                <span>Daily goal (minutes):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    max="600"
                    step="5"
                    className="bg-[#161616] border border-[#333] rounded px-2 py-1 w-16 text-center font-bold text-white focus:outline-hidden"
                    value={goalInputVal}
                    onChange={(e) => setGoalInputVal(Math.max(5, parseInt(e.target.value) || 5))}
                  />
                  <button
                    onClick={handleSaveGoal}
                    className="bg-orange-500 text-black px-2.5 py-1 rounded font-bold hover:bg-orange-400 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Layout Grid: Donut + Column Stats */}
            <div className="flex items-center justify-around py-2 gap-4">
              
              {/* Left stat column */}
              <div className="text-center space-y-1">
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Yesterday</div>
                <div className="text-sm font-black text-white">{yesterdayMinutes}m</div>
              </div>

              {/* Donut Chart */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Track ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#242424"
                    strokeWidth="7"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#ffffff"
                    strokeWidth="7"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={donutStrokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                
                {/* Text inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider leading-none">Daily goal</div>
                  <div className="text-xs font-black text-white mt-1 leading-none">
                    {dailyGoalMinutes >= 60 ? `${(dailyGoalMinutes / 60).toFixed(1).replace('.0', '')} hr` : `${dailyGoalMinutes} min`}
                  </div>
                  <div className="text-[9px] text-orange-500 font-bold mt-1 leading-none">{progressPercent}%</div>
                </div>
              </div>

              {/* Right stat column */}
              <div className="text-center space-y-1">
                <div className="text-[10px] text-zinc-400 font-bold flex items-center justify-center gap-1 uppercase tracking-wider">
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-current" /> Streak
                </div>
                <div className="text-sm font-black text-white">{streakDays} days</div>
              </div>

            </div>

            {/* Bottom indicator */}
            <div className="border-t border-[#262626] mt-4 pt-3 text-center text-xs font-bold text-zinc-400">
              Completed today: <span className="text-white font-extrabold">{completedMinutesToday} minutes</span>
            </div>

          </div>

          {/* CARD D: SPOTIFY MINI-PLAYER / AMBIENT SOUNDBOARD */}
          <div className="bg-[#161616] rounded-2xl border border-[#242424] p-6 shadow-md flex flex-col h-[278px]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1db954] flex items-center justify-center">
                  <Music className="h-3 w-3 text-black fill-current" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-zinc-400">Spotify & Audio</span>
              </div>
              
              {/* Mode Swapper */}
              <div className="flex bg-[#202020] rounded-lg p-0.5 border border-[#2d2d2d]">
                <button
                  onClick={() => setMusicMode('embed')}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                    musicMode === 'embed' ? 'bg-[#1db954] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Playlist
                </button>
                <button
                  onClick={() => setMusicMode('ambient')}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                    musicMode === 'ambient' ? 'bg-[#1db954] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mixer
                </button>
              </div>
            </div>

            {/* Body Panel */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {musicMode === 'embed' ? (
                /* Spotify Embed Player */
                <div className="w-full h-full relative rounded-xl overflow-hidden bg-black border border-[#2d2d2d]">
                  <iframe
                    src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0EXPn?utm_source=generator&theme=0"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '175px' }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Spotify Lo-Fi Beats Embed"
                  />
                </div>
              ) : (
                /* Ambient Mixer Board */
                <div className="space-y-3.5 py-1">
                  
                  {/* Channels slider list */}
                  {[
                    { id: 'lofi', label: '🎵 Study Beats', color: 'orange-500' },
                    { id: 'rain', label: '🌧️ Coffee Rain', color: 'blue-500' },
                    { id: 'cafe', label: '☕ Cozy Cafe', color: 'amber-500' },
                    { id: 'noise', label: '🔊 Focus Noise', color: 'indigo-500' }
                  ].map((chan) => (
                    <div key={chan.id} className="flex items-center justify-between gap-4 text-xs">
                      
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => handleToggleAmbient(chan.id)}
                        className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          playingAmbient[chan.id]
                            ? 'bg-[#1db954]/10 border-[#1db954] text-[#1db954]'
                            : 'bg-[#202020] border-[#333] text-zinc-400 hover:text-white'
                        }`}
                        title="Toggle sound loop"
                      >
                        {playingAmbient[chan.id] ? (
                          <Volume2 className="h-3.5 w-3.5" />
                        ) : (
                          <Music className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Label */}
                      <span className="w-24 text-[11px] font-bold text-zinc-300 truncate">{chan.label}</span>

                      {/* Slider volume */}
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="w-full accent-[#1db954] bg-[#222] h-1.5 rounded-lg cursor-pointer appearance-none focus:outline-hidden"
                          value={volumes[chan.id]}
                          onChange={(e) => handleAmbientVolumeChange(chan.id, parseInt(e.target.value))}
                        />
                        <span className="w-7 text-[9px] font-mono text-zinc-500 text-right">
                          {volumes[chan.id]}%
                        </span>
                      </div>

                    </div>
                  ))}

                  <div className="text-[9px] text-zinc-500 text-center italic mt-2">
                    Adjust volumes to mix your custom focus soundscape
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
