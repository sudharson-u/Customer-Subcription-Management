'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Calendar, Filter, CheckCircle,
  RefreshCw, Loader2, BookOpen
} from 'lucide-react';
import { NewspaperCode, Customer } from '@/lib/types';
import { NEWSPAPERS_META, formatDate, cn } from '@/lib/utils';
import { generateCustomersPDF, PDFTableRow } from '@/lib/pdfGenerator';

type ReportOptionType = 'ending' | 'starting' | 'active' | 'renewed';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  // Filters for Custom Report
  const [selectedPaper, setSelectedPaper] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [reportOption, setReportOption] = useState<ReportOptionType>('ending');

  // Preview pagination (16 items per page to match exact PDF page view)
  const [previewPage, setPreviewPage] = useState<number>(1);
  const PREVIEW_PAGE_SIZE = 16;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/customers?limit=1000');
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch {
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filtered rows matching the selected Newspaper, Month, Year, and Report Option
  const reportRows = useMemo(() => {
    const rows: PDFTableRow[] = [];
    let sNo = 1;

    const targetYear = selectedYear;
    const targetMonth = selectedMonth;

    customers.forEach((c) => {
      const subs = (c.subscriptions || []).filter((s) => {
        if (selectedPaper !== 'ALL') {
          const pCode = (s.newspaper as any)?.code || (s as any).newspaper;
          if (pCode !== selectedPaper) return false;
        }
        return true;
      });

      subs.forEach((sub) => {
        let isMatch = false;

        const startDateObj = sub.start_date ? new Date(sub.start_date) : null;
        const endDateObj = sub.end_date ? new Date(sub.end_date) : null;

        if (reportOption === 'ending') {
          // Subscriptions ending in selected month & year
          if (endDateObj) {
            const endYear = endDateObj.getFullYear();
            const endMonth = endDateObj.getMonth() + 1;
            isMatch = endYear === targetYear && endMonth === targetMonth;
          }
        } else if (reportOption === 'starting') {
          // Subscriptions starting in selected month & year
          if (startDateObj) {
            const startYear = startDateObj.getFullYear();
            const startMonth = startDateObj.getMonth() + 1;
            isMatch = startYear === targetYear && startMonth === targetMonth;
          }
        } else if (reportOption === 'active') {
          // Active customers during selected month & year
          const periodStart = new Date(targetYear, targetMonth - 1, 1);
          const periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

          const subStartsBeforeOrInMonth = !startDateObj || startDateObj <= periodEnd;
          const subEndsAfterOrInMonth = !endDateObj || endDateObj >= periodStart;
          const notDropped = sub.status !== 'Dropped';

          isMatch = subStartsBeforeOrInMonth && subEndsAfterOrInMonth && notDropped;
        } else if (reportOption === 'renewed') {
          // Renewals completed in that month
          const isRenewed =
            (sub.status as string) === 'Renewed' ||
            Boolean((sub as any).is_renewed);
          const startMatches = Boolean(
            startDateObj &&
            startDateObj.getFullYear() === targetYear &&
            startDateObj.getMonth() + 1 === targetMonth
          );
          isMatch = (isRenewed && startMatches) || isRenewed;
        }

        if (isMatch) {
          const paperName = sub.newspaper?.name || (sub as any).newspaper || 'The Hindu';
          rows.push({
            sNo: sNo++,
            customerName: c.customer_name || '',
            address: c.address || '',
            mobileNo: c.mobile_number || '',
            publication: paperName,
            startDate: sub.start_date ? formatDate(sub.start_date) : '',
            endDate: sub.end_date ? formatDate(sub.end_date) : '',
          });
        }
      });
    });

    return rows;
  }, [customers, selectedPaper, selectedMonth, selectedYear, reportOption]);

  // Reset preview page when filter changes
  useEffect(() => {
    setPreviewPage(1);
  }, [selectedPaper, selectedMonth, selectedYear, reportOption]);

  const totalPages = Math.ceil(reportRows.length / PREVIEW_PAGE_SIZE) || 1;
  const paginatedRows = reportRows.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );

  // Handler for PDF generation
  const handleDownloadPDF = () => {
    setGenerating('pdf');
    try {
      generateCustomersPDF([], {
        newspaperFilter: selectedPaper as any,
        customRows: reportRows,
      });
    } finally {
      setGenerating(null);
    }
  };

  // Handler for Excel download
  const handleDownloadExcel = () => {
    const url = `/api/export?type=customers&paper=${selectedPaper}`;
    window.open(url, '_blank');
  };

  const getOptionLabel = (opt: ReportOptionType) => {
    switch (opt) {
      case 'ending':
        return 'Subscription Ending Details';
      case 'starting':
        return 'Subscription Starting';
      case 'active':
        return 'Active Customers';
      case 'renewed':
        return 'Renewals Completed';
    }
  };

  return (
    <div className="page-container space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Circulation Reports
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generate official monthly publication reports formatted strictly with 16 records per page.
        </p>
      </div>

      {/* Report Generator Controls */}
      <div className="card p-5 sm:p-6 space-y-5 border border-purple-200/80 dark:border-[#2C185A]">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            Report Configuration
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select newspaper, target month & year, and choose report classification.
          </p>
        </div>

        {/* Newspaper, Month, and Year Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Newspaper Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Select Newspaper *
            </label>
            <select
              id="report-paper-select"
              value={selectedPaper}
              onChange={(e) => setSelectedPaper(e.target.value)}
              className="form-input text-xs font-semibold"
            >
              <option value="ALL">All 4 Newspapers</option>
              <option value="DINAKARAN">Dinakaran</option>
              <option value="DINAMALAR">Dinamalar</option>
              <option value="NIE_DIN">NIE / DIN</option>
              <option value="THE_HINDU">The Hindu</option>
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Select Month *
            </label>
            <select
              id="report-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="form-input text-xs font-semibold"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Select Year *
            </label>
            <select
              id="report-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="form-input text-xs font-semibold font-mono"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>

        {/* Four Report Classification Options */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Report Type (Select Option) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'ending', label: 'Subscription Ending Details', desc: `Expiring in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` },
              { id: 'starting', label: 'Subscription Starting', desc: `Commencing in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` },
              { id: 'active', label: 'Active Customers', desc: `Active subscribers during ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` },
              { id: 'renewed', label: 'Renewals Completed', desc: `Completed renewals in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` },
            ].map((opt) => {
              const isSelected = reportOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReportOption(opt.id as ReportOptionType)}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1',
                    isSelected
                      ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-600'
                      : 'border-purple-200 dark:border-purple-900/60 bg-white dark:bg-[#1A0D38] hover:border-purple-400'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                      {opt.label}
                    </span>
                    <span className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center', isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300')}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-purple-300/80">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Filter Summary & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-purple-950 dark:text-purple-100">
                {reportRows.length} Records Found for {getOptionLabel(reportOption)}
              </p>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} • {selectedPaper === 'ALL' ? 'All 4 Newspapers' : selectedPaper} • Page split: {totalPages} page{totalPages > 1 ? 's' : ''} (16 records/page)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 font-bold"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              id="download-report-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={reportRows.length === 0 || generating !== null}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold shadow-md"
            >
              {generating === 'pdf' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download PDF Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Records Table Preview (16 records per page) */}
      <div className="card overflow-hidden border border-purple-200/80 dark:border-[#2C185A]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-100 dark:border-[#2C185A] bg-purple-50/40 dark:bg-[#1F1042]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              PDF Preview: Page {previewPage} of {totalPages} (16 Records / Page)
            </h3>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                disabled={previewPage === 1}
                className="px-2 py-1 text-xs border border-gray-200 dark:border-purple-800 rounded bg-white dark:bg-[#150A2E] disabled:opacity-40"
              >
                Previous Page
              </button>
              <span className="text-xs font-mono px-1">
                {previewPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                disabled={previewPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-200 dark:border-purple-800 rounded bg-white dark:bg-[#150A2E] disabled:opacity-40"
              >
                Next Page
              </button>
            </div>
          )}
        </div>

        {reportRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400">
            No subscriber records match the selected newspaper and month/year criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left data-table text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-center">S.No</th>
                  <th>Customer Name</th>
                  <th>Address</th>
                  <th className="text-center">Mobile No.</th>
                  <th>Publication</th>
                  <th className="text-center">Start Date</th>
                  <th className="text-center">End Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.sNo}>
                    <td className="text-center font-mono font-bold text-gray-500">
                      {row.sNo}
                    </td>
                    <td className="font-bold text-gray-900 dark:text-white">
                      {row.customerName}
                    </td>
                    <td className="text-gray-600 dark:text-purple-300/90 max-w-xs truncate" title={row.address}>
                      {row.address || '—'}
                    </td>
                    <td className="text-center font-mono text-purple-600 font-semibold">
                      {row.mobileNo || '—'}
                    </td>
                    <td className="font-semibold text-purple-700 dark:text-purple-300">
                      {row.publication}
                    </td>
                    <td className="text-center font-mono text-gray-500">
                      {row.startDate || '—'}
                    </td>
                    <td className="text-center font-mono font-bold text-gray-800 dark:text-purple-200">
                      {row.endDate || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
