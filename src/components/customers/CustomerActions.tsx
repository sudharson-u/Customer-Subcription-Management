'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, Edit, RefreshCw, Share2, Download } from 'lucide-react';
import { Customer, Subscription } from '@/lib/types';
import RenewDialog from './RenewDialog';
import { generateCustomersPDF } from '@/lib/pdfGenerator';

interface CustomerActionsProps {
  customer: Customer;
  currentSub?: Subscription;
}

export default function CustomerActions({ customer, currentSub }: CustomerActionsProps) {
  const router = useRouter();
  const [showRenewDialog, setShowRenewDialog] = useState(false);

  const handleDownloadProfile = () => {
    generateCustomersPDF([customer], {
      customTitle: `${customer.customer_name} Subscriber Profile`,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick Phone Call */}
      {customer.mobile_number && (
        <a
          href={`tel:+91${customer.mobile_number}`}
          className="btn-secondary text-xs py-2 px-3 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
          title={`Call ${customer.customer_name}`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call</span>
        </a>
      )}

      {/* PDF Profile */}
      <button
        type="button"
        onClick={handleDownloadProfile}
        className="btn-secondary text-xs py-2 px-3"
        title="Download official PDF subscriber profile"
      >
        <Download className="w-3.5 h-3.5 text-purple-600" />
        <span>PDF</span>
      </button>

      {/* Edit Customer */}
      <Link
        href={`/customers/${customer.id}/edit`}
        className="btn-secondary text-xs py-2 px-3"
      >
        <Edit className="w-3.5 h-3.5 text-gray-500" />
        <span>Edit</span>
      </Link>

      {/* Renew Subscription */}
      {currentSub && (
        <button
          type="button"
          onClick={() => setShowRenewDialog(true)}
          className="btn-primary text-xs py-2 px-3 bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Renew</span>
        </button>
      )}

      {showRenewDialog && currentSub && (
        <RenewDialog
          customer={customer}
          subscription={currentSub}
          onClose={() => setShowRenewDialog(false)}
          onSuccess={() => {
            setShowRenewDialog(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
