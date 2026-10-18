'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, RefreshCw, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Customer, Subscription } from '@/lib/types';
import { formatDate, calculateDaysRemaining, NEWSPAPERS_META, cn, formatOrderId } from '@/lib/utils';
import RenewDialog from '@/components/customers/RenewDialog';

interface RenewalCustomerCardProps {
  customer: Customer;
  todayString: string;
  onRenewed?: () => void;
}

export default function RenewalCustomerCard({
  customer,
  todayString,
  onRenewed,
}: RenewalCustomerCardProps) {
  const router = useRouter();
  const [showRenewDialog, setShowRenewDialog] = useState(false);

  const sub = customer.subscriptions?.[0];
  if (!sub) return null;

  const today = new Date(todayString);
  const days = calculateDaysRemaining(sub.end_date, today);

  const paperCode = (sub.newspaper as any)?.code || (sub as any).newspaper || 'THE_HINDU';
  const paperMeta = NEWSPAPERS_META[paperCode as keyof typeof NEWSPAPERS_META] || NEWSPAPERS_META.THE_HINDU;

  return (
    <div className="p-4 sm:p-5 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn('newspaper-chip', paperMeta.badgeClass)}>
              {paperMeta.name}
            </span>
            <Link
              href={`/customers/${customer.id}`}
              className="text-sm font-bold text-gray-900 dark:text-purple-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {customer.customer_name}
            </Link>
            {customer.customer_code && (
              <span className="text-[11px] font-mono text-gray-400 dark:text-purple-400">{customer.customer_code}</span>
            )}
            {sub.order_no && (
              <span className="text-[10px] font-mono bg-gray-100 dark:bg-purple-900/40 text-gray-600 dark:text-purple-300 px-1.5 py-0.5 rounded">
                Order: {formatOrderId(sub.order_no)}
              </span>
            )}
          </div>

          {customer.address && (
            <p className="text-xs text-gray-500 dark:text-purple-300/80 flex items-start gap-1 leading-relaxed truncate max-w-xl">
              <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500 dark:text-purple-400">
            {customer.mobile_number ? (
              <a
                href={`tel:+91${customer.mobile_number}`}
                className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" /> {customer.mobile_number}
              </a>
            ) : (
              <span className="text-gray-400 italic">No mobile registered</span>
            )}

            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Expires <span className="font-semibold text-gray-800 dark:text-purple-200">{formatDate(sub.end_date)}</span>
            </span>
          </div>
        </div>

        {/* Expiry Badge + Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-100 dark:border-[#2C185A]">
          <div className="text-right">
            <span
              className={cn(
                'text-base sm:text-lg font-extrabold font-mono',
                days === null
                  ? 'text-gray-400'
                  : days < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : days <= 6
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
            </span>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              {days !== null && days < 0 ? 'Overdue' : 'Window'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowRenewDialog(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Renew</span>
            </button>
            <Link
              href={`/customers/${customer.id}`}
              className="btn-ghost text-xs p-2"
              title="View full customer profile"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {showRenewDialog && (
        <RenewDialog
          customer={customer}
          subscription={sub}
          onClose={() => setShowRenewDialog(false)}
          onSuccess={() => {
            setShowRenewDialog(false);
            if (onRenewed) onRenewed();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
