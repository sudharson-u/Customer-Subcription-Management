'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Filter, Plus, Phone, ArrowUpDown, ChevronLeft, ChevronRight,
  X, Download, MapPin, CheckSquare, Square, FileText, Check, ChevronDown, Newspaper
} from 'lucide-react';
import { formatDate, calculateStatus, calculateDaysRemaining, formatOrderId, NEWSPAPERS_META, cn } from '@/lib/utils';
import { Customer, NewspaperCode, SubscriptionStatus } from '@/lib/types';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';
import { generateCustomersPDF } from '@/lib/pdfGenerator';
import { useNewspaperFilter } from '@/components/layout/NewspaperFilterPills';

const PAGE_SIZE = 20;

// In-memory client cache across navigation
const clientCustomersCache = new Map<string, { data: any; timestamp: number }>();

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const { selectedPaper, setSelectedPaper, isHydrated } = useNewspaperFilter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [paperCounts, setPaperCounts] = useState<{
    ALL: number;
    THE_HINDU: number;
    DINAMALAR: number;
    NIE_DIN: number;
    DINAKARAN: number;
  }>({ ALL: 0, THE_HINDU: 0, DINAMALAR: 0, NIE_DIN: 0, DINAKARAN: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('customer_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedCustomersMap, setSelectedCustomersMap] = useState<Map<string, Customer>>(new Map());
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchCustomers = useCallback(async () => {
    const cacheKey = `${search.trim()}__${selectedPaper}__${statusFilter}__${sortBy}__${sortDir}__${page}`;
    const cached = clientCustomersCache.get(cacheKey);

    // Instant render if cached within 60s
    if (cached) {
      setCustomers(cached.data.customers || []);
      setTotal(cached.data.total || 0);
      if (cached.data.paperCounts) setPaperCounts(cached.data.paperCounts);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        search: search.trim(),
        paper: selectedPaper,
        status: statusFilter,
        sort: sortBy,
        dir: sortDir,
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();

      clientCustomersCache.set(cacheKey, { data, timestamp: Date.now() });

      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      if (data.paperCounts) {
        setPaperCounts(data.paperCounts);
      }

      setSelectedCustomersMap((prev) => {
        const next = new Map(prev);
        (data.customers || []).forEach((c: Customer) => {
          if (next.has(c.id)) {
            next.set(c.id, c);
          }
        });
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedPaper, statusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    if (!isHydrated) return;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchCustomers, 120);
    return () => clearTimeout(searchTimeout.current);
  }, [fetchCustomers, isHydrated]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setSelectedPaper('ALL');
    setPage(1);
  }

  function toggleSelectCustomer(customer: Customer) {
    setSelectedCustomersMap((prev) => {
      const next = new Map(prev);
      if (next.has(customer.id)) next.delete(customer.id);
      else next.set(customer.id, customer);
      return next;
    });
  }

  const allVisibleSelected = customers.length > 0 && customers.every(c => selectedCustomersMap.has(c.id));

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedCustomersMap((prev) => {
        const next = new Map(prev);
        customers.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedCustomersMap((prev) => {
        const next = new Map(prev);
        customers.forEach(c => next.set(c.id, c));
        return next;
      });
    }
  }

  function handleDownloadSelectedPDF() {
    const selected = Array.from(selectedCustomersMap.values());
    if (selected.length === 0) return;
    generateCustomersPDF(selected, {
      customTitle: `${selected.length} Selected Subscribers Register`,
    });
  }

  function handleDownloadSingleCustomer(c: Customer) {
    generateCustomersPDF([c], {
      customTitle: `${c.customer_name} Profile`,
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const today = new Date();

  return (
    <div className="page-container">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Subscriber Directory
          </h1>
          <p className="text-xs text-purple-600 dark:text-purple-300 font-mono">
            {selectedPaper === 'ALL'
              ? `${total} subscriptions registered across 4 newspapers`
              : `${total} subscriptions for ${NEWSPAPERS_META[selectedPaper as NewspaperCode]?.name || selectedPaper}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel with Individual Newspaper Options */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              id="export-excel-dropdown-btn"
            >
              <Download className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
              <span>Export Excel</span>
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </button>

            {showExportMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1A0D38] border border-purple-200 dark:border-[#2C185A] rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-purple-950">
                  Select Publication (.xlsx)
                </div>
                <a
                  href="/api/export?type=customers&paper=ALL"
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                >
                  <span>All 4 Newspapers</span>
                  <span className="text-[10px] text-gray-400">Master</span>
                </a>
                <a
                  href="/api/export?type=customers&paper=DINAKARAN"
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <span className="font-semibold">Dinakaran</span>
                  <span className="text-[10px] font-mono">DK</span>
                </a>
                <a
                  href="/api/export?type=customers&paper=DINAMALAR"
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                >
                  <span className="font-semibold">Dinamalar</span>
                  <span className="text-[10px] font-mono">DM</span>
                </a>
                <a
                  href="/api/export?type=customers&paper=NIE_DIN"
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <span className="font-semibold">NIE / DIN</span>
                  <span className="text-[10px] font-mono">ND</span>
                </a>
                <a
                  href="/api/export?type=customers&paper=THE_HINDU"
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                >
                  <span className="font-semibold">The Hindu</span>
                  <span className="text-[10px] font-mono">TH</span>
                </a>
              </div>
            )}
          </div>

          <button
            id="add-customer-btn"
            onClick={() => setShowAddDialog(true)}
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Add Subscriber</span>
          </button>
        </div>
      </div>

      {/* Floating Selected Banner */}
      {selectedCustomersMap.size > 0 && (
        <div className="card p-3 mb-4 bg-purple-500/10 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 fade-in">
          <div className="flex items-center gap-2">
            <span className="min-w-[24px] h-6 px-1.5 rounded-full bg-purple-600 text-white text-xs font-bold font-mono flex items-center justify-center flex-shrink-0">
              {selectedCustomersMap.size}
            </span>
            <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-200">
              {selectedCustomersMap.size} subscriber{selectedCustomersMap.size > 1 ? 's' : ''} chosen for PDF generation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSelectedPDF}
              className="btn-primary text-xs py-1.5 px-3 bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Generate PDF
            </button>
            <button
              type="button"
              onClick={() => setSelectedCustomersMap(new Map())}
              className="btn-ghost text-xs py-1.5 px-2 text-purple-700 dark:text-purple-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters Card */}
      <div className="card p-4 mb-4 space-y-3 border border-purple-200/80 dark:border-[#2C185A]">
        {/* Search input with ⌘K alignment */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
          <input
            id="customer-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID, phone, order ID, address or publication..."
            className="form-input input-with-search pr-10 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Newspaper Filter Row directly Above All Statuses */}
        <div className="pt-2 pb-1 border-t border-purple-100 dark:border-[#2C185A]/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-gray-500 dark:text-purple-300 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Newspaper className="w-3.5 h-3.5 text-purple-500" /> Publication:
            </span>
            {[
              { code: 'ALL' as const, label: `All 4 Newspapers (${paperCounts.ALL})` },
              { code: 'THE_HINDU' as const, label: `The Hindu (${paperCounts.THE_HINDU})` },
              { code: 'DINAMALAR' as const, label: `Dinamalar (${paperCounts.DINAMALAR})` },
              { code: 'NIE_DIN' as const, label: `NIE / DIN (${paperCounts.NIE_DIN})` },
              { code: 'DINAKARAN' as const, label: `Dinakaran (${paperCounts.DINAKARAN})` },
            ].map((opt) => {
              const isSelected = selectedPaper === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  id={`subscribers-paper-pill-${opt.code.toLowerCase()}`}
                  onClick={() => {
                    setSelectedPaper(opt.code);
                    setPage(1);
                  }}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap border shrink-0 cursor-pointer',
                    isSelected
                      ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#1E113E] border-gray-200 dark:border-purple-900/50 text-gray-700 dark:text-purple-200 hover:border-purple-300 dark:hover:border-purple-700'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-purple-400 flex-shrink-0" />

          {/* Newspaper Dropdown Selector */}
          <select
            id="newspaper-select-filter"
            value={selectedPaper}
            onChange={(e) => {
              setSelectedPaper(e.target.value as any);
              setPage(1);
            }}
            className="form-input w-auto min-w-[150px] py-1.5 text-xs sm:text-sm font-semibold border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
          >
            <option value="ALL">All Newspapers ({paperCounts.ALL})</option>
            <option value="THE_HINDU">The Hindu ({paperCounts.THE_HINDU})</option>
            <option value="DINAMALAR">Dinamalar ({paperCounts.DINAMALAR})</option>
            <option value="NIE_DIN">NIE / DIN ({paperCounts.NIE_DIN})</option>
            <option value="DINAKARAN">Dinakaran ({paperCounts.DINAKARAN})</option>
          </select>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-input w-auto min-w-[140px] py-1.5 text-xs sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring">Expiring (30 Days)</option>
            <option value="Expired">Expired</option>
          </select>

          <select
            id="sort-filter"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [col, dir] = e.target.value.split(':');
              setSortBy(col);
              setSortDir(dir as 'asc' | 'desc');
              setPage(1);
            }}
            className="form-input w-auto min-w-[160px] py-1.5 text-xs sm:text-sm"
          >
            <option value="customer_name:asc">Name A–Z</option>
            <option value="customer_name:desc">Name Z–A</option>
            <option value="end_date:asc">Expiry (Earliest First)</option>
            <option value="end_date:desc">Expiry (Latest First)</option>
            <option value="start_date:asc">Start Date</option>
            <option value="customer_code:asc">Customer Code</option>
          </select>

          {(search || statusFilter || selectedPaper !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="card overflow-hidden border border-purple-200/80 dark:border-[#2C185A]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-purple-300 dark:text-purple-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 dark:text-purple-200">No subscribers found</p>
            <p className="text-xs text-gray-400 dark:text-purple-400 mt-1">Try broadening your search or publication filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10 px-3 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="text-gray-400 hover:text-purple-600 cursor-pointer"
                        title={allVisibleSelected ? 'Deselect all' : 'Select all visible'}
                      >
                        {allVisibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    {[
                      { key: 'customer_code', label: 'Order ID' },
                      { key: 'customer_name', label: 'Subscriber' },
                      { key: 'newspaper', label: 'Publications' },
                      { key: 'mobile_number', label: 'Phone' },
                      { key: 'start_date', label: 'Start Date' },
                      { key: 'end_date', label: 'Expiry Date' },
                    ].map(col => (
                      <th key={col.key}>
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                        >
                          {col.label}
                          <ArrowUpDown className={cn('w-3 h-3', sortBy === col.key ? 'text-purple-600' : 'text-gray-300 dark:text-purple-700')} />
                        </button>
                      </th>
                    ))}
                    <th>Status</th>
                    <th className="text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const isSelected = selectedCustomersMap.has(customer.id);
                    const sub = customer.subscriptions?.[0];
                    const status = sub ? calculateStatus(sub.end_date, sub.status, today) : 'Active';
                    const days = sub ? calculateDaysRemaining(sub.end_date, today) : null;
                    const realCustomerId = (customer as any).customerId || customer.id.split('__sub_')[0];

                    return (
                      <tr key={customer.id} className={cn(isSelected && 'bg-purple-50/60 dark:bg-purple-950/30')}>
                        <td className="px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectCustomer(customer)}
                            className="text-gray-400 hover:text-purple-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="font-mono text-xs font-bold text-gray-500">
                          {sub?.order_no ? String(sub.order_no).trim() : ''}
                        </td>

                        <td>
                          <div className="font-bold text-gray-900 dark:text-white">{customer.customer_name}</div>
                          {customer.address && (
                            <div className="text-xs text-gray-400 truncate max-w-[220px]" title={customer.address}>
                              {customer.address}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1">
                            {customer.subscriptions && customer.subscriptions.length > 0 ? (
                              customer.subscriptions.map((s) => {
                                const pCode = (s.newspaper?.code || (s as any).newspaper || 'THE_HINDU') as NewspaperCode;
                                const meta = NEWSPAPERS_META[pCode] || NEWSPAPERS_META.THE_HINDU;
                                return (
                                  <span key={s.id} className={cn('newspaper-chip text-[10px]', meta.badgeClass)}>
                                    {meta.name}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </td>

                        <td>
                          {customer.mobile_number ? (
                            <a
                              href={`tel:+91${customer.mobile_number}`}
                              className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline text-xs font-semibold"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {customer.mobile_number}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Missing</span>
                          )}
                        </td>

                        <td className="text-xs font-mono text-gray-500 whitespace-nowrap">
                          {sub ? formatDate(sub.start_date) : '—'}
                        </td>

                        <td className="text-xs font-mono font-bold text-gray-800 dark:text-purple-200 whitespace-nowrap">
                          {sub ? formatDate(sub.end_date) : '—'}
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'status-badge text-[10px]',
                                status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : status === 'Expiring'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                  : status === 'Expired'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              )}
                            >
                              {status}
                            </span>
                            {days !== null && days <= 30 && (
                              <span className="text-[10px] font-mono text-gray-400">{days}d</span>
                            )}
                          </div>
                        </td>

                        <td className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleCustomer(customer)}
                              className="text-xs text-gray-500 hover:text-purple-600 p-1"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/customers/${realCustomerId}`}
                              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline px-1"
                            >
                              View
                            </Link>
                            <Link
                              href={`/customers/${realCustomerId}/edit`}
                              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white px-1"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-purple-100 dark:divide-[#2C185A]">
              {customers.map((customer) => {
                const sub = customer.subscriptions?.[0];
                const status = sub ? calculateStatus(sub.end_date, sub.status, today) : 'Active';
                const isSelected = selectedCustomersMap.has(customer.id);
                const realCustomerId = (customer as any).customerId || customer.id.split('__sub_')[0];

                return (
                  <div key={customer.id} className={cn('p-4 transition-colors', isSelected && 'bg-purple-50/50 dark:bg-purple-950/20')}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectCustomer(customer)}
                          className="mt-0.5 text-gray-400 hover:text-purple-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{customer.customer_name}</p>
                          {sub?.order_no ? (
                            <p className="text-[10px] text-gray-400 font-mono">Order #{sub.order_no}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {customer.subscriptions?.map(s => {
                          const pCode = (s.newspaper?.code || (s as any).newspaper || 'THE_HINDU') as NewspaperCode;
                          const meta = NEWSPAPERS_META[pCode] || NEWSPAPERS_META.THE_HINDU;
                          return (
                            <span key={s.id} className={cn('newspaper-chip text-[9px]', meta.badgeClass)}>
                              {meta.short}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {customer.address && (
                      <p className="text-xs text-gray-500 dark:text-purple-300/80 flex items-start gap-1 leading-relaxed mb-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3 pt-1 border-t border-purple-50 dark:border-[#2C185A]">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block">Mobile</span>
                        {customer.mobile_number ? (
                          <a href={`tel:+91${customer.mobile_number}`} className="font-bold text-purple-600">
                            📞 {customer.mobile_number}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block">Expiry</span>
                        <span className="font-bold font-mono text-gray-800 dark:text-purple-200">
                          {sub ? formatDate(sub.end_date) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleCustomer(customer)}
                        className="btn-secondary text-xs py-1.5 px-2.5 rounded-xl"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-600" /> PDF
                      </button>
                      <Link
                        href={`/customers/${realCustomerId}`}
                        className="btn-primary text-xs py-1.5 flex-1 justify-center rounded-xl"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/customers/${realCustomerId}/edit`}
                        className="btn-secondary text-xs py-1.5 flex-1 justify-center rounded-xl"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100 dark:border-[#2C185A]">
            <p className="text-xs text-purple-700/80 dark:text-purple-300 font-mono">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-purple-700 dark:text-purple-300 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="btn-ghost p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddDialog && (
        <AddCustomerDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}
