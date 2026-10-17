'use client';

import { useState } from 'react';
import { StickyNote, Check, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CustomerNotesSectionProps {
  customerId: string;
  initialNotes?: string;
  lastUpdated?: string;
}

export default function CustomerNotesSection({
  customerId,
  initialNotes = '',
  lastUpdated,
}: CustomerNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveNotes = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div id="notes-section" className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-500 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Special Delivery Instructions & Notes
        </h2>
        {lastUpdated && (
          <span className="text-[11px] text-gray-400 font-mono">Updated {formatDate(lastUpdated)}</span>
        )}
      </div>

      <textarea
        rows={3}
        value={notes || ''}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Enter subscriber delivery preferences, gate landmark, collector schedule, or family contact info..."
        className="form-input text-sm resize-none mb-3"
      />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">Notes are synchronized and logged in the immutable audit trail.</p>
        <button
          type="button"
          onClick={handleSaveNotes}
          disabled={loading}
          className="btn-primary text-xs py-1.5 px-3.5"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="w-3 h-3 text-emerald-400" /> Saved!</>
          ) : (
            'Save Note'
          )}
        </button>
      </div>
    </div>
  );
}
