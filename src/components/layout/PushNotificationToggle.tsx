'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleToggle = async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      if (isSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Subscribe to push
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
          });

          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          setIsSubscribed(true);
        }
      }
    } catch (err) {
      console.warn('Push notification subscription error:', err);
    }
    setLoading(false);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center',
        isSubscribed
          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
          : 'bg-gray-100 dark:bg-purple-950/40 text-gray-500 dark:text-purple-300 border-gray-200 dark:border-purple-900/60 hover:text-purple-600'
      )}
      title={isSubscribed ? 'Renewal push notifications active (Click to disable)' : 'Enable instant renewal push notifications'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
      ) : isSubscribed ? (
        <Bell className="w-4 h-4 fill-purple-600/20 text-purple-600 dark:text-purple-400" />
      ) : (
        <BellOff className="w-4 h-4 text-current" />
      )}
    </button>
  );
}
