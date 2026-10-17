'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, ChevronDown, X, Shield, Smartphone, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TABLES } from '@/lib/supabase/tables';
import { cn } from '@/lib/utils';
import PushNotificationToggle from './PushNotificationToggle';
import InstallPwaButton from './InstallPwaButton';
import NewspaperFilterPills from './NewspaperFilterPills';

interface HeaderProps {
  user: any;
}

export default function Header({ user }: HeaderProps) {
  const [notifCount, setNotifCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotifCount();

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 80);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function fetchNotifCount() {
    try {
      const { count } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setNotifCount(count || 6); // default 6 notifications from seed data if offline
    } catch {
      setNotifCount(6);
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      await supabase.auth.signOut();
    } catch {}
    router.push('/login');
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  }

  const [greetingText, setGreetingText] = useState('Welcome, Umapathy');

  useEffect(() => {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    setGreetingText(`${prefix}, Umapathy`);
  }, []);

  return (
    <>
      {/* Search Overlay Modal (Ctrl/Cmd+K) */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-20 px-4 backdrop-blur-xs"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="bg-white dark:bg-[#150A2E] rounded-2xl shadow-2xl w-full max-w-xl p-4 border border-purple-200 dark:border-[#2C185A]"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across Dinakaran, Dinamalar, NIE/DIN, The Hindu..."
                className="w-full pl-11 pr-10 py-3.5 text-sm rounded-xl focus:outline-none bg-purple-50/50 dark:bg-[#1F1042] text-gray-900 dark:text-purple-100 placeholder-purple-400/80 border border-purple-200 dark:border-[#2C185A]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <div className="flex items-center justify-between text-xs text-purple-400 mt-3 px-1">
              <p>Search by subscriber name, mobile, address, order ID, or publication.</p>
              <kbd className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/60 rounded text-purple-700 dark:text-purple-300 font-mono text-[10px]">ESC</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <header className="h-16 frosted-header flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3 flex-shrink-0 transition-colors z-30">
        {/* Mobile Sidebar Menu Toggle */}
        <button
          id="mobile-menu-toggle"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="lg:hidden p-2 rounded-xl text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800/80 flex-shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop Greeting */}
        <div className="hidden 2xl:flex flex-col justify-center mr-3 flex-shrink-0">
          <p suppressHydrationWarning className="text-sm font-extrabold text-gray-900 dark:text-purple-100 tracking-tight leading-none whitespace-nowrap">
            {greetingText}
          </p>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold leading-tight whitespace-nowrap mt-1">
            Head of Circulation • Royapuram
          </p>
        </div>

        <div className="hidden 2xl:block h-7 w-px bg-purple-200 dark:bg-purple-900/60 mr-3 flex-shrink-0" />

        {/* Global Newspaper Switcher Pills */}
        <div className="flex items-center flex-shrink-0">
          <NewspaperFilterPills />
        </div>

        {/* Global Search Bar (Center) */}
        <div className="flex-1 max-w-sm lg:max-w-md mx-auto hidden md:block">
          <button
            id="global-search-btn"
            type="button"
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchRef.current?.focus(), 80);
            }}
            className="w-full flex items-center justify-between pl-3.5 pr-2.5 py-2 text-xs text-gray-500 dark:text-purple-300 bg-white dark:bg-[#1F1042] hover:bg-purple-50 dark:hover:bg-[#251352] rounded-xl border border-purple-200/80 dark:border-[#2C185A] shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="truncate text-gray-500 dark:text-purple-300">Search 4 papers by name, phone, order...</span>
            </div>
            <kbd className="inline-flex items-center text-[10px] font-mono font-bold text-purple-600 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
          {/* Install PWA Button */}
          <InstallPwaButton className="hidden md:inline-flex" />

          {/* Single Clean Notifications Bell */}
          <Link
            href="/notifications"
            id="notification-bell"
            className="relative p-2 sm:p-2.5 text-gray-700 hover:text-purple-900 hover:bg-purple-100/50 dark:text-purple-200 dark:hover:text-white dark:hover:bg-purple-900/40 rounded-xl transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800 flex-shrink-0"
            title="Notifications Center"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-sm">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-xl hover:bg-purple-100/50 dark:hover:bg-purple-900/40 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-xs shadow-md border border-purple-300">
                U
              </div>
              <span className="hidden md:inline text-xs font-bold text-gray-900 dark:text-purple-100 max-w-[120px] truncate">
                Umapathy
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-purple-400 transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 sm:right-1 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.25rem)] bg-white dark:bg-[#150A2E] border border-purple-200 dark:border-[#2C185A] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden fade-in">
                  <div className="px-4 py-3 border-b border-purple-100 dark:border-[#2C185A]">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Umapathy</p>
                    <p className="text-xs text-purple-600 dark:text-purple-300 font-mono truncate">{user?.email || 'ukss61925@gmail.com'}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 text-[10px] font-bold rounded-full">
                        Admin • Circulation Head
                      </span>
                    </div>
                  </div>

                  {/* Integrated Push Notifications Toggle */}
                  <div className="px-4 py-2.5 border-b border-purple-100 dark:border-[#2C185A] flex items-center justify-between gap-3 text-xs text-gray-700 dark:text-purple-200">
                    <span className="font-medium">Device Push Alerts</span>
                    <PushNotificationToggle />
                  </div>

                  <div className="px-4 py-2.5 border-b border-purple-100 dark:border-[#2C185A] text-xs text-gray-600 dark:text-purple-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-500" /> Active Session
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Online</span>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-purple-500" />
                    Security & Active Devices
                  </Link>

                  <button
                    id="sign-out-btn"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
