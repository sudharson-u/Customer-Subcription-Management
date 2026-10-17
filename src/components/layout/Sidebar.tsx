'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, RefreshCw, Bell, FileText,
  Upload, Settings, ChevronLeft, ChevronRight, X, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/import', label: 'Import / Export', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-[#1B0B3B] text-white border-r border-[#2C185A] transition-all duration-300 shadow-xl',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-[#2C185A]',
          collapsed && 'justify-center px-2'
        )}>
          {/* Official Logo Container */}
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-0.5 bg-gradient-to-br from-purple-900 to-purple-950 border border-purple-500/30 shadow-md">
              <img src="/logo_icon.png" alt="Hindu Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-extrabold tracking-wider text-white leading-tight">HINDU</p>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded font-mono font-bold">PWA</span>
                </div>
                <p className="text-[11px] text-purple-300 font-medium leading-tight truncate mt-0.5">Royapuram • Chennai-13</p>
                <p className="text-[10px] text-purple-400 font-semibold leading-tight truncate">Circulation: Umapathy</p>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className={cn('lg:hidden ml-auto text-purple-400 hover:text-white p-1', collapsed && 'hidden')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'sidebar-link group',
                  isActive && 'active',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0 text-current" />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full ml-auto">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="border-t border-[#2C185A]">
          <ThemeToggle collapsed={collapsed} />
        </div>

        {/* Desktop Collapse toggle */}
        <div className="hidden lg:flex px-3 py-3 border-t border-[#2C185A]">
          <button
            id="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            className={cn('btn-ghost w-full text-purple-300 hover:text-white hover:bg-white/5 justify-center', !collapsed && 'justify-start')}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-semibold">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
