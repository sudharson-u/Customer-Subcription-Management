'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { Customer, Subscription } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface CustomerShareSectionProps {
  customer: Customer;
  currentSub?: Subscription;
}

export default function CustomerShareSection({
  customer,
  currentSub,
}: CustomerShareSectionProps) {
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const subs = customer.subscriptions || [];
  const activeSub = currentSub || subs[selectedSubIndex] || subs[0];

  const paperName = activeSub?.newspaper?.name || (activeSub as any)?.newspaper || 'The Hindu';
  const startDateStr = activeSub?.start_date ? formatDate(activeSub.start_date) : '';
  const endDateStr = activeSub?.end_date ? formatDate(activeSub.end_date) : '';

  const shareText = `Name: ${customer.customer_name || ''}
Mobile: ${customer.mobile_number || ''}
Address: ${customer.address || ''}
Publication: ${paperName}
StartDate : ${startDateStr}
End Date : ${endDateStr}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="share-section" className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-500 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-emerald-500" /> Share Subscriber Details
        </h2>
        <span className="text-[11px] text-gray-400">Delivery Boy & Collector Dispatch</span>
      </div>

      {subs.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {subs.map((s, idx) => {
            const name = s.newspaper?.name || (s as any).newspaper || `Sub #${idx + 1}`;
            return (
              <button
                key={s.id || idx}
                type="button"
                onClick={() => setSelectedSubIndex(idx)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedSubIndex === idx
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100/60 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200/60'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      <pre className="p-3 bg-gray-50 dark:bg-[#1F1042] border border-purple-100 dark:border-[#2C185A] rounded-xl text-xs font-mono text-gray-700 dark:text-purple-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto mb-3">
        {shareText}
      </pre>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Forward via WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 py-2 px-3 bg-white dark:bg-[#150A2E] border border-gray-200 dark:border-[#2C185A] text-gray-700 dark:text-purple-200 text-xs font-bold rounded-xl hover:border-purple-400 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
        </button>
      </div>
    </div>
  );
}
