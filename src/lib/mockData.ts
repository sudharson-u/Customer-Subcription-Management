import { Customer, Newspaper, NewspaperCode, ReviewQueueItem } from './types';
import seedData from '../../seed_data.json';
import fs from 'fs';
import path from 'path';

export const MOCK_NEWSPAPERS: Newspaper[] = [
  {
    id: 'paper-dk',
    code: 'DINAKARAN',
    name: 'Dinakaran',
    short_name: 'DK',
    language: 'Tamil',
    accent_color: '#E11D48',
    badge_bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60',
    badge_text: 'text-rose-600',
    active: true,
    display_order: 1,
  },
  {
    id: 'paper-dm',
    code: 'DINAMALAR',
    name: 'Dinamalar',
    short_name: 'DM',
    language: 'Tamil',
    accent_color: '#0D9488',
    badge_bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900/60',
    badge_text: 'text-teal-600',
    active: true,
    display_order: 2,
  },
  {
    id: 'paper-nd',
    code: 'NIE_DIN',
    name: 'NIE / DIN',
    short_name: 'ND',
    language: 'English / Tamil',
    accent_color: '#3B82F6',
    badge_bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60',
    badge_text: 'text-blue-600',
    active: true,
    display_order: 3,
  },
  {
    id: 'paper-th',
    code: 'THE_HINDU',
    name: 'The Hindu',
    short_name: 'TH',
    language: 'English',
    accent_color: '#7C3AED',
    badge_bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60',
    badge_text: 'text-purple-600',
    active: true,
    display_order: 4,
  },
];

const paperCodeToNewspaper: Record<string, Newspaper> = {
  DINAKARAN: MOCK_NEWSPAPERS[0],
  DINAMALAR: MOCK_NEWSPAPERS[1],
  NIE_DIN: MOCK_NEWSPAPERS[2],
  THE_HINDU: MOCK_NEWSPAPERS[3],
};

function formatInitialCustomers(): Customer[] {
  const rawList = (seedData.customers || []) as any[];
  return rawList.map((c, cIdx) => {
    const custId = `cust-${String(cIdx + 1).padStart(3, '0')}`;
    return {
      id: custId,
      customer_code: c.customer_code || '',
      customer_name: c.customer_name,
      mobile_number: c.mobile_number || '',
      email: c.email || '',
      address: c.address || '',
      street_area: c.street_area || 'Royapuram',
      pincode: c.pincode || '600013',
      customer_type: c.customer_type || 'Regular',
      notes: c.notes || '',
      version: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      subscriptions: (c.subscriptions || []).map((s: any, sIdx: number) => {
        const p = paperCodeToNewspaper[s.newspaper] || MOCK_NEWSPAPERS[3];
        return {
          id: `sub-${String(cIdx + 1).padStart(3, '0')}-${sIdx + 1}`,
          customer_id: custId,
          newspaper_id: p.id,
          order_no: s.order_no || '',
          start_date: s.start_date || null,
          end_date: s.end_date || null,
          duration_months: 12,
          status: s.status || 'Active',
          is_current: true,
          is_end_date_calculated: s.is_end_date_calculated || false,
          needs_review: s.needs_review || false,
          review_reason: s.review_reason || '',
          remarks: s.remarks || c.notes || '',
          newspaper: p,
          version: 1,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        };
      }),
    };
  });
}

// In-Memory store
let inMemoryCustomers: Customer[] = formatInitialCustomers();
let inMemoryReviewQueue: ReviewQueueItem[] = (seedData.review_queue || []) as ReviewQueueItem[];

export function getMockCustomers(): Customer[] {
  return inMemoryCustomers.map(c => ({
    ...c,
    subscriptions: (c.subscriptions || []).map(s => {
      const pCode = (s.newspaper as any)?.code || (s as any).newspaper_code;
      const paper = MOCK_NEWSPAPERS.find(p => p.id === s.newspaper_id || p.code === pCode);
      return {
        ...s,
        newspaper: paper || MOCK_NEWSPAPERS[3],
      };
    })
  }));
}

function persistToDisk() {
  try {
    const filePath = path.join(process.cwd(), 'seed_data.json');
    if (!fs.existsSync(filePath)) return;
    const existingRaw = fs.readFileSync(filePath, 'utf-8');
    const existing = JSON.parse(existingRaw);

    const serializedCustomers = inMemoryCustomers
      .filter(c => !c.deleted_at)
      .map((c) => ({
        customer_name: c.customer_name,
        mobile_number: c.mobile_number,
        email: c.email || '',
        address: c.address || '',
        street_area: c.street_area || 'Royapuram',
        pincode: c.pincode || '600013',
        customer_type: c.customer_type || 'Regular',
        notes: c.notes || '',
        subscriptions: (c.subscriptions || []).map((s: any) => ({
          newspaper: s.newspaper?.code || s.newspaper_code || (s as any).newspaper || 'THE_HINDU',
          order_no: s.order_no || '',
          start_date: s.start_date || null,
          end_date: s.end_date || null,
          is_end_date_calculated: s.is_end_date_calculated || false,
          status: s.status || 'Active',
          needs_review: s.needs_review || false,
          review_reason: s.review_reason || '',
          remarks: s.remarks || '',
          raw_s_no: s.raw_s_no,
        })),
      }));

    existing.customers = serializedCustomers;
    existing.summary = {
      ...existing.summary,
      total_customers: serializedCustomers.length,
      total_subscriptions: serializedCustomers.reduce((acc, c) => acc + c.subscriptions.length, 0),
    };

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist to seed_data.json:', err);
  }
}

export function saveMockCustomer(customer: Customer): Customer {
  const existingIdx = inMemoryCustomers.findIndex(c => c.id === customer.id);
  let savedCust: Customer;
  if (existingIdx >= 0) {
    inMemoryCustomers[existingIdx] = {
      ...customer,
      version: (inMemoryCustomers[existingIdx].version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    savedCust = inMemoryCustomers[existingIdx];
  } else {
    const newCust = {
      ...customer,
      id: customer.id || `cust-${Date.now()}`,
      customer_code: customer.customer_code || '',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryCustomers.unshift(newCust);
    savedCust = newCust;
  }
  persistToDisk();
  return savedCust;
}

export function deleteMockCustomer(id: string): boolean {
  const existingIdx = inMemoryCustomers.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    inMemoryCustomers[existingIdx].deleted_at = new Date().toISOString();
    persistToDisk();
    return true;
  }
  return false;
}

export function getMockReviewQueue(): ReviewQueueItem[] {
  return inMemoryReviewQueue;
}
