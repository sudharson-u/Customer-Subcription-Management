'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, CheckCircle, Clock, AlertTriangle, AlertCircle,
  MessageSquare, Phone, RefreshCw, CheckCheck, Trash2, Filter
} from 'lucide-react';
import { Notification, Customer, Subscription } from '@/lib/types';
import {
  formatDate, calculateDaysRemaining, generateWhatsAppReminder,
  generateSmsReminder, NEWSPAPERS_META, cn
} from '@/lib/utils';
import RenewDialog from '@/components/customers/RenewDialog';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [activeRenewCustomer, setActiveRenewCustomer] = useState<{
    customer: Customer;
    subscription: Subscription;
  } | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark_read' }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {}
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {}
  };

  const today = new Date();

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read_at;
    if (activeTab === 'urgent') return n.urgency_tier === 'urgent' || n.urgency_tier === 'critical';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const urgentCount = notifications.filter((n) => n.urgency_tier === 'urgent' || n.urgency_tier === 'critical').length;

  return (
    <div className="page-container space-y-6 max-w-5xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-purple-600" />
              Notifications & Reminders
            </h1>
            {unreadCount > 0 && (
              <span className="badge badge-purple text-xs font-mono font-bold">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time renewal reminder alerts for subscriptions in the 30-day window (1 Month) across 4 publications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'unread'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-gray-500">Checking renewal alerts...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              All Caught Up!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No pending notifications in this view. Subscribers due for renewal will appear automatically 30 days before expiry.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-purple-100 dark:divide-[#2C185A]">
            {filteredNotifs.map((n) => {
              const cust = n.customers || {};
              const sub = n.subscriptions || {};
              const paper = sub.newspapers || {};
              const days = sub.end_date ? calculateDaysRemaining(sub.end_date, today) : null;
              const isUrgent = n.urgency_tier === 'urgent' || n.urgency_tier === 'critical';
              const isRead = !!n.read_at;

              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 transition-colors ${
                    !isRead
                      ? 'bg-purple-50/40 dark:bg-purple-950/20'
                      : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUrgent
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isUrgent ? 'URGENT RENEWAL' : 'RENEWAL DUE (30d)'}
                        </span>

                        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                          {paper.name || 'The Hindu'}
                        </span>

                        <Link
                          href={`/customers/${cust.id}`}
                          className="font-bold text-sm text-gray-900 dark:text-white hover:text-purple-600 transition-colors"
                        >
                          {cust.customer_name}
                        </Link>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Subscription for <strong>{paper.name || 'The Hindu'}</strong> ends on{' '}
                        <strong>{formatDate(sub.end_date)}</strong>{' '}
                        {days !== null && (
                          <span className={isUrgent ? 'text-rose-600 font-bold' : 'text-amber-600 font-semibold'}>
                            ({days < 0 ? `${Math.abs(days)} days ago` : `${days} days remaining`})
                          </span>
                        )}
                        .
                      </p>

                      {cust.address && (
                        <p className="text-[11px] text-gray-400 truncate max-w-xl">
                          📍 {cust.address}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end flex-shrink-0">
                      {cust.mobile_number && (
                        <>
                          <a
                            href={`https://wa.me/91${cust.mobile_number}?text=${encodeURIComponent(
                              generateWhatsAppReminder({
                                customerName: cust.customer_name,
                                newspaper: paper.name || 'The Hindu',
                                endDate: sub.end_date ? formatDate(sub.end_date) : '',
                                daysRemaining: days ?? 0,
                              })
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-xs py-1.5 px-2.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 inline-flex items-center gap-1"
                            title="Send WhatsApp renewal message"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`tel:+91${cust.mobile_number}`}
                            className="btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                            title="Call customer"
                          >
                            <Phone className="w-3.5 h-3.5 text-purple-600" />
                            <span>Call</span>
                          </a>
                        </>
                      )}

                      <button
                        onClick={() =>
                          setActiveRenewCustomer({
                            customer: cust,
                            subscription: sub,
                          })
                        }
                        className="btn-primary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Renew</span>
                      </button>

                      {!isRead ? (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="btn-secondary text-xs py-1.5 px-2 text-gray-500 hover:text-gray-800"
                          title="Mark read"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDismiss(n.id)}
                          className="btn-secondary text-xs py-1.5 px-2 text-gray-400 hover:text-rose-600"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Renew Modal Dialog */}
      {activeRenewCustomer && (
        <RenewDialog
          customer={activeRenewCustomer.customer}
          subscription={activeRenewCustomer.subscription}
          onClose={() => setActiveRenewCustomer(null)}
          onSuccess={() => {
            setActiveRenewCustomer(null);
            fetchNotifications();
          }}
        />
      )}
    </div>
  );
}
