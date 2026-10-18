import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  ShieldCheck, Smartphone, RefreshCw, Zap,
  CheckCircle, ArrowRight, Bell, FileSpreadsheet,
  Users, MapPin
} from 'lucide-react';
import InstallPwaButton from '@/components/layout/InstallPwaButton';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasDemo = cookieStore.get('demo_session')?.value === 'true';

  if (!isSupabaseConfigured()) {
    if (hasDemo) {
      redirect('/dashboard');
    }
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect('/dashboard');
    }
  }

  const papers = [
    { code: 'DINAKARAN', name: 'Dinakaran', short: 'DK', desc: 'Daily Tamil Newspaper Circulation', color: '#E11D48', border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400' },
    { code: 'DINAMALAR', name: 'Dinamalar', short: 'DM', desc: 'Morning Tamil Edition & Staff Copies', color: '#0D9488', border: 'border-teal-500/40', bg: 'bg-teal-500/10', text: 'text-teal-400' },
    { code: 'NIE_DIN', name: 'NIE / DIN', short: 'ND', desc: 'New Indian Express & Dinamani Joint Subscription', color: '#3B82F6', border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    { code: 'THE_HINDU', name: 'The Hindu', short: 'TH', desc: 'National English Daily & Institutional Register', color: '#7C3AED', border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-[#1B0B3B] text-white selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-purple-900/50 backdrop-blur-md sticky top-0 z-40 bg-[#1B0B3B]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ width: 40, height: 40, overflow: 'hidden' }}
              className="w-10 h-10 rounded-xl overflow-hidden p-0.5 bg-purple-900/60 border border-purple-500/30 flex items-center justify-center flex-shrink-0"
            >
              <img
                src="/logo_icon.png"
                alt="Hindu Logo"
                width={40}
                height={40}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-wider">HINDU</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 rounded font-mono font-bold">PORTAL</span>
              </div>
              <p className="text-[10px] text-purple-300">Royapuram • Chennai-13</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <InstallPwaButton className="hidden sm:inline-flex bg-white/10 hover:bg-white/20 text-purple-200 border-purple-500/30" />
            <Link
              href="/login"
              className="btn-primary text-xs py-2 px-4 shadow-lg shadow-purple-600/30"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-600/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <img
              src="/logo.png"
              alt="Hindu"
              width={260}
              height={80}
              style={{ maxHeight: 80, width: 'auto', objectFit: 'contain' }}
              className="h-16 sm:h-20 w-auto drop-shadow-2xl object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-xs font-semibold text-purple-200 mb-6 backdrop-blur-md">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Distribution Zone: Royapuram, Chennai-600013 & Washermanpet</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            One Unified Portal for <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-200 to-purple-200">
              FOUR Daily Newspapers
            </span>
          </h1>

          <p className="text-base sm:text-lg text-purple-200/90 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Manage subscriber directories, automated 30-day renewal notices, multi-device live sync, and instant WhatsApp delivery boy dispatches with zero data loss.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto btn-primary py-3.5 px-8 text-sm font-bold shadow-xl shadow-purple-600/40 rounded-xl"
            >
              Access Circulation Portal <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <InstallPwaButton className="w-full sm:w-auto py-3.5 px-6 text-sm justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-purple-300">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Invite-Only Security</span>
            <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-purple-400" /> Multi-Phone & Desktop Sync</span>
            <span className="flex items-center gap-1.5"><Bell className="w-4 h-4 text-amber-400" /> 30-Day Automated Reminders</span>
          </div>
        </div>
      </section>

      {/* 4 Publications Grid */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Supported Publications</h2>
          <p className="text-2xl font-extrabold text-white">Royapuram Newspaper Circulation Roster</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {papers.map((p) => (
            <div
              key={p.code}
              className={`p-6 rounded-2xl border ${p.border} ${p.bg} backdrop-blur-sm transition-all hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black tracking-tight text-white">{p.name}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border border-white/20 ${p.text}`}>
                  {p.short}
                </span>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed mb-4">{p.desc}</p>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-300 font-mono">
                <span>Active Register</span>
                <span className="text-emerald-400 font-bold">Live Tracked</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities Feature Matrix */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-purple-900/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-4">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1-Month Renewal Window</h3>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Automated expiry notices trigger 30 days in advance with color-coded tiers (Info, Warning, Urgent, Critical). Excludes Free and Staff copies.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-4">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Real-Time Multi-Device Sync</h3>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Updates made on a mobile phone or desktop workstation appear instantly across all logged-in devices without requiring page refresh.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Print & PDF Report Engine</h3>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Export branded A4 PDF subscriber profiles, monthly renewal lists, and full Excel backups configured for the Royapuram distribution territory.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-purple-900/50 text-center text-xs text-purple-400">
        <p className="font-semibold text-purple-200 mb-1">HINDU — Subscription & Circulation Management System</p>
        <p>Managed for Royapuram, Chennai - 600013 • Head Administrator: Umapathy (9094013926)</p>
      </footer>
    </div>
  );
}
