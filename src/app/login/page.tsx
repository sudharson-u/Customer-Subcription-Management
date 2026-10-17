'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, ShieldCheck, MapPin } from 'lucide-react';
import InstallPwaButton from '@/components/layout/InstallPwaButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isConfigured) {
      try {
        const res = await fetch('/api/auth/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email }),
        });
        if (res.ok) {
          router.push('/dashboard');
          router.refresh();
          return;
        }
      } catch {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Invalid email or password. Access is invite-only.'
          : authError.message
      );
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  const handleQuickDemoAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: 'ukss61925@gmail.com' }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B0B3B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-3xl p-8 shadow-2xl">
          {/* Brand header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/logo.png" alt="Hindu Logo" className="h-14 sm:h-16 w-auto drop-shadow-xl object-contain" />
            </div>
            <p className="text-xs text-purple-200/90 font-medium">Subscription & Circulation Portal</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-300 font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Royapuram, Chennai-13 • Head: Umapathy</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Administrator Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ukss61925@gmail.com"
                required
                className="w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder:text-purple-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  className="w-full px-4 py-3 pr-11 bg-white/10 border border-purple-400/30 rounded-xl text-white placeholder:text-purple-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <p className="text-xs text-rose-300 font-semibold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="login-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 cursor-pointer mt-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Circulation Portal'
              )}
            </button>

            {!isConfigured && (
              <button
                type="button"
                onClick={handleQuickDemoAccess}
                disabled={loading}
                className="w-full py-2.5 bg-white/5 hover:bg-white/15 text-purple-200 border border-purple-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Instant Access as Administrator Umapathy
              </button>
            )}
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col items-center gap-3">
            <InstallPwaButton className="w-full justify-center py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20" />
            <div className="flex items-center gap-1.5 text-[11px] text-purple-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invite-Only Access • Multi-Device Concurrent Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
