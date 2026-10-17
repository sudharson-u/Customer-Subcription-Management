import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers } from '@/lib/mockData';
import { calculateDaysRemaining, getUrgencyTier } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 20;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      const { data, count, error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .select(`
          *,
          customers:${TABLES.CUSTOMERS}(id, customer_code, customer_name, mobile_number, address),
          subscriptions:${TABLES.SUBSCRIPTIONS}(id, start_date, end_date, order_no, newspapers:${TABLES.NEWSPAPERS}(name, code, accent_color))
        `, { count: 'exact' })
        .order('scheduled_date', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return NextResponse.json({
        notifications: data || [],
        total: count || 0,
        page,
      });
    } catch (err: any) {
      console.warn('Supabase notifications fetch failed, using fallback:', err.message);
    }
  }

  // Fallback generation from in-memory subscribers ending within 30 days
  const customers = getMockCustomers();
  const today = new Date();
  const mockNotifs: any[] = [];

  customers.forEach(c => {
    (c.subscriptions || []).forEach(s => {
      if (s.is_current && s.end_date && s.status !== 'Staff' && s.status !== 'Free') {
        const days = calculateDaysRemaining(s.end_date, today);
        if (days !== null && days <= 30) {
          mockNotifs.push({
            id: `notif-${s.id}`,
            customer_id: c.id,
            subscription_id: s.id,
            notification_type: days <= 6 ? 'urgent_reminder' : 'renewal_reminder',
            urgency_tier: getUrgencyTier(days),
            scheduled_date: s.end_date,
            status: 'pending',
            read_at: null,
            created_at: s.created_at,
            customers: {
              id: c.id,
              customer_code: c.customer_code,
              customer_name: c.customer_name,
              mobile_number: c.mobile_number,
              address: c.address,
            },
            subscriptions: {
              id: s.id,
              start_date: s.start_date,
              end_date: s.end_date,
              order_no: s.order_no,
              newspapers: s.newspaper,
            },
          });
        }
      }
    });
  });

  // Sort earliest expiry first
  mockNotifs.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return NextResponse.json({
    notifications: mockNotifs.slice((page - 1) * limit, page * limit),
    total: mockNotifs.length,
    page,
  });
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      if (action === 'mark_all_read') {
        await supabase
          .from(TABLES.NOTIFICATIONS)
          .update({ read_at: new Date().toISOString() })
          .is('read_at', null);
      } else if (action === 'mark_read') {
        await supabase
          .from(TABLES.NOTIFICATIONS)
          .update({ read_at: new Date().toISOString() })
          .eq('id', id);
      } else if (action === 'dismiss') {
        await supabase
          .from(TABLES.NOTIFICATIONS)
          .update({ status: 'dismissed' })
          .eq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
