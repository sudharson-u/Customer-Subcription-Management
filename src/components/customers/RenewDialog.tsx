'use client';

import { useState } from 'react';
import { X, RefreshCw, Loader2, Calendar, Check } from 'lucide-react';
import { Customer, Subscription } from '@/lib/types';
import { formatDate, calculateEndDate, NEWSPAPERS_META, cn } from '@/lib/utils';
import { parseISO, addDays, format } from 'date-fns';

interface RenewDialogProps {
  customer: Customer;
  subscription: Subscription;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_PRESETS = [
  { label: '1 Year', months: 12 },
  { label: '6 Months', months: 6 },
  { label: '3 Months', months: 3 },
  { label: '1 Month', months: 1 },
];

export default function RenewDialog({
  customer,
  subscription,
  onClose,
  onSuccess,
}: RenewDialogProps) {
  // Extract real customer UUID (safely handle any composite customer id)
  const realCustomerId =
    (customer as any).customerId ||
    (customer.id?.includes('__sub_') ? customer.id.split('__sub_')[0] : customer.id);

  // Compute clean next start date (1 day after previous expiry)
  const baseEnd = subscription.end_date ? parseISO(subscription.end_date) : new Date();
  const nextStart = format(addDays(baseEnd, 1), 'yyyy-MM-dd');
  const defaultNextEnd = calculateEndDate(nextStart, 12) || format(addDays(baseEnd, 365), 'yyyy-MM-dd');

  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [newStartDate, setNewStartDate] = useState(nextStart);
  const [newEndDate, setNewEndDate] = useState(defaultNextEnd);
  const [orderNo, setOrderNo] = useState(subscription.order_no || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const paperCode = (subscription.newspaper as any)?.code || (subscription as any).newspaper || 'THE_HINDU';
  const paperMeta = NEWSPAPERS_META[paperCode as keyof typeof NEWSPAPERS_META] || NEWSPAPERS_META.THE_HINDU;

  const handleDurationSelect = (months: number) => {
    setSelectedDuration(months);
    if (newStartDate) {
      const calculatedEnd = calculateEndDate(newStartDate, months);
      if (calculatedEnd) setNewEndDate(calculatedEnd);
    }
  };

  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    if (val && selectedDuration) {
      const calculatedEnd = calculateEndDate(val, selectedDuration);
      if (calculatedEnd) setNewEndDate(calculatedEnd);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/customers/${realCustomerId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscription.id,
          new_start_date: newStartDate,
          new_end_date: newEndDate,
          order_no: orderNo,
          remarks,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || 'Renewal failed');
      }
    } catch {
      alert('Network error. Renewal failed.');
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#150A2E] rounded-2xl shadow-2xl w-full max-w-lg border border-purple-200 dark:border-[#2C185A] overflow-hidden my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-purple-100 dark:border-[#2C185A] bg-purple-50/50 dark:bg-[#1F1042]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Renew Subscription</h2>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                {paperMeta.name} • {customer.customer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Current Status Box */}
          <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 dark:text-purple-300 font-bold">Current Subscription Expiry</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatDate(subscription.end_date)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500 dark:text-purple-400">
              <span>Customer Mobile</span>
              <span className="font-mono font-medium">{customer.mobile_number || 'Missing'}</span>
            </div>
          </div>

          {/* Quick Duration Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-purple-300">Renewal Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_PRESETS.map((p) => {
                const isSelected = selectedDuration === p.months;
                return (
                  <button
                    key={p.months}
                    type="button"
                    onClick={() => handleDurationSelect(p.months)}
                    className={cn(
                      'py-1.5 px-2 text-xs font-bold rounded-lg border transition-all text-center',
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-gray-50 dark:bg-purple-950/30 text-gray-700 dark:text-purple-300 border-gray-200 dark:border-purple-900/50 hover:border-purple-400'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Renewal Form */}
          <form onSubmit={handleRenewSubmit} className="space-y-3.5 pt-1">
            {/* Date inputs: 1 column on mobile, 2 columns on tablet/desktop to ensure full year visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs font-bold text-gray-700 dark:text-purple-300">
                  New Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    className="form-input text-xs sm:text-sm font-mono tracking-tight py-2 px-3 w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs font-bold text-gray-700 dark:text-purple-300">
                  New End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => {
                      setNewEndDate(e.target.value);
                      setSelectedDuration(0); // custom
                    }}
                    required
                    className="form-input text-xs sm:text-sm font-mono tracking-tight py-2 px-3 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Clear Renewal Term Preview Badge */}
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Renewal Term:</span>
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-purple-100 flex items-center gap-1.5">
                <span>{formatDate(newStartDate)}</span>
                <span className="text-purple-400">→</span>
                <span className="text-purple-700 dark:text-purple-300">{formatDate(newEndDate)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label text-xs font-bold text-gray-700 dark:text-purple-300">
                New Order / Receipt Number
              </label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g. 1403305"
                className="form-input text-xs sm:text-sm font-mono py-2 px-3 w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label text-xs font-bold text-gray-700 dark:text-purple-300">
                Renewal Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment mode, cash receipt, or collector notes"
                className="form-input text-xs sm:text-sm py-2 px-3 w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-100 dark:border-[#2C185A]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Renewing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Confirm Renewal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
