/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, User as UserIcon, Bell, Shield, Save, CheckCircle } from 'lucide-react';

export default function SettingsView({ user, onUpdateProfile }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150');
  const [notifPreferences, setNotifPreferences] = useState({
    dailyTip: true,
    examCountdown: true,
    streakReminders: false
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  ];

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (loadEvent.target?.result) {
        setAvatar(loadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    setTimeout(() => {
      onUpdateProfile({
        ...user,
        name,
        email,
        avatar
      });
      setSaving(false);
      setSuccess(true);
    }, 600);
  };

  return (
    <div id="settings_container" className="min-h-screen w-full max-w-none bg-[#161616] rounded-none border border-[#2a2a2a] p-8 sm:p-10 shadow-none space-y-8">
      <div className="border-b border-[#2a2a2a] pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-500" />
          <div>
            <h3 className="text-xl font-bold font-display text-slate-100">Profile</h3>
            <p className="text-sm text-slate-300">View avatar options and update your personal profile details</p>
          </div>
        </div>
      </div>

      {success && (
        <div id="settings_success_toast" className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
          Settings details saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Profile Card */}
        <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl space-y-4">
          <h4 className="font-bold flex items-center gap-1.5 text-slate-800">
            <UserIcon className="h-4 w-4 text-indigo-500" /> Personal Identity
          </h4>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-[#333]">
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 w-full space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#161616] border border-[#333] focus:outline-none focus:border-indigo-500 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-slate-100 border border-[#333] p-2 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Change Avatar Preset</label>
                <div className="flex gap-2 mb-3">
                  {avatars.map((avUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(avUrl)}
                      className={`relative w-8 h-8 rounded-full overflow-hidden transition-all border ${
                        avatar === avUrl ? 'ring-2 ring-indigo-500 ring-offset-2 w-9 h-9' : 'opacity-60'
                      }`}
                    >
                      <img src={avUrl} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Upload your own photo</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handlePhotoUpload}
                    className="block w-full text-xs text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:font-semibold file:uppercase file:tracking-wider"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Accepted formats: JPG, PNG. Your uploaded image will be previewed instantly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications toggler */}
        <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl space-y-3">
          <h4 className="font-bold flex items-center gap-1.5 text-slate-800">
            <Bell className="h-4 w-4 text-indigo-500" /> Notifications & Study Hacks Toggles
          </h4>

          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifPreferences.dailyTip}
                onChange={(e) => setNotifPreferences({ ...notifPreferences, dailyTip: e.target.checked })}
                className="rounded accent-indigo-600 h-4 w-4"
              />
              <span className="text-slate-700">Display AI Tips dynamically on my student dashboard workspace</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifPreferences.examCountdown}
                onChange={(e) => setNotifPreferences({ ...notifPreferences, examCountdown: e.target.checked })}
                className="rounded accent-indigo-600 h-4 w-4"
              />
              <span className="text-slate-700">Calculate structural countdown warning indices from exam dates list</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifPreferences.streakReminders}
                onChange={(e) => setNotifPreferences({ ...notifPreferences, streakReminders: e.target.checked })}
                className="rounded accent-indigo-600 h-4 w-4"
              />
              <span className="text-slate-700">Simulate daily student streak decay notices</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl py-3 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}
