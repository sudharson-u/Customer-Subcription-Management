import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers } from '@/lib/mockData';
import { Customer } from '@/lib/types';

interface CacheEntry {
  data: Customer[];
  timestamp: number;
}

// In-memory cache on globalThis so it persists across API requests and server-side renders in Node.js
const CACHE_KEY = '__hindu_customer_data_cache__';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

function getCache(): CacheEntry | null {
  return (globalThis as any)[CACHE_KEY] || null;
}

function setCache(data: Customer[]) {
  (globalThis as any)[CACHE_KEY] = {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Invalidates the in-memory server cache.
 * Call this whenever any customer or subscription is added, updated, renewed, or deleted.
 */
export function invalidateServerCustomerCache() {
  (globalThis as any)[CACHE_KEY] = null;
}

/**
 * High-performance cached customer & subscription data fetcher.
 * Returns in ~0.05ms when cached, reducing Supabase network latency to zero.
 */
export async function getCachedCustomerData(forceRefresh = false): Promise<Customer[]> {
  const cached = getCache();
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let customers: Customer[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select(`
          *,
          subscriptions:${TABLES.SUBSCRIPTIONS}(
            id, customer_id, newspaper_id, order_no, start_date, end_date,
            duration_months, status, is_current, is_end_date_calculated,
            needs_review, review_reason, remarks, notification_date,
            newspaper:${TABLES.NEWSPAPERS}(id, code, name, short_name, accent_color, badge_bg, badge_text)
          )
        `)
        .is('deleted_at', null);

      if (!error && data) {
        customers = data.map((c: any) => ({
          ...c,
          subscriptions: (c.subscriptions || []).map((s: any) => ({
            ...s,
            newspaper: s.newspaper || s.newspapers,
          })),
        }));
      } else {
        if (error) console.error('Error fetching cached customers from Supabase:', error);
        customers = getMockCustomers();
      }
    } catch (err) {
      console.error('Exception fetching cached customers from Supabase:', err);
      customers = getMockCustomers();
    }
  } else {
    customers = getMockCustomers();
  }

  // Filter soft-deleted
  const validCustomers = customers.filter(c => !c.deleted_at);

  setCache(validCustomers);
  return validCustomers;
}
