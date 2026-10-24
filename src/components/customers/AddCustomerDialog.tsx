'use client';

import { useState } from 'react';
import { X, Plus, AlertCircle, Loader2, Calendar, Phone, Check } from 'lucide-react';
import { NewspaperCode, CustomerType } from '@/lib/types';
import { NEWSPAPERS_META, cn, sanitizePhone } from '@/lib/utils';
import { format, parseISO, addYears, subDays } from 'date-fns';

interface AddCustomerDialogProps {
  defaultNewspaper?: NewspaperCode;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerDialog({
  defaultNewspaper = 'THE_HINDU',
  onClose,
  onSuccess,
}: AddCustomerDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [streetArea, setStreetArea] = useState('Royapuram');
  const [customerType, setCustomerType] = useState<CustomerType>('Regular');
  const [notes, setNotes] = useState('');

  // Subscription details
  const [newspaper, setNewspaper] = useState<NewspaperCode>(defaultNewspaper);
  const [orderNo, setOrderNo] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(
    format(subDays(addYears(new Date(), 1), 1), 'yyyy-MM-dd')
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      try {
        const parsed = parseISO(val);
        const autoEnd = subDays(addYears(parsed, 1), 1);
        setEndDate(format(autoEnd, 'yyyy-MM-dd'));
      } catch {}
    }
  };

  const handlePhoneChange = async (val: string) => {
    setMobileNumber(val);
    const clean = sanitizePhone(val);
    if (clean.length === 10) {
      try {
        const res = await fetch(`/api/customers?check_mobile=${clean}`);
        const data = await res.json();
        if (data.exists) {
          const names = data.existing_customers?.map((c: any) => c.name).join(', ') || data.customer_name;
          setPhoneWarning(`Note: Mobile ${clean} is currently linked to ${names}. If this is a different subscriber, a separate customer record will be created.`);
        } else {
          setPhoneWarning('');
        }
      } catch {}
    } else {
      setPhoneWarning('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          mobile_number: sanitizePhone(mobileNumber),
          email: email.trim(),
          address: address.trim(),
          street_area: streetArea.trim(),
          customer_type: customerType,
          notes: notes.trim(),
          newspaper,
          order_no: orderNo.trim(),
          start_date: customerType === 'Staff' || customerType === 'Free Copy' ? null : startDate,
          end_date: customerType === 'Staff' || customerType === 'Free Copy' ? null : endDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add customer.');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
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
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Add New Subscriber</h2>
              <p className="text-xs text-purple-600 dark:text-purple-400">Royapuram Distribution Zone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {phoneWarning && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>{phoneWarning}</span>
            </div>
          )}

          {/* Publication Selection */}
          <div>
            <label className="form-label">Publication *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['DINAKARAN', 'DINAMALAR', 'NIE_DIN', 'THE_HINDU'] as NewspaperCode[]).map((code) => {
                const meta = NEWSPAPERS_META[code];
                const isSelected = newspaper === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setNewspaper(code)}
                    className={cn(
                      'py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1',
                      isSelected
                        ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                        : 'border-purple-200 dark:border-purple-900/60 bg-white dark:bg-[#1F1042] text-gray-700 dark:text-purple-200 hover:border-purple-400'
                    )}
                  >
                    <span>{meta.name}</span>
                    <span className={cn('text-[10px] font-mono px-1 rounded', isSelected ? 'bg-white/20 text-white' : 'text-purple-500')}>
                      [{meta.short}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Guhanathan"
                required
                className="form-input text-sm"
              />
            </div>

            <div>
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="10-digit mobile"
                className="form-input text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Delivery Address</label>
            <textarea
              rows={2}
              value={address || ''}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Door No, Street Name, Royapuram, Chennai-13"
              className="form-input text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Customer Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className="form-input text-sm"
              >
                <option value="Regular">Regular</option>
                <option value="Staff">Office Staff</option>
                <option value="Free Copy">Free Copy</option>
                <option value="Business/Institution">Business / Org</option>
              </select>
            </div>

            <div>
              <label className="form-label">Area / Street</label>
              <input
                type="text"
                value={streetArea}
                onChange={(e) => setStreetArea(e.target.value)}
                placeholder="Royapuram"
                className="form-input text-sm"
              />
            </div>

            <div>
              <label className="form-label">Order / Reg ID</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g. 1343636"
                className="form-input text-sm font-mono"
              />
            </div>
          </div>

          {customerType !== 'Staff' && customerType !== 'Free Copy' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="form-input text-sm font-mono"
                />
              </div>

              <div>
                <label className="form-label">End Date (Auto 1-Year)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input text-sm font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Internal Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery notes, landmark, or payment details"
              className="form-input text-sm"
            />
          </div>

          {/* Buttons */}
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
              className="btn-primary text-xs py-2 px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Save Subscriber
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
