'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw, AlertTriangle, Clock, AlertCircle, Search,
  Download, FileText, CheckCircle, ChevronRight, Phone, MessageSquare
} from 'lucide-react';
import { Customer, NewspaperCode, Subscription } from '@/lib/types';
import {
  calculateDaysRemaining, formatDate, NEWSPAPERS_META, cn
} from '@/lib/utils';
import RenewalCustomerCard from '@/components/renewals/RenewalCustomerCard';
import { generateCustomersPDF } from '@/lib/pdfGenerator';
import { useNewspaperFilter } from '@/components/layout/NewspaperFilterPills';

export default function RenewalsPage() {
  const { selectedPaper } = useNewspaperFilter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'soon' | 'expired'>('all');
  const todayString = new Date().toISOString();

  const fetchRenewals = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all customers with limit 500
      const params = new URLSearchParams({
        paper: selectedPaper,
        limit: '500',
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPaper]);

  useEffect(() => {
    fetchRenewals();
  }, [fetchRenewals]);

  // Filter only customers who have active or expiring subscriptions in the 30-day window or expired
  const renewalItems = useMemo(() => {
    const today = new Date(todayString);

    return customers.flatMap((c) => {
      const validSubs = (c.subscriptions || []).filter((s) => {
        if (s.status === 'Staff' || s.status === 'Free' || s.status === 'Dropped') {
          return false;
        }
        if (!s.end_date) return false;
        const days = calculateDaysRemaining(s.end_date, today);
        if (days === null) return false;
        // Expired or expiring within 30 days
        return days <= 30;
      });

      return validSubs.map((sub) => {
        const days = calculateDaysRemaining(sub.end_date, today) ?? 0;
        return {
          customer: {
            ...c,
            subscriptions: [sub], // isolated for the card
          },
          sub,
          days,
          isUrgent: days >= 0 && days <= 7,
          isSoon: days > 7 && days <= 30,
          isExpired: days < 0,
        };
      });
    });
  }, [customers, todayString]);

  // Filter by search & activeTab
  const filteredItems = useMemo(() => {
    return renewalItems.filter((item) => {
      // Tab filter
      if (activeTab === 'soon' && !item.isSoon) return false;
      if (activeTab === 'expired' && !item.isExpired) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.customer.customer_name.toLowerCase().includes(q);
        const mobileMatch = item.customer.mobile_number?.includes(q);
        const addrMatch = item.customer.address?.toLowerCase().includes(q);
        const orderMatch = item.sub.order_no?.toLowerCase().includes(q);
        return nameMatch || mobileMatch || addrMatch || orderMatch;
      }

      return true;
    });
  }, [renewalItems, activeTab, search]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total30d = renewalItems.filter((i) => i.days >= 0 && i.days <= 30).length;
    const urgent7d = renewalItems.filter((i) => i.isUrgent).length;
    const expiredCount = renewalItems.filter((i) => i.isExpired).length;
    const soonCount = renewalItems.filter((i) => i.isSoon).length;

    return { total30d, urgent7d, expiredCount, soonCount };
  }, [renewalItems]);

  const handleExportPDF = () => {
    const targetCustomers = filteredItems.map((i) => i.customer);
    generateCustomersPDF(targetCustomers, {
      customTitle: `Renewals Due Report (30-Day Window) - ${activeTab.toUpperCase()}`,
      filterLabel: `Tab: ${activeTab} | Newspaper: ${selectedPaper}`,
    });
  };

  const handleExportCSV = () => {
    const rows = [
      ['Customer Name', 'Mobile', 'Newspaper', 'Order No', 'End Date', 'Days Remaining', 'Address'],
      ...filteredItems.map((i) => [
        `"${i.customer.customer_name}"`,
        `"${i.customer.mobile_number}"`,
        `"${i.sub.newspaper?.name || i.sub.newspaper_id}"`,
        `"${i.sub.order_no || ''}"`,
        `"${formatDate(i.sub.end_date)}"`,
        i.days,
        `"${i.customer.address.replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `renewals_${activeTab}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container space-y-6 max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin-slow" />
              Renewals & Expiry Hub
            </h1>
            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              30-Day Window (1 Month)
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Royapuram circulation renewal monitoring for Dinakaran, Dinamalar, NIE / DIN, and The Hindu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={filteredItems.length === 0}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            title="Export filtered renewals list as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            title="Export renewals to CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total in 30-Day Window */}
        <div
          onClick={() => setActiveTab('all')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'ring-2 ring-purple-600 bg-purple-50/50 dark:bg-purple-950/30'
              : 'hover:border-purple-300 dark:hover:border-purple-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-purple-300 uppercase tracking-wider">
              30-Day Window
            </span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-900 dark:text-purple-100 font-mono">
            {stats.total30d}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-purple-300 mt-1">Expiring within 30 days</p>
        </div>

        {/* Expiring Soon (8 - 30 Days) */}
        <div
          onClick={() => setActiveTab('soon')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'soon'
              ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
              : 'hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Soon (8–30 Days)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {stats.soonCount}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">First reminder sent</p>
        </div>

        {/* Already Expired */}
        <div
          onClick={() => setActiveTab('expired')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'expired'
              ? 'ring-2 ring-gray-600 bg-gray-50/80 dark:bg-gray-800/40'
              : 'hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Expired
            </span>
            <AlertTriangle className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-700 dark:text-gray-300 font-mono">
            {stats.expiredCount}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Requires reactivation</p>
        </div>
      </div>

      {/* Control bar: Tabs & Search */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Due ({renewalItems.length})
            </button>
            <button
              onClick={() => setActiveTab('soon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'soon'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-amber-500'
              }`}
            >
              8–30 Days ({stats.soonCount})
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'expired'
                  ? 'bg-gray-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-700'
              }`}
            >
              Expired ({stats.expiredCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscriber, phone, order..."
              className="form-input text-xs input-with-search pr-8 py-2 w-full"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 absolute right-2.5 top-2.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Renewals Items List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-gray-500">Loading renewal pipeline...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Renewals Found in this Filter
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              There are no customer subscriptions currently matching the "{activeTab}" filter for the selected newspaper.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-purple-100 dark:divide-[#2C185A]">
            {filteredItems.map((item, index) => (
              <RenewalCustomerCard
                key={`${item.customer.id}-${item.sub.id || index}`}
                customer={item.customer}
                todayString={todayString}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
