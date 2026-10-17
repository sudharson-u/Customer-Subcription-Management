'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, MessageSquare, Edit, RefreshCw, Calendar,
  MapPin, ShieldAlert, CheckCircle, Clock, Plus, ExternalLink,
  Share2, AlertTriangle, FileText, ChevronRight
} from 'lucide-react';
import { Customer, Subscription, NewspaperCode } from '@/lib/types';
import {
  formatDate, getDaysRemaining, getStatusBadgeClass,
  generateWhatsAppReminder, generateSmsReminder, NEWSPAPERS
} from '@/lib/utils';
import RenewDialog from '@/components/customers/RenewDialog';
import CustomerNotesSection from '@/components/customers/CustomerNotesSection';
import CustomerShareSection from '@/components/customers/CustomerShareSection';
import CustomerDeleteSection from '@/components/customers/CustomerDeleteSection';
import { generateCustomersPDF } from '@/lib/pdfGenerator';

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRenewSub, setActiveRenewSub] = useState<Subscription | null>(null);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) {
        throw new Error('Subscriber record not found');
      }
      const data = await res.json();
      setCustomer(data.customer);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriber profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
        <div className="h-6 w-32 bg-purple-200/50 dark:bg-purple-900/30 rounded-lg"></div>
        <div className="card p-6 space-y-4">
          <div className="h-8 w-64 bg-purple-200/50 dark:bg-purple-900/30 rounded-lg"></div>
          <div className="h-4 w-48 bg-purple-100/50 dark:bg-purple-900/20 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 card"></div>
          <div className="h-44 card"></div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="card p-12 text-center max-w-2xl mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Subscriber Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The requested customer profile could not be located or may have been archived.
        </p>
        <Link href="/customers" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Customer Directory
        </Link>
      </div>
    );
  }

  const primarySub = customer.subscriptions?.[0];
  const subscriptions = customer.subscriptions || [];

  return (
    <div className="page-container space-y-6 max-w-6xl pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Subscribers Directory
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generateCustomersPDF([customer], { customTitle: `${customer.customer_name} Profile` })}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            title="Export official PDF profile report"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>PDF Report</span>
          </button>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="card p-6 border-l-4 border-l-purple-600">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {customer.customer_name}
              </h1>
              {primarySub?.order_no ? (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                  Order #{primarySub.order_no}
                </span>
              ) : null}
              <span className="badge badge-purple">
                {customer.customer_type || 'Regular'}
              </span>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 pt-1">
              <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{customer.address || 'Address not recorded'}</p>
                {(customer.street_area || customer.pincode) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {[customer.street_area, customer.pincode ? `PIN: ${customer.pincode}` : null].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Direct Communication shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            {customer.mobile_number ? (
              <>
                <a
                  href={`tel:+91${customer.mobile_number}`}
                  className="btn-secondary text-xs py-2.5 px-3.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 inline-flex items-center gap-1.5 font-medium shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {customer.mobile_number}</span>
                </a>
                <a
                  href={`https://wa.me/91${customer.mobile_number}?text=${encodeURIComponent(
                    generateWhatsAppReminder({
                      customerName: customer.customer_name,
                      newspaper: primarySub?.newspaper?.name || 'The Hindu',
                      endDate: primarySub?.end_date ? formatDate(primarySub.end_date) : '',
                      daysRemaining: primarySub?.end_date ? getDaysRemaining(primarySub.end_date) || 0 : 0,
                    })
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs py-2.5 px-3.5 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5 font-medium shadow-xs"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`sms:+91${customer.mobile_number}?body=${encodeURIComponent(
                    generateSmsReminder({
                      customerName: customer.customer_name,
                      newspaper: primarySub?.newspaper?.name || 'The Hindu',
                      endDate: primarySub?.end_date ? formatDate(primarySub.end_date) : '',
                      daysRemaining: primarySub?.end_date ? getDaysRemaining(primarySub.end_date) || 0 : 0,
                    })
                  )}`}
                  className="btn-secondary text-xs py-2.5 px-3.5 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center gap-1.5 font-medium shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS</span>
                </a>
              </>
            ) : (
              <span className="badge badge-amber text-xs py-1.5 px-3">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" /> Mobile Missing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions Section across the 4 Newspapers */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Newspaper Subscriptions ({subscriptions.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Covers Dinakaran, Dinamalar, NIE / DIN, and The Hindu
              </p>
            </div>
          </div>
          <Link
            href={`/customers/${customer.id}/edit#add-subscription`}
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subscription
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No active newspaper subscriptions linked to this customer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => {
              const daysLeft = sub.end_date ? getDaysRemaining(sub.end_date) : null;
              const isEndingSoon = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
              const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
              const isExpired = daysLeft !== null && daysLeft < 0;

              return (
                <div
                  key={sub.id}
                  className={`card p-5 transition-all relative overflow-hidden ${
                    isUrgent
                      ? 'border-rose-400 dark:border-rose-800 shadow-rose-100/30'
                      : isEndingSoon
                      ? 'border-amber-400 dark:border-amber-800'
                      : ''
                  }`}
                >
                  {/* Newspaper Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs shadow-xs border border-purple-200 dark:border-purple-700">
                        {sub.newspaper?.code ? sub.newspaper.code.substring(0, 3) : 'SUB'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                          {sub.newspaper?.name || 'The Hindu'}
                        </h3>
                        {sub.order_no && (
                          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            Order #{sub.order_no}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={getStatusBadgeClass(sub.status)}>
                      {sub.status}
                    </span>
                  </div>

                  {/* Dates & Timeline */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2 mb-4 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                        {sub.start_date ? formatDate(sub.start_date) : 'Not recorded'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                        {sub.end_date ? formatDate(sub.end_date) : 'Open/Continuous'}
                      </span>
                    </div>

                    {daysLeft !== null && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-gray-500 dark:text-gray-400">Validity:</span>
                        <span
                          className={`font-bold ${
                            isExpired
                              ? 'text-rose-600 dark:text-rose-400'
                              : isUrgent
                              ? 'text-rose-600 dark:text-rose-400'
                              : isEndingSoon
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isExpired
                            ? `Expired ${Math.abs(daysLeft)} days ago`
                            : daysLeft === 0
                            ? 'Expires Today'
                            : `${daysLeft} days remaining`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Badges / Warnings */}
                  <div className="space-y-1 mb-4">
                    {sub.is_end_date_calculated && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> End date auto-calculated (+1 yr from start)
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => setActiveRenewSub(sub)}
                      className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Renew
                    </button>

                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Modify</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes and Instructions Section */}
      <CustomerNotesSection
        customerId={customer.id}
        initialNotes={customer.notes || ''}
        lastUpdated={customer.updated_at}
      />

      {/* Shareable Subscriber Record */}
      <CustomerShareSection customer={customer} currentSub={primarySub} />

      {/* Delete / Archive Section */}
      <CustomerDeleteSection
        customerId={customer.id}
        customerName={customer.customer_name}
      />

      {/* Renew Modal Dialog */}
      {activeRenewSub && (
        <RenewDialog
          customer={customer}
          subscription={activeRenewSub}
          onClose={() => setActiveRenewSub(null)}
          onSuccess={() => {
            setActiveRenewSub(null);
            fetchCustomer();
          }}
        />
      )}
    </div>
  );
}
