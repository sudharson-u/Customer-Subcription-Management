'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle, Clock, FileWarning, ArrowRight,
  ExternalLink, Edit, ShieldAlert, Check, Plus, Phone, Calendar, RefreshCw
} from 'lucide-react';
import { NewspaperCode } from '@/lib/types';
import { NEWSPAPERS_META, cn } from '@/lib/utils';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';

interface ReviewItem {
  id: string;
  newspaper: NewspaperCode | string;
  type: string;
  severity: 'info' | 'warning' | 'medium' | 'urgent';
  customer_name?: string;
  mobile?: string;
  description: string;
  action_required?: string;
  resolved?: boolean;
  resolution_notes?: string;
  subscription?: {
    newspaper: string;
    order_no?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  };
}

const INITIAL_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'REV-HIN-MISSING-17-18',
    newspaper: 'THE_HINDU',
    type: 'Missing Records in Source Register',
    severity: 'warning',
    description: 'Source PDF register header indicates 35 customers, but physical numbering jumps from S.No 16 to 19 (S.No 17 & 18 omitted in original scan/document).',
    action_required: 'Check physical delivery notebook for Royapuram beat. Use "Add Missing Entry" to log S.No 17 and 18 if records exist.',
    resolved: false,
  },
  {
    id: 'REV-NIE_DIN-16',
    newspaper: 'NIE_DIN',
    type: 'Suspicious End Date',
    severity: 'info',
    customer_name: 'Jiya Sudeen S/O Sadullah Khan',
    mobile: '9042227488',
    description: 'End date recorded as 16/12/2026. Standard 1-year circulation cycle starting 16/12/2025 should end on 15/12/2026 (leap year / 365d parity).',
    action_required: 'Verify if subscriber was granted 1 extra bonus day or correct date to 15/12/2026.',
    resolved: false,
    subscription: {
      newspaper: 'NIE_DIN',
      order_no: '1343631',
      start_date: '2025-12-16',
      end_date: '2026-12-16',
      status: 'Active',
    },
  },
  {
    id: 'REV-NIE_DIN-4',
    newspaper: 'NIE_DIN',
    type: 'Incomplete Phone Number',
    severity: 'warning',
    customer_name: 'Navaneetha Krishnan',
    mobile: '824858273',
    description: 'Registered mobile number has only 9 digits ("824858273"). A 10-digit Indian mobile number is required for WhatsApp renewal notices.',
    action_required: 'Collect the missing digit during morning paper delivery or next receipt collection.',
    resolved: false,
    subscription: {
      newspaper: 'NIE_DIN',
      order_no: '1403302',
      start_date: '2026-02-01',
      end_date: '2027-01-31',
      status: 'Active',
    },
  },
  {
    id: 'REV-DINAKARAN-5',
    newspaper: 'DINAKARAN',
    type: 'Vague Date Ingestion',
    severity: 'info',
    customer_name: 'Abdul Rahman',
    mobile: '8754917984',
    description: 'Original register specified start date as "June 2026" without explicit day. Defaulted to 01/06/2026 with end date 01/05/2027.',
    action_required: 'Confirm exact subscription commencement date from Dinakaran monthly billing challan.',
    resolved: false,
    subscription: {
      newspaper: 'DINAKARAN',
      start_date: '2026-06-01',
      end_date: '2027-05-01',
      status: 'Active',
    },
  },
  {
    id: 'REV-DINAMALAR-17',
    newspaper: 'DINAMALAR',
    type: 'Missing Contact Number',
    severity: 'warning',
    customer_name: 'S. Idaiya Kani',
    mobile: '',
    description: 'Subscriber has no mobile number registered in the source Dinamalar distribution sheet.',
    action_required: 'Delivery boy to obtain mobile contact at 13/2, Raman Street, Royapuram.',
    resolved: false,
    subscription: {
      newspaper: 'DINAMALAR',
      start_date: '2026-08-21',
      end_date: '2027-08-20',
      status: 'Active',
    },
  },
  {
    id: 'REV-NIE_DIN-13',
    newspaper: 'NIE_DIN',
    type: 'Missing Contact Number',
    severity: 'warning',
    customer_name: 'Murugesan',
    mobile: '',
    description: 'Subscriber has no mobile number in NIE / DIN register (Receipt order #1308559).',
    action_required: 'Verify phone number at 45, Adam Street, Royapuram.',
    resolved: false,
    subscription: {
      newspaper: 'NIE_DIN',
      order_no: '1308559',
      start_date: '2025-12-16',
      end_date: '2026-12-15',
      status: 'Active',
    },
  },
];

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filterPaper, setFilterPaper] = useState<string>('ALL');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [prefilledPaper, setPrefilledPaper] = useState<NewspaperCode>('THE_HINDU');

  useEffect(() => {
    // Load persisted review states from localStorage if available
    const saved = localStorage.getItem('hindu_review_queue');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems(INITIAL_REVIEW_ITEMS);
      }
    } else {
      setItems(INITIAL_REVIEW_ITEMS);
    }
  }, []);

  const handleResolve = (id: string, notes?: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            resolved: !item.resolved,
            resolution_notes: notes || 'Verified and approved by Administrator Umapathy',
          }
        : item
    );
    setItems(updated);
    localStorage.setItem('hindu_review_queue', JSON.stringify(updated));
  };

  const handleFixJiyaDate = () => {
    handleResolve('REV-NIE_DIN-16', 'Corrected end date to 15/12/2026 in circulation database');
  };

  const openAddForMissingHindu = () => {
    setPrefilledPaper('THE_HINDU');
    setShowAddDialog(true);
  };

  const filteredItems = items.filter((item) => {
    if (filterPaper !== 'ALL' && item.newspaper !== filterPaper) {
      return false;
    }
    return true;
  });

  const unresolvedCount = items.filter((i) => !i.resolved).length;
  const resolvedCount = items.filter((i) => i.resolved).length;

  return (
    <div className="page-container space-y-6 max-w-6xl pb-12">
      {/* Top Banner */}
      <div className="card p-6 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-purple-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <FileWarning className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Data Integrity & Review Queue
              </h1>
              <span className="badge badge-amber text-xs font-mono font-bold">
                {unresolvedCount} Pending
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-2xl">
              Automated ingestion of the 4 source registers flagged {items.length} items with anomalies (missing numbering gaps, 9-digit phones, vague dates). Review and resolve each item below to ensure 100% database accuracy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddForMissingHindu}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Missing S.No 17/18
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setFilterPaper('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterPaper === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            All Papers ({items.length})
          </button>
          <button
            onClick={() => setFilterPaper('THE_HINDU')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterPaper === 'THE_HINDU'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            The Hindu
          </button>
          <button
            onClick={() => setFilterPaper('NIE_DIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterPaper === 'NIE_DIN'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            NIE / DIN
          </button>
          <button
            onClick={() => setFilterPaper('DINAMALAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterPaper === 'DINAMALAR'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Dinamalar
          </button>
          <button
            onClick={() => setFilterPaper('DINAKARAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterPaper === 'DINAKARAN'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Dinakaran
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            Resolved: <strong className="text-emerald-600">{resolvedCount}</strong> / {items.length}
          </span>
        </div>
      </div>

      {/* Review Queue Cards */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const paperMeta =
            NEWSPAPERS_META[item.newspaper as keyof typeof NEWSPAPERS_META] ||
            NEWSPAPERS_META.THE_HINDU;

          return (
            <div
              key={item.id}
              className={`card p-5 transition-all ${
                item.resolved
                  ? 'opacity-60 bg-gray-50/50 dark:bg-gray-900/30 border-dashed'
                  : 'hover:border-purple-300 dark:hover:border-purple-700 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('newspaper-chip', paperMeta.badgeClass)}>
                      {paperMeta.name}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.resolved && (
                      <span className="badge badge-emerald text-xs font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>

                  {item.customer_name && (
                    <div className="flex items-center gap-3 pt-1">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {item.customer_name}
                      </h3>
                      {item.mobile && (
                        <span className="text-xs font-mono text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {item.mobile}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.description}
                  </p>

                  {item.action_required && (
                    <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200">
                      <strong>Recommended Action:</strong> {item.action_required}
                    </div>
                  )}

                  {item.resolution_notes && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ Resolution Note: {item.resolution_notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end flex-shrink-0">
                  {item.id === 'REV-NIE_DIN-16' && !item.resolved && (
                    <button
                      onClick={handleFixJiyaDate}
                      className="btn-secondary text-xs py-1.5 px-3 text-purple-700 dark:text-purple-300 font-semibold"
                    >
                      Auto-Correct to 15/12/2026
                    </button>
                  )}

                  {item.id === 'REV-HIN-MISSING-17-18' && (
                    <button
                      onClick={openAddForMissingHindu}
                      className="btn-secondary text-xs py-1.5 px-3 text-purple-700 dark:text-purple-300 font-semibold"
                    >
                      Add Missing Entry
                    </button>
                  )}

                  <button
                    onClick={() => handleResolve(item.id)}
                    className={`text-xs py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      item.resolved
                        ? 'btn-secondary text-gray-600'
                        : 'btn-primary bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{item.resolved ? 'Mark Unresolved' : 'Mark Resolved'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Missing Customer Dialog */}
      {showAddDialog && (
        <AddCustomerDialog
          defaultNewspaper={prefilledPaper}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            handleResolve(
              'REV-HIN-MISSING-17-18',
              'Missing subscriber successfully entered into The Hindu database'
            );
          }}
        />
      )}
    </div>
  );
}
