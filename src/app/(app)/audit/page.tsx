'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Search, Filter, Download, Clock, Laptop,
  Smartphone, User, CheckCircle, RefreshCw, ChevronDown, ChevronRight,
  Eye, FileText
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/audit');
        const data = await res.json();
        setLogs(data.logs || []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && !log.action.includes(actionFilter)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const emailMatch = (log.user_email || '').toLowerCase().includes(q);
        const custMatch = (log.customer_name || '').toLowerCase().includes(q);
        const actionMatch = (log.action || '').toLowerCase().includes(q);
        const detailMatch = (log.details || '').toLowerCase().includes(q);
        return emailMatch || custMatch || actionMatch || detailMatch;
      }
      return true;
    });
  }, [logs, actionFilter, search]);

  const handleExportCSV = () => {
    const rows = [
      ['Timestamp', 'User', 'Device', 'Action', 'Target Subscriber', 'Details'],
      ...filteredLogs.map((l) => [
        `"${new Date(l.created_at).toLocaleString('en-IN')}"`,
        `"${l.user_email || 'System'}"`,
        `"${l.device_info || 'Unknown'}"`,
        `"${l.action}"`,
        `"${l.customer_name || '—'}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_trail_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              System Audit Trail & Security Ledger
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Immutable log of subscription renewals, address updates, note edits, and simultaneous device sessions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setActionFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              All Events ({logs.length})
            </button>
            <button
              onClick={() => setActionFilter('RENEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === 'RENEW'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Renewals
            </button>
            <button
              onClick={() => setActionFilter('UPDATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === 'UPDATE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Edits & Notes
            </button>
            <button
              onClick={() => setActionFilter('REVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === 'REVIEW'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Review Queue
            </button>
            <button
              onClick={() => setActionFilter('IMPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === 'IMPORT'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Ingestions
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, subscriber, or action..."
              className="form-input text-xs pl-8 py-2 w-full"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-gray-500">Retrieving audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <CheckCircle className="w-12 h-12 text-purple-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Audit Records Found
            </h3>
            <p className="text-xs text-gray-500">No events matched your current search filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-purple-100 dark:divide-[#2C185A]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasDiff = log.old_value || log.new_value;

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {log.action}
                        </span>

                        {log.customer_name && (
                          <span className="font-bold text-xs text-gray-900 dark:text-white">
                            {log.customer_name}
                          </span>
                        )}

                        <span className="text-[11px] text-gray-400 font-mono">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {log.details || 'System operation executed.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          {log.user_email || 'System'}
                        </span>

                        {log.device_info && (
                          <span className="flex items-center gap-1">
                            {log.device_info.toLowerCase().includes('mobile') ||
                            log.device_info.toLowerCase().includes('iphone') ||
                            log.device_info.toLowerCase().includes('android') ? (
                              <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <Laptop className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            {log.device_info}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasDiff && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 self-start"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isExpanded ? 'Hide Diff' : 'View Diff'}</span>
                      </button>
                    )}
                  </div>

                  {/* Before / After JSON Diff View */}
                  {isExpanded && hasDiff && (
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Previous State (Before)
                        </p>
                        <pre className="p-3 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-x-auto text-[11px] text-rose-600 dark:text-rose-400">
                          {log.old_value ? JSON.stringify(log.old_value, null, 2) : 'null'}
                        </pre>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Updated State (After)
                        </p>
                        <pre className="p-3 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-x-auto text-[11px] text-emerald-600 dark:text-emerald-400">
                          {log.new_value ? JSON.stringify(log.new_value, null, 2) : 'null'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
