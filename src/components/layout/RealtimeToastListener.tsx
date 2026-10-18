'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { TABLES } from '@/lib/supabase/tables';
import { RefreshCw, Users, CheckCircle, X } from 'lucide-react';
import { isRecentLocalUpdate } from '@/lib/syncTracker';

export default function RealtimeToastListener() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.SUBSCRIPTIONS },
        (payload: any) => {
          const eventType = payload.eventType;
          const subId = payload.new?.id;
          const custId = payload.new?.customer_id;

          // If this edit originated locally on this device, skip the false external notification
          if (isRecentLocalUpdate(subId) || isRecentLocalUpdate(custId)) {
            return;
          }

          if (eventType === 'INSERT') {
            setToastMessage('New subscription added by administrator just now');
          } else if (eventType === 'UPDATE') {
            setToastMessage('Subscription status / renewal updated on another device');
          }
          setTimeout(() => setToastMessage(null), 4500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.CUSTOMERS },
        (payload: any) => {
          const custId = payload.new?.id;
          // If this edit originated locally on this device, skip the false external notification
          if (isRecentLocalUpdate(custId)) {
            return;
          }

          if (payload.eventType === 'UPDATE') {
            setToastMessage('Customer record synchronized live from another device');
            setTimeout(() => setToastMessage(null), 4500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1B0B3B] text-white border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-xs font-semibold text-purple-100">{toastMessage}</p>
        <button
          onClick={() => setToastMessage(null)}
          className="ml-2 text-purple-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
