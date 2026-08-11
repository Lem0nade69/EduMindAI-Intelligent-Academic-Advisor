/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Activity, BarChart4, AlertTriangle, Cpu, RotateCcw } from 'lucide-react';

export default function AdminPanelView({ user }) {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [activities, setActivities] = useState([]);

  const loadAdminMetrics = () => {
    // Users
    const storedUsersJson = localStorage.getItem('edumind_registered_users');
    let usersList = storedUsersJson ? JSON.parse(storedUsersJson) : [];
    if (usersList.length === 0) {
      usersList = [
        { id: 'usr1', email: 'tahmid@university.edu', name: 'Tahmid Rahman', role: 'student', streak: 4, lastActive: new Date().toISOString() },
        { id: 'usr2', email: 'kamal@university.edu', name: 'Professor Kamal', role: 'admin', streak: 0, lastActive: new Date().toISOString() },
        { id: 'usr3', email: 'sajid@university.edu', name: 'Sajid Islam', role: 'student', streak: 8, lastActive: new Date().toISOString() }
      ];
      localStorage.setItem('edumind_registered_users', JSON.stringify(usersList));
    }
    setRegisteredUsers(usersList);

    // Logs
    const storedLogs = localStorage.getItem('edumind_activity_logs');
    let logs = storedLogs ? JSON.parse(storedLogs) : [];
    if (logs.length === 0) {
      logs = [
        { id: 'l1', userId: 'usr1', userName: 'Tahmid Rahman', action: 'Generated Quiz', details: 'Built MCQ self-test covering CSE-305', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
        { id: 'l2', userId: 'usr1', userName: 'Tahmid Rahman', action: 'Generated Study Plan', details: 'Timetable created with total weekly budget of 15 hours', timestamp: new Date(Date.now() - 60 * 60000).toISOString() },
        { id: 'l3', userId: 'usr3', userName: 'Sajid Islam', action: 'Focus Timer Completed', details: 'Finished a focusing session using: Core Revision Block', timestamp: new Date(Date.now() - 90 * 60000).toISOString() }
      ];
      localStorage.setItem('edumind_activity_logs', JSON.stringify(logs));
    }
    setActivities(logs);
  };

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  const handleClearLogs = () => {
    if (window.confirm('Wipe university activity audit logs?')) {
      localStorage.setItem('edumind_activity_logs', JSON.stringify([]));
      setActivities([]);
    }
  };

  return (
    <div id="admin_panel_view" className="space-y-6">
      <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-6 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-indigo-500" /> Academic System Administration
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">Comprehensive audit logs, platform metrics, and tenant statistics</p>
        </div>

        <button
          onClick={handleClearLogs}
          className="text-xs bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
        >
          Clear Audit Logs
        </button>
      </div>

      {/* Grid statistics highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#161616] border border-[#2a2a2a] p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Accounts</div>
            <div id="admin_stat_users" className="text-lg font-bold text-slate-800">{registeredUsers.length} active</div>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Activities Tracked</div>
            <div id="admin_stat_activities" className="text-lg font-bold text-slate-800">{activities.length} entries</div>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] p-5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cognitive Server Model</div>
            <div className="text-sm font-bold text-slate-800">gemini-3.5-flash</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Users Accounts List */}
        <div className="lg:col-span-1 bg-[#161616] border border-[#2a2a2a] p-6 rounded-2xl shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5 mb-4 border-b border-[#2a2a2a] pb-2">
            <Users className="h-4 w-4 text-indigo-500" /> University Roster
          </h4>

          <div id="admin_roster_container" className="space-y-3 max-h-[22rem] overflow-y-auto">
            {registeredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{u.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono italic">{u.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Detailed Audit Logs */}
        <div className="lg:col-span-2 bg-[#161616] border border-[#2a2a2a] p-6 rounded-2xl shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5 mb-4 border-b border-[#2a2a2a] pb-2">
            <Activity className="h-4 w-4 text-indigo-500" /> Interactive Platform Logs
          </h4>

          <div id="admin_logs_container" className="space-y-3 max-h-[22rem] overflow-y-auto font-mono text-[11px] leading-relaxed select-none">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic">No platform operations registered yet.</div>
            ) : (
              activities.map((log) => (
                <div key={log.id} className="p-3 bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-indigo-600">{log.userName}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-800">
                    <span className="font-extrabold text-slate-500 bg-slate-200 px-1 rounded text-[9px] uppercase font-sans tracking-wide mr-1.5">{log.action}</span>
                    <span>{log.details}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
