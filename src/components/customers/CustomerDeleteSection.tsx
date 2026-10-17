'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface CustomerDeleteSectionProps {
  customerId: string;
  customerName: string;
}

export default function CustomerDeleteSection({
  customerId,
  customerName,
}: CustomerDeleteSectionProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/customers');
        router.refresh();
      } else {
        alert('Failed to delete customer record.');
        setLoading(false);
      }
    } catch {
      alert('Network error. Delete failed.');
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 border-rose-200 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Danger Zone
        </h2>
        <span className="text-[10px] text-rose-500 font-semibold bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-full">
          Soft Delete Enabled
        </span>
      </div>

      <p className="text-xs text-rose-600/90 dark:text-rose-300 mb-4 leading-relaxed">
        Deleting this customer archives all associated subscriptions across all 4 newspapers. Record can be restored from the Audit Log if needed.
      </p>

      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="btn-danger text-xs py-2 px-3.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Customer Record</span>
        </button>
      ) : (
        <div className="p-3.5 bg-white dark:bg-[#150A2E] border border-rose-300 dark:border-rose-900 rounded-xl space-y-3">
          <p className="text-xs font-bold text-gray-900 dark:text-white">
            Are you sure you want to delete {customerName}?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger text-xs py-1.5 px-3"
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Deleting...</>
              ) : (
                'Yes, Delete'
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
