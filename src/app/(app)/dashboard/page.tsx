import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers } from '@/lib/mockData';
import {
  formatDate,
  calculateStatus,
  calculateDaysRemaining,
  formatOrderId,
  NEWSPAPERS_META,
  cn,
} from '@/lib/utils';
import {
  Users, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw,
  TrendingUp, ArrowRight, Phone, Plus, Download, FileText
} from 'lucide-react';
import Link from 'next/link';
import { NewspaperCode } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  let customers: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select(`
          *,
          subscriptions:${TABLES.SUBSCRIPTIONS}(
            *,
            newspaper:${TABLES.NEWSPAPERS}(code, name, accent_color)
          )
        `)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching dashboard customers:', error);
        customers = getMockCustomers();
      } else {
        customers = data || [];
      }
    } catch (err) {
      console.error('Failed to get dashboard data:', err);
      customers = getMockCustomers();
    }
  } else {
    customers = getMockCustomers();
  }

  const today = new Date();

  const stats = {
    totalCustomers: customers.length,
    totalSubscriptions: 0,
    active: 0,
    expiring30Days: 0,
    expiring7Days: 0,
    expired: 0,
    staffAndFree: 0,
    paperBreakdown: {
      DINAKARAN: 0,
      DINAMALAR: 0,
      NIE_DIN: 0,
      THE_HINDU: 0,
    } as Record<NewspaperCode, number>,
  };

  const upcomingRenewals: any[] = [];

  customers.forEach((c) => {
    (c.subscriptions || []).forEach((s: any) => {
      stats.totalSubscriptions++;
      const pCode = (s.newspaper?.code || (s as any).newspaper || 'THE_HINDU') as NewspaperCode;
      if (stats.paperBreakdown[pCode] !== undefined) {
        stats.paperBreakdown[pCode]++;
      }

      if (s.status === 'Staff' || s.status === 'Free') {
        stats.staffAndFree++;
      }

      // Count active subscriptions across circulation
      if (s.status !== 'Dropped' && s.status !== 'Cancelled' && s.status !== 'Inactive') {
        stats.active++;
      }

      const status = calculateStatus(s.end_date, s.status, today);
      const days = calculateDaysRemaining(s.end_date, today);

      if (status === 'Expiring') {
        stats.expiring30Days++;
        if (days !== null && days <= 7) stats.expiring7Days++;
        upcomingRenewals.push({ customer: c, subscription: s, daysRemaining: days });
      } else if (status === 'Expired') {
        stats.expired++;
        if (days !== null && days >= -30) {
          upcomingRenewals.push({ customer: c, subscription: s, daysRemaining: days });
        }
      }
    });
  });

  upcomingRenewals.sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

  return {
    stats,
    upcomingRenewals: upcomingRenewals.slice(0, 10),
  };
}

