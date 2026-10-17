'use client';

import React, { useState, useRef } from 'react';
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle,
  FileCheck, ArrowRight, RefreshCw, Database, Layers, Check,
  X, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import { NewspaperCode } from '@/lib/types';
import { NEWSPAPERS, NEWSPAPERS_META, cn } from '@/lib/utils';

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'backup'>('import');

  // Import State
  const [file, setFile] = useState<File | null>(null);
  const [defaultPaper, setDefaultPaper] = useState<NewspaperCode>('THE_HINDU');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewRows([]);
      setImportResult(null);
      setError(null);
    }
  };

  const handleGeneratePreview = async () => {
    if (!file) return;
    setPreviewLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('newspaper', defaultPaper);

      const res = await fetch('/api/import/preview', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file for preview');

      setPreviewRows(data.rows || []);
    } catch (err: any) {
      setError(err.message || 'Error parsing uploaded file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('newspaper', defaultPaper);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commit import');

      setImportResult(data);
    } catch (err: any) {
      setError(err.message || 'Error committing import');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      'Name,Mobile,Address,Publication,Order No,Start Date,End Date,Type\n' +
      'R. Venkatesh,9840012345,"12, M.S Koil St, Royapuram",THE_HINDU,10452,01/01/2026,31/12/2026,Regular\n' +
      'Mohammed Jaffer,9003103868,"17/2, Kumaravelu St, Royapuram",DINAMALAR,,21/08/2025,20/08/2026,Regular\n' +
      'S. Murugan,9444056789,"45, Adam St, Royapuram",DINAKARAN,,01/06/2026,31/05/2027,Regular\n' +
      'Navaneetha Krishnan,8248582730,"78, West Kalmandapam Rd",NIE_DIN,1403302,01/02/2026,31/01/2027,Regular\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hindu_subscription_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBackupJson = async () => {
    try {
      const res = await fetch('/api/customers?limit=1000');
      const data = await res.json();
      const backupData = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        distribution_zone: 'Royapuram, Chennai-13',
        customers: data.customers || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hindu_circulation_backup_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Failed to generate JSON backup');
    }
  };

  const validRowCount = previewRows.filter((r) => r.valid).length;
  const invalidRowCount = previewRows.filter((r) => !r.valid).length;

  return (
    <div className="page-container space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Data Ingestion & Backup Hub
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Upload Excel / CSV subscriber lists, validate records against 4 newspapers, and export complete database snapshots.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'import'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Batch Import Wizard</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Full Backup & Snapshots</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Step 1: Upload & Settings */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Upload Spreadsheet & Target Publication
              </h2>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 text-purple-700 dark:text-purple-300"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Choose Excel (.xlsx, .xls) or CSV File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-purple-50/20 dark:bg-purple-950/10"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Drag and drop file here or click to browse
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Supports standard distribution sheets, order books, and CSV files
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Default Newspaper Publication
                </label>
                <select
                  value={defaultPaper}
                  onChange={(e) => setDefaultPaper(e.target.value as NewspaperCode)}
                  className="form-input text-xs mb-3"
                >
                  <option value="THE_HINDU">The Hindu</option>
                  <option value="DINAKARAN">Dinakaran</option>
                  <option value="DINAMALAR">Dinamalar</option>
                  <option value="NIE_DIN">NIE / DIN</option>
                </select>

                <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                  If the file doesn't have a "Publication" column, records will be assigned to this selected newspaper.
                </p>

                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={!file || previewLoading}
                  className="btn-primary text-xs py-2.5 px-4 w-full inline-flex items-center justify-center gap-2"
                >
                  {previewLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Rows...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" /> Validate & Preview
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Validation Preview Table */}
          {previewRows.length > 0 && (
            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Validation Preview ({previewRows.length} Records)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Review deduplicated subscriber matches, calculated validity dates, and warnings before committing.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="badge badge-emerald">
                    {validRowCount} Valid
                  </span>
                  {invalidRowCount > 0 && (
                    <span className="badge badge-rose">
                      {invalidRowCount} Errors
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-96 border border-gray-100 dark:border-gray-800 rounded-xl">
                <table className="table-base text-xs">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>Publication</th>
                      <th>Customer Name</th>
                      <th>Mobile</th>
                      <th>Address</th>
                      <th>Order #</th>
                      <th>Dates</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr key={idx} className={r.valid ? '' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                        <td className="font-mono text-gray-400">{r.row}</td>
                        <td>
                          <span className="newspaper-chip newspaper-chip-hindu">
                            {r.newspaper}
                          </span>
                        </td>
                        <td className="font-bold text-gray-900 dark:text-white">{r.customer_name}</td>
                        <td className="font-mono">{r.mobile_number || '—'}</td>
                        <td className="truncate max-w-xs">{r.address || '—'}</td>
                        <td className="font-mono">{r.order_no || '—'}</td>
                        <td className="font-mono whitespace-nowrap">
                          {r.start_date || '—'} → {r.end_date || '—'}
                        </td>
                        <td>
                          {r.valid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> OK
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {r.errors.map((err: string, i: number) => (
                                <p key={i} className="text-rose-600 text-[10px] font-semibold flex items-center gap-0.5">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {err}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500">
                  Duplicates matching existing mobile numbers will link new subscriptions under the same customer profile.
                </p>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importing || validRowCount === 0}
                  className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Committing Batch...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Commit {validRowCount} Valid Records
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Import Result Screen */}
          {importResult && (
            <div className="card p-6 bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    Import Batch Committed Successfully!
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    The circulation database has been updated and synchronized in real time.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Processed</p>
                  <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                    {importResult.total}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">New Customers</p>
                  <p className="text-xl font-bold font-mono text-emerald-600">
                    {importResult.imported}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900">
                  <p className="text-[10px] font-bold text-purple-600 uppercase">Updated / Merged</p>
                  <p className="text-xl font-bold font-mono text-purple-600">
                    {importResult.updated}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Skipped</p>
                  <p className="text-xl font-bold font-mono text-gray-500">
                    {importResult.skipped}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Full Database Backup & Snapshots */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                Full Database Export & Snapshot Archives
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Download zero-data-loss snapshots of subscribers, linked newspapers, notes, and audit trails.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Master Excel & Individual Newspaper Exports */}
              <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Circulation Excel Workbooks (.xlsx)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Formatted with standard circulation columns: S.No., Order ID, Customer Name, Address, Publication, Start Date, End Date.
                  </p>
                </div>
                
                <div className="space-y-2 pt-1">
                  <a
                    href="/api/export?type=customers&paper=ALL"
                    target="_blank"
                    className="btn-secondary text-xs py-2 px-3 w-full inline-flex items-center justify-center gap-2 font-bold"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export All Newspapers Excel</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="/api/export?type=customers&paper=DINAKARAN"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[11px] font-bold text-center hover:bg-rose-100 transition-colors"
                    >
                      ↓ Dinakaran
                    </a>
                    <a
                      href="/api/export?type=customers&paper=DINAMALAR"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 text-[11px] font-bold text-center hover:bg-teal-100 transition-colors"
                    >
                      ↓ Dinamalar
                    </a>
                    <a
                      href="/api/export?type=customers&paper=NIE_DIN"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold text-center hover:bg-blue-100 transition-colors"
                    >
                      ↓ NIE / DIN
                    </a>
                    <a
                      href="/api/export?type=customers&paper=THE_HINDU"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[11px] font-bold text-center hover:bg-purple-100 transition-colors"
                    >
                      ↓ The Hindu
                    </a>
                  </div>
                </div>
              </div>

              {/* Option 2: JSON Backup */}
              <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <Layers className="w-8 h-8 text-purple-600" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Complete JSON Snapshot Archive
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Raw JSON dump containing full subscriber hierarchy, multi-paper links, timestamps, and customer types for cold storage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackupJson}
                  className="btn-primary text-xs py-2 px-3 inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON Archive</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
