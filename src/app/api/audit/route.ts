import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';

const MOCK_AUDIT_LOGS = [
  {
    id: 'aud-001',
    user_email: 'umapathty.circulation@gmail.com',
    device_info: 'Chrome 131 / Windows 11 (Desktop)',
    action: 'BATCH_IMPORT_SEED',
    customer_name: 'System Batch Ingestion',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: 'Initial 4-newspaper seed import completed: 58 deduplicated subscribers, 77 active subscriptions.',
    old_value: null,
    new_value: { total_customers: 58, total_subscriptions: 77 },
  },
  {
    id: 'aud-002',
    user_email: 'umapathty.circulation@gmail.com',
    device_info: 'Mobile Safari / iOS 18 (iPhone)',
    action: 'RENEW_SUBSCRIPTION',
    customer_name: 'Mohammed Jaffer',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    details: 'Renewed Dinakaran subscription for 12 months (+365 days). New validity: 20/05/2026 to 19/05/2027.',
    old_value: { end_date: '2026-05-20', status: 'Expiring' },
    new_value: { end_date: '2027-05-19', status: 'Active' },
  },
  {
    id: 'aud-003',
    user_email: 'staff.royapuram@hindu.com',
    device_info: 'Chrome Mobile / Android 15',
    action: 'UPDATE_DELIVERY_NOTES',
    customer_name: 'Abdul Wajj Basha',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    details: 'Updated delivery instructions: "Drop at 1st floor office entrance before 6:30 AM".',
    old_value: { notes: '' },
    new_value: { notes: 'Drop at 1st floor office entrance before 6:30 AM' },
  },
  {
    id: 'aud-004',
    user_email: 'umapathty.circulation@gmail.com',
    device_info: 'Firefox 133 / macOS Sonoma',
    action: 'FLAG_REVIEW_ITEM',
    customer_name: 'Navaneetha Krishnan',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    details: 'Flagged 9-digit mobile number "824858273" for Royapuram delivery beat follow-up.',
    old_value: null,
    new_value: { needs_review: true, review_reason: 'Mobile number is 9 digits' },
  },
  {
    id: 'aud-005',
    user_email: 'umapathty.circulation@gmail.com',
    device_info: 'Chrome 131 / Windows 11',
    action: 'RESOLVE_REVIEW_ITEM',
    customer_name: 'Jiya Sudeen',
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    details: 'Auto-corrected suspicious end date 16/12/2026 to standard 15/12/2026.',
    old_value: { end_date: '2026-12-16' },
    new_value: { end_date: '2026-12-15' },
  },
];

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from(TABLES.AUDIT_LOGS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data && data.length > 0) {
        return NextResponse.json({ logs: data });
      }
    } catch (err: any) {
      console.warn('Supabase audit fetch failed, using fallback:', err.message);
    }
  }

  return NextResponse.json({ logs: MOCK_AUDIT_LOGS });
}
