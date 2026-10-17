'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings, Bell, MessageSquare, Newspaper, Users, Shield,
  Laptop, Smartphone, Globe, Database, Save, CheckCircle,
  Plus, Trash2, Key, AlertTriangle, RefreshCw
} from 'lucide-react';
import ThemeSettingsSelector from '@/components/theme/ThemeSettingsSelector';
import { NEWSPAPERS, NEWSPAPERS_META } from '@/lib/utils';
import PushNotificationToggle from '@/components/layout/PushNotificationToggle';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

const INITIAL_USERS: UserItem[] = [
  {
    id: 'u-1',
    email: 'umapathty.circulation@gmail.com',
    name: 'Umapathy',
    role: 'Full Circulation Access',
    status: 'Active',
    created_at: '2025-01-01',
  },
  {
    id: 'u-2',
    email: 'staff.royapuram@hindu.com',
    name: 'Royapuram Beat Desk',
    role: 'Full Circulation Access',
    status: 'Active',
    created_at: '2025-06-15',
  },
  {
    id: 'u-3',
    email: 'desk.chennai13@hindu.com',
    name: 'Washermanpet Desk',
    role: 'Full Circulation Access',
    status: 'Active',
    created_at: '2026-01-10',
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'papers' | 'users' | 'sessions' | 'theme'>('notifications');

  // Notification Window State (Default 30 days / 1 month)
  const [windowDays, setWindowDays] = useState(30);
  const [savedNotif, setSavedNotif] = useState(false);

  // Templates State
  const [templateEn, setTemplateEn] = useState(
    'Dear {name}, your annual subscription for {newspaper} (Royapuram zone) expires on {end_date} ({days} days remaining). Please renew to continue uninterrupted morning delivery. - Circulation Agency Umapathy'
  );
  const [templateTa, setTemplateTa] = useState(
    'அன்புள்ள {name}, தங்களின் {newspaper} நாளிதழ் சந்தா {end_date} அன்று ({days} நாட்களில்) முடிவடைகிறது. காலை செய்தித்தாள் விநியோகம் தடையின்றி தொடர உடனடியாக புதுப்பிக்கவும். - உமாபதி ஏஜென்சி, ராயபுரம்'
  );
  const [savedTemplates, setSavedTemplates] = useState(false);

  // Users State
  const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      device: 'Desktop Chrome 131 / Windows 11',
      location: 'Royapuram, Chennai-13',
      isCurrent: true,
      lastActive: 'Active Now',
    },
    {
      id: 'sess-2',
      device: 'iPhone 16 Pro / Safari Mobile',
      location: 'New Washermanpet, Chennai',
      isCurrent: false,
      lastActive: '12 minutes ago',
    },
    {
      id: 'sess-3',
      device: 'Android Tablet / Chrome 130',
      location: 'Royapuram Distribution Hub',
      isCurrent: false,
      lastActive: '2 hours ago',
    },
  ]);
  const [sessionSignedOut, setSessionSignedOut] = useState(false);

  // Language state
  const [language, setLanguage] = useState<'en' | 'ta'>('en');

  const handleSaveNotifSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hindu_window_days', String(windowDays));
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2500);
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hindu_template_en', templateEn);
    localStorage.setItem('hindu_template_ta', templateTa);
    setSavedTemplates(true);
    setTimeout(() => setSavedTemplates(false), 2500);
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const newUser: UserItem = {
      id: `u-${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || newEmail.split('@')[0],
      role: 'Full Circulation Access',
      status: 'Active',
      created_at: new Date().toISOString().substring(0, 10),
    };

    setUsers([...users, newUser]);
    setNewEmail('');
    setNewName('');
    setShowInviteForm(false);
  };

  const handleDeactivateUser = (id: string) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u
      )
    );
  };

  const handleSignOutOtherDevices = () => {
    setSessions(sessions.filter((s) => s.isCurrent));
    setSessionSignedOut(true);
    setTimeout(() => setSessionSignedOut(false), 3000);
  };

  return (
    <div className="page-container space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            System Preferences & Settings
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure notification windows, bilingual renewal templates, user access, and concurrent device sessions.
        </p>
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Notification Window
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'templates'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp / SMS Templates
        </button>
        <button
          onClick={() => setActiveTab('papers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'papers'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" /> 4 Publications
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> User Access (Invite-Only)
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" /> Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'theme'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> Appearance & Theme
        </button>
      </div>

      {/* Tab 1: Notification Window */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-600" />
              Renewal Expiry Notification Window
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The portal monitors upcoming expiries. Default window is strictly set to 1 Month (30 Days).
            </p>
          </div>

          <form onSubmit={handleSaveNotifSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Notification Advance Window (Days)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={7}
                  max={90}
                  value={windowDays}
                  onChange={(e) => setWindowDays(Number(e.target.value))}
                  className="form-input text-sm font-mono w-32"
                />
                <span className="text-xs text-gray-500">
                  days before subscription expiry (Standard: 30 days)
                </span>
              </div>
            </div>

            {/* Urgency Tiers Information Box */}
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-2">
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Automated Notification Urgency Tiers:
              </p>
              <ul className="text-xs text-purple-800/80 dark:text-purple-300/80 space-y-1">
                <li>• <strong>30 to 15 Days:</strong> First Information Reminder (Amber/Blue)</li>
                <li>• <strong>14 to 7 Days:</strong> Warning Reminder (Amber)</li>
                <li>• <strong>≤ 6 Days:</strong> Critical Urgent Notice (Rose)</li>
                <li>• <strong>Expired:</strong> Service Interruption Alert (Red)</li>
              </ul>
            </div>

            {/* Push Notifications Toggle */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Browser Web Push Alerts
              </label>
              <PushNotificationToggle />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button type="submit" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save Notification Window
              </button>
              {savedNotif && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Preferences Saved!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Message Templates */}
      {activeTab === 'templates' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              Bilingual Reminder Templates (English & Tamil)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customize prefilled messages generated when tapping WhatsApp or SMS icons on customer cards.
            </p>
          </div>

          <form onSubmit={handleSaveTemplates} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                English WhatsApp & SMS Template
              </label>
              <textarea
                rows={3}
                value={templateEn || ''}
                onChange={(e) => setTemplateEn(e.target.value)}
                className="form-input text-xs leading-relaxed"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Available placeholders: <code>{'{name}'}</code>, <code>{'{newspaper}'}</code>, <code>{'{end_date}'}</code>, <code>{'{days}'}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Tamil WhatsApp & SMS Template (தமிழ்)
              </label>
              <textarea
                rows={3}
                value={templateTa || ''}
                onChange={(e) => setTemplateTa(e.target.value)}
                className="form-input text-xs leading-relaxed font-sans"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                பயன்படுத்தக்கூடிய மாறிகள்: <code>{'{name}'}</code>, <code>{'{newspaper}'}</code>, <code>{'{end_date}'}</code>, <code>{'{days}'}</code>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save Message Templates
              </button>
              {savedTemplates && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Templates Updated!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: 4 Publications Configuration */}
      {activeTab === 'papers' && (
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-purple-600" />
              Configured Publications (4 Newspapers)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Circulation parameters for Dinakaran, Dinamalar, NIE / DIN, and The Hindu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {NEWSPAPERS.map((paper) => {
              const meta = NEWSPAPERS_META[paper.code];
              return (
                <div
                  key={paper.code}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`newspaper-chip ${meta.badgeClass}`}>
                        {meta.name}
                      </span>
                      <span className="badge badge-emerald text-[10px]">Active</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 pt-1">
                      Language: <strong>{paper.language}</strong> • Monogram: <strong>{meta.shortName}</strong>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Beat: Royapuram, New/Old Washermanpet (Chennai-600013)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: User Management & Allow-list */}
      {activeTab === 'users' && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Invite-Only User Access & Allow-List
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Single permission level: all active users have full circulation access. Public registration is permanently closed.
              </p>
            </div>

            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Invite User
            </button>
          </div>

          {showInviteForm && (
            <form onSubmit={handleInviteUser} className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
              <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Invite New Circulation Administrator
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name (e.g. S. Murugan)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="form-input text-xs"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address (@gmail.com or @hindu.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="form-input text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
                >
                  <Key className="w-3 h-3" /> Grant Full Access
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user) => (
              <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {user.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeactivateUser(user.id)}
                    className="btn-secondary text-xs py-1 px-2.5 text-gray-600 hover:text-rose-600"
                  >
                    {user.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Active Sessions & Multi-Device Access */}
      {activeTab === 'sessions' && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-600" />
                Simultaneous Device Sessions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can be signed in simultaneously across desktop, phone, and tablet without forced logout.
              </p>
            </div>

            <button
              onClick={handleSignOutOtherDevices}
              className="btn-secondary text-xs py-2 px-3 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50"
            >
              Sign Out All Other Devices
            </button>
          </div>

          {sessionSignedOut && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All other concurrent device sessions were terminated.
            </div>
          )}

          <div className="space-y-3 pt-2">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                    {sess.device.includes('iPhone') || sess.device.includes('Android') ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-gray-900 dark:text-white">
                        {sess.device}
                      </p>
                      {sess.isCurrent && (
                        <span className="badge badge-purple text-[10px]">Current Session</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {sess.location} • {sess.lastActive}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Appearance, Theme & Language */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                Color Theme (Premium Purple Design System)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Crafted with Deep Violet (#1B0B3B), Royal Purple (#5B21B6), and WCAG AA contrast.
              </p>
            </div>
            <ThemeSettingsSelector />
          </div>

          <div className="card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                Interface Language (i18n)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select your preferred circulation operating language.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'btn-secondary'
                }`}
              >
                English (Default)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  language === 'ta'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'btn-secondary'
                }`}
              >
                தமிழ் (Tamil)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