export default async function DashboardPage() {
  const { stats, upcomingRenewals } = await getDashboardData();

  const kpiCards = [
    { label: 'Total Subscribers', value: stats.totalSubscriptions, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/60' },
    { label: 'Active Subscriptions', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/60' },
    { label: 'Expiring in 30 Days', value: stats.expiring30Days, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/60', pulse: stats.expiring30Days > 0 },
    { label: 'Already Expired', value: stats.expired, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/60' },
    { label: 'Staff & Free Copies', value: stats.staffAndFree, icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/60' },
  ];

  const paperStats = [
    { code: 'DINAKARAN', label: 'Dinakaran', count: stats.paperBreakdown.DINAKARAN, meta: NEWSPAPERS_META.DINAKARAN },
    { code: 'DINAMALAR', label: 'Dinamalar', count: stats.paperBreakdown.DINAMALAR, meta: NEWSPAPERS_META.DINAMALAR },
    { code: 'NIE_DIN', label: 'NIE / DIN', count: stats.paperBreakdown.NIE_DIN, meta: NEWSPAPERS_META.NIE_DIN },
    { code: 'THE_HINDU', label: 'The Hindu', count: stats.paperBreakdown.THE_HINDU, meta: NEWSPAPERS_META.THE_HINDU },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1B0B3B] dark:text-white tracking-tight">
              Circulation Dashboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-purple-700/80 dark:text-purple-300">
            Royapuram, Chennai-13 • 4 Newspapers Subscription & Expiry Center
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <Link href="/import" className="btn-secondary text-xs py-2 px-3">
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </Link>
          <Link href="/reports" className="btn-secondary text-xs py-2 px-3">
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">PDF Report</span>
          </Link>
          <Link href="/customers" className="btn-primary text-xs py-2 px-3.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Customer Roster</span>
          </Link>
        </div>
      </div>

      {/* 4 Publications Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {paperStats.map((p) => (
          <Link
            key={p.code}
            href={`/customers?paper=${p.code}`}
            className="card p-4 hover:border-purple-400 transition-all group block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('newspaper-chip', p.meta.badgeClass)}>
                {p.meta.name}
              </span>
              <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-purple-400 group-hover:text-purple-600">
                View →
              </span>
            </div>
            <p className="text-2xl font-black font-mono text-[#1B0B3B] dark:text-white tracking-tight">
              {p.count}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-purple-300/80 mt-0.5">Active Subscribers</p>
          </Link>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {kpiCards.map((card) => (
          <div key={card.label} className={cn('kpi-card border', card.border)}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-purple-300 leading-tight mb-1">
                  {card.label}
                </p>
                <p className="text-2xl font-black font-mono tracking-tight text-[#1B0B3B] dark:text-white">
                  {card.value}
                </p>
              </div>
              <div className={cn('p-2 rounded-xl flex-shrink-0', card.bg)}>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Renewals Table */}
      <div className="card overflow-hidden border border-purple-200/80 dark:border-[#2C185A]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-100 dark:border-[#2C185A] bg-purple-50/50 dark:bg-[#1F1042]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold text-[#1B0B3B] dark:text-white uppercase tracking-wider">
              🔔 Upcoming 30-Day Renewals ({upcomingRenewals.length})
            </h2>
          </div>
          <Link
            href="/renewals"
            className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 font-bold flex items-center gap-1"
          >
            Open Renewals Hub <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {upcomingRenewals.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-[#1B0B3B] dark:text-white">All subscriptions are up to date!</p>
            <p className="text-xs text-gray-400 dark:text-purple-300 mt-1">
              No subscriptions are expiring within the next 30 days.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Publication</th>
                    <th>Subscriber</th>
                    <th>Mobile</th>
                    <th>Order ID</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRenewals.map(({ customer, subscription, daysRemaining }) => {
                    const paperCode = (subscription.newspaper?.code || subscription.newspaper || 'THE_HINDU') as NewspaperCode;
                    const paperMeta = NEWSPAPERS_META[paperCode] || NEWSPAPERS_META.THE_HINDU;
                    return (
                      <tr key={subscription.id}>
                        <td>
                          <span className={cn('newspaper-chip', paperMeta.badgeClass)}>
                            {paperMeta.name}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-gray-900 dark:text-white">{customer.customer_name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[220px]">{customer.address}</div>
                        </td>
                        <td>
                          {customer.mobile_number ? (
                            <a
                              href={`tel:+91${customer.mobile_number}`}
                              className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold text-xs hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {customer.mobile_number}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Missing</span>
                          )}
                        </td>
                        <td className="text-xs font-mono text-gray-500">{formatOrderId(subscription.order_no) || '—'}</td>
                        <td className="text-xs font-bold font-mono text-gray-800 dark:text-purple-200">
                          {formatDate(subscription.end_date)}
                        </td>
                        <td>
                          <span
                            className={cn(
                              'text-xs font-black font-mono px-2 py-0.5 rounded-full',
                              daysRemaining < 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : daysRemaining <= 7
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 animate-pulse'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            )}
                          >
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d left`}
                          </span>
                        </td>
                        <td className="text-right pr-4">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                          >
                            Profile →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-purple-100 dark:divide-[#2C185A]">
              {upcomingRenewals.map(({ customer, subscription, daysRemaining }) => {
                const paperCode = (subscription.newspaper?.code || subscription.newspaper || 'THE_HINDU') as NewspaperCode;
                const paperMeta = NEWSPAPERS_META[paperCode] || NEWSPAPERS_META.THE_HINDU;
                return (
                  <Link
                    key={subscription.id}
                    href={`/customers/${customer.id}`}
                    className="p-4 block hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('newspaper-chip text-[10px]', paperMeta.badgeClass)}>
                          {paperMeta.short}
                        </span>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{customer.customer_name}</p>
                      </div>
                      <span className={cn(
                        'text-xs font-black font-mono',
                        daysRemaining <= 7 ? 'text-orange-600' : 'text-amber-600'
                      )}>
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d left`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-purple-300/80 truncate">{customer.address}</p>

                    <div className="flex items-center justify-between text-xs mt-2 text-gray-400">
                      <span>Expires {formatDate(subscription.end_date)}</span>
                      <span className="text-purple-600 font-bold">View Profile →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
