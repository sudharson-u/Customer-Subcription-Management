'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Trash2, Plus, Calendar, AlertTriangle,
  User, Phone, Mail, MapPin, CheckCircle, Loader2
} from 'lucide-react';
import { Customer, Subscription, NewspaperCode, CustomerType, SubscriptionStatus } from '@/lib/types';
import { NEWSPAPERS, calculateEndDate, parseDateString } from '@/lib/utils';

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('Regular');
  const [notes, setNotes] = useState('');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/customers/${id}`);
        if (!res.ok) throw new Error('Customer not found');
        const data = await res.json();
        const c: Customer = data.customer;

        setCustomerName(c.customer_name || '');
        setMobileNumber(c.mobile_number || '');
        setEmail(c.email || '');
        setAddress(c.address || '');
        setStreetArea(c.street_area || '');
        setPincode(c.pincode || '');
        setCustomerType(c.customer_type || 'Regular');
        setNotes(c.notes || '');

        const subs = (c.subscriptions || []).map((s) => ({
          id: s.id,
          newspaper_id: s.newspaper_id,
          code: s.newspaper?.code || 'THE_HINDU',
          order_no: s.order_no || '',
          start_date: s.start_date ? s.start_date.substring(0, 10) : '',
          end_date: s.end_date ? s.end_date.substring(0, 10) : '',
          status: s.status || 'Active',
          is_end_date_calculated: s.is_end_date_calculated || false,
        }));
        setSubscriptions(subs);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch customer');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  const handleAddSubscription = () => {
    const defaultNewspaper = NEWSPAPERS[0];
    const today = new Date().toISOString().substring(0, 10);
    const calculatedEnd = calculateEndDate(today, 12);

    setSubscriptions([
      ...subscriptions,
      {
        id: `temp-${Date.now()}`,
        newspaper_id: defaultNewspaper.id,
        code: defaultNewspaper.code,
        order_no: '',
        start_date: today,
        end_date: calculatedEnd || '',
        status: 'Active',
        is_end_date_calculated: true,
      },
    ]);
  };

  const handleRemoveSubscription = (index: number) => {
    setSubscriptions(subscriptions.filter((_, idx) => idx !== index));
  };

  const handleSubChange = (index: number, field: string, value: any) => {
    const updated = [...subscriptions];
    updated[index][field] = value;

    if (field === 'code') {
      const match = NEWSPAPERS.find((n) => n.code === value);
      if (match) {
        updated[index].newspaper_id = match.id;
      }
    }

    if (field === 'start_date' && value) {
      const calcEnd = calculateEndDate(value, 12);
      if (calcEnd) {
        updated[index].end_date = calcEnd;
        updated[index].is_end_date_calculated = true;
      }
    }

    setSubscriptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSuccess(false);

    try {
      if (!customerName.trim()) {
        throw new Error('Customer name is required');
      }

      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          mobile_number: mobileNumber.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          street_area: streetArea.trim() || undefined,
          pincode: pincode.trim() || undefined,
          customer_type: customerType,
          notes: notes.trim() || undefined,
          subscriptions: subscriptions.map((s) => ({
            id: s.id.startsWith('temp-') ? undefined : s.id,
            newspaper_id: s.newspaper_id,
            order_no: s.order_no ? s.order_no.trim() : undefined,
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            status: s.status,
            is_end_date_calculated: s.is_end_date_calculated,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update subscriber details');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/customers/${id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-purple-200/50 dark:bg-purple-900/30 rounded"></div>
        <div className="card p-8 space-y-4">
          <div className="h-8 w-64 bg-purple-200/50 dark:bg-purple-900/30 rounded"></div>
          <div className="h-32 bg-purple-100/50 dark:bg-purple-900/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/customers/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Return to Customer Profile
        </Link>
      </div>

      <div className="card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Subscriber Profile
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Update subscriber identity, Royapuram delivery address, and newspaper subscriptions.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Subscriber details successfully updated! Redirecting...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity & Contact Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Full Customer Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. R. Venkatesh"
                  className="form-input text-sm input-with-icon"
                />
                <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number (10 Digits)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9840012345"
                  className="form-input text-sm input-with-icon font-mono"
                />
                <Phone className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                  className="form-input text-sm input-with-icon"
                />
                <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Subscriber Classification
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className="form-input text-sm"
              >
                <option value="Regular">Regular Paying Customer</option>
                <option value="Staff">Office / Distribution Staff</option>
                <option value="Free Copy">Complimentary / Free Copy</option>
                <option value="Business/Institution">Business / Commercial Institution</option>
              </select>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-gray-500 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-600" /> Delivery Location Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Complete Street Address
              </label>
              <textarea
                rows={2}
                value={address || ''}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street Name, Floor, Landmark..."
                className="form-input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Area / Zone
                </label>
                <input
                  type="text"
                  value={streetArea}
                  onChange={(e) => setStreetArea(e.target.value)}
                  placeholder="Royapuram / New Washermanpet"
                  className="form-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Postal Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="600013"
                  className="form-input text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Subscriptions Management Section */}
          <div id="add-subscription" className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Active Newspaper Subscriptions ({subscriptions.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage individual subscriptions across Dinakaran, Dinamalar, NIE / DIN, and The Hindu
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSubscription}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Newspaper
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                No active subscriptions attached. Click "Add Newspaper" to configure one.
              </p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub, index) => (
                  <div
                    key={sub.id || index}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                          Subscription #{index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubscription(index)}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Publication
                        </label>
                        <select
                          value={sub.code}
                          onChange={(e) => handleSubChange(index, 'code', e.target.value)}
                          className="form-input text-xs py-1.5"
                        >
                          {NEWSPAPERS.map((n) => (
                            <option key={n.code} value={n.code}>
                              {n.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Order / Receipt No
                        </label>
                        <input
                          type="text"
                          value={sub.order_no}
                          onChange={(e) => handleSubChange(index, 'order_no', e.target.value)}
                          placeholder="e.g. 10425"
                          className="form-input text-xs py-1.5 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={sub.start_date}
                          onChange={(e) => handleSubChange(index, 'start_date', e.target.value)}
                          className="form-input text-xs py-1.5 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={sub.end_date}
                          onChange={(e) => handleSubChange(index, 'end_date', e.target.value)}
                          className="form-input text-xs py-1.5 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-500">Status:</span>
                        <select
                          value={sub.status}
                          onChange={(e) => handleSubChange(index, 'status', e.target.value as SubscriptionStatus)}
                          className="form-input text-xs py-1 px-2 w-auto"
                        >
                          <option value="Active">Active</option>
                          <option value="Expiring">Expiring (Within 30d)</option>
                          <option value="Expired">Expired</option>
                          <option value="Dropped">Dropped</option>
                          <option value="Staff">Staff</option>
                          <option value="Free">Free Copy</option>
                        </select>
                      </div>

                      {sub.is_end_date_calculated && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                          Auto-calculated (+1 yr)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Special Notes Section */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Delivery Instructions / Notes
            </label>
            <textarea
              rows={2}
              value={notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call before delivery, drop at 1st floor gate..."
              className="form-input text-sm"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              href={`/customers/${id}`}
              className="btn-secondary text-sm py-2 px-4"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm py-2 px-5 inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile & Subscriptions
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
