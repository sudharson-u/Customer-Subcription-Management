import { cache } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { LayoutDashboard, Users, RefreshCw, Bell, FileText } from 'lucide-react';

const getAuthUser = cache(async () => {
  const cookieStore = await cookies();
  const hasDemo = cookieStore.get('demo_session')?.value === 'true';

  if (hasDemo) {
    return {
      id: 'admin-umapathy-id',
      email: 'ukss61925@gmail.com',
      user_metadata: { name: 'Umapathy' },
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  return null;
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-[#F8F7FF] dark:bg-[#0D051D] text-[#1B0B3B] dark:text-[#F5F3FF] overflow-hidden transition-colors duration-200">
      {/* Collapsible / Responsive Desktop Sidebar */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Phones) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 frosted-header border-t border-purple-200 dark:border-[#2C185A] flex items-center justify-around z-40 px-2">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 hover:text-purple-900 py-1 flex-1"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Overview</span>
          </Link>
          <Link
            href="/customers"
            className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 hover:text-purple-900 py-1 flex-1"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Subscribers</span>
          </Link>
          <Link
            href="/renewals"
            className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 hover:text-purple-900 py-1 flex-1 relative"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Renewals</span>
          </Link>
          <Link
            href="/reports"
            className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 hover:text-purple-900 py-1 flex-1 relative"
          >
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-bold mt-0.5">Reports</span>
          </Link>
          <Link
            href="/notifications"
            className="flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 hover:text-purple-900 py-1 flex-1"
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Alerts</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
