/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Clock, Filter, AlertCircle } from 'lucide-react';

export default function TaskTrackerView({ user, tasks, onAddTask, onToggleComplete, onDeleteTask }) {
  const [filterType, setFilterType] = useState('all');
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('CSE-305');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('assignment');
  const [description, setDescription] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !dueDate) {
      setErrorMsg('Please specify both a task title and final deadline.');
      return;
    }

    const newTask = {
      id: 'task_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      courseId,
      dueDate,
      completed: false,
      type
    };

    onAddTask(newTask);

    // Reset inputs
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  const getDaysRemainingStr = (dateStr) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Passed';
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days left`;
  };

  const filteredTasks = tasks.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  return (
    <div id="tasks_tracker_view" className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {/* Task input form */}
      <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-6 shadow-sm h-fit space-y-4">
        <div className="border-b border-[#2a2a2a] pb-2.5">
          <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-1.5">
            <Plus className="h-5 w-5 text-indigo-500" /> Track New Deadline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Enlist study deliverables with countdown warnings</p>
        </div>

        <form onSubmit={handleAddTaskSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lab 3 Cache Simulation"
              className="w-full bg-[#1a1a1a] border border-[#333] focus:outline-none focus:border-indigo-505 focus:bg-[#111111] rounded-lg p-2.5 text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Subject Code</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] focus:outline-none rounded-lg p-2 text-xs"
              >
                <option value="CSE-305">CSE-305</option>
                <option value="MATH-201">MATH-201</option>
                <option value="EEE-202">EEE-202</option>
                <option value="CSE-311">CSE-311</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Deliverable Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] focus:outline-none rounded-lg p-2 text-xs"
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="project">Course Project</option>
                <option value="revision">Self-Revision</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Final Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:outline-none rounded-lg p-2 text-xs text-slate-700"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-500 font-semibold bg-rose-50 p-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-semibold rounded-xl py-3 mt-1.5 transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="h-4 w-4" /> Save Academic Task
          </button>
        </form>
      </div>

      {/* Task list view */}
      <div className="lg:col-span-2 space-y-4">
        {/* Top filter bar */}
        <div className="bg-[#161616] border border-[#2a2a2a] p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700 font-display">Syllabus Deadline Tracker ({filteredTasks.length})</span>
          </div>

          <div className="flex gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full font-medium ${
                filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('assignment')}
              className={`px-3 py-1 rounded-full font-medium ${
                filterType === 'assignment' ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setFilterType('exam')}
              className={`px-3 py-1 rounded-full font-medium ${
                filterType === 'exam' ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Exams
            </button>
          </div>
        </div>

        {/* List mapping */}
        <div id="tasks_interactive_list" className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-[#161616] border border-[#2a2a2a] p-12 text-center rounded-2xl">
              <Calendar className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <h4 className="text-xs font-semibold text-slate-600">No scheduled deadlines match current filters</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">Enlist custom university midterms on your left workspace card.</p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const daysRemaining = getDaysRemainingStr(t.dueDate);
              const isUrgent = daysRemaining.includes('Today') || daysRemaining.includes('Tomorrow') || (daysRemaining.includes('left') && parseInt(daysRemaining) <= 2);

              return (
                <div
                  key={t.id}
                  className={`bg-white border rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-4 transition-all ${
                    t.completed ? 'opacity-65 border-[#2a2a2a]/60 bg-[#1a1a1a]/80' : isUrgent ? 'border-rose-150 bg-rose-50/15' : 'border-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleComplete(t.id)}
                      className={`p-1.5 rounded-full transition-colors shrink-0 mt-0.5 cursor-pointer ${
                        t.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-[#1a1a1a] border border-[#333] text-slate-400 hover:text-indigo-600 hover:border-indigo-600'
                      }`}
                    >
                      <CheckCircle2 className="h-4.5 w-4.5 fill-current" />
                    </button>

                    <div>
                      <h4 className={`text-xs font-bold text-slate-900 ${t.completed ? 'line-through text-slate-400' : ''}`}>
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {t.courseId} • Due {new Date(t.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4.5 shrink-0">
                    <div className="text-right">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        t.type === 'exam'
                          ? 'bg-rose-50 border-rose-100 text-rose-600'
                          : t.type === 'assignment'
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>
                        {t.type}
                      </span>
                      <div className={`text-[11px] font-bold mt-1.5 ${isUrgent && !t.completed ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
                        {daysRemaining}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTask(t.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
