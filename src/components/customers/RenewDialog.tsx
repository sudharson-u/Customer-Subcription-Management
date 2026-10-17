'use client';

import { useState } from 'react';
import { X, RefreshCw, Loader2, Calendar } from 'lucide-react';
import { Customer, Subscription } from '@/lib/types';
import { formatDate, NEWSPAPERS_META, cn } from '@/lib/utils';
import { parseISO, addYears, addMonths, subDays, format } from 'date-fns';

interface RenewDialogProps {
  customer: Customer;
  subscription: Subscription;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenewDialog({
  customer,
  subscription,
  onClose,
  onSuccess,
}: RenewDialogProps) {
  const currentEnd = subscription.end_date ? parseISO(subscription.end_date) : new Date();
  const nextStart = format(new Date(currentEnd.getTime() + 86400000), 'yyyy-MM-dd');
  const nextEndDefault = format(subDays(addYears(parseISO(nextStart), 1), 1), 'yyyy-MM-dd');

  const [newStartDate, setNewStartDate] = useState(nextStart);
  const [newEndDate, setNewEndDate] = useState(nextEndDefault);
  const [orderNo, setOrderNo] = useState(subscription.order_no || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const paperCode = (subscription.newspaper as any)?.code || (subscription as any).newspaper || 'THE_HINDU';
  const paperMeta = NEWSPAPERS_META[paperCode as keyof typeof NEWSPAPERS_META] || NEWSPAPERS_META.THE_HINDU;


  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/customers/${customer.id}/renew`, {
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#150A2E] rounded-2xl shadow-2xl w-full max-w-lg border border-purple-200 dark:border-[#2C185A] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 dark:border-[#2C185A] bg-purple-50/50 dark:bg-[#1F1042]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Renew Subscription</h2>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {paperMeta.name} • {customer.customer_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Current Status Box */}
          <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 dark:text-purple-300 font-bold">Current Subscription Expiry</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatDate(subscription.end_date)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500 dark:text-purple-400">
              <span>Customer Mobile</span>
              <span className="font-mono">{customer.mobile_number || 'Missing'}</span>
            </div>
          </div>



          {/* Renewal Form */}
          <form onSubmit={handleRenewSubmit} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">New Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => {
                    setNewStartDate(e.target.value);
                    if (e.target.value) {
                      const autoEnd = subDays(addYears(parseISO(e.target.value), 1), 1);
                      setNewEndDate(format(autoEnd, 'yyyy-MM-dd'));
                    }
                  }}
                  required
                  className="form-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="form-label">New End Date (1 Year)</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  required
                  className="form-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="form-label">New Order / Receipt Number</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g. 1403305"
                className="form-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="form-label">Renewal Notes</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment mode, cash receipt, or collector notes"
                className="form-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-100 dark:border-[#2C185A]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
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
