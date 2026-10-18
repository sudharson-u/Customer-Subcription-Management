import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer } from '@/lib/mockData';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  // Sanitize customerId in case a composite id (e.g. uuid__sub_uuid) was provided
  const customerId = rawId.includes('__sub_') ? rawId.split('__sub_')[0] : rawId;
  const subIdFromParam = rawId.includes('__sub_') ? rawId.split('__sub_')[1] : null;

  const { subscription_id, new_start_date, new_end_date, order_no, remarks } = await request.json();

  let subId = subscription_id || subIdFromParam;
  if (subId && subId.includes('__sub_')) {
    subId = subId.split('__sub_')[1];
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // 1. Fetch current subscription to retain newspaper_id
      let oldSub: any = null;
      if (subId) {
        const { data, error } = await supabase
          .from(TABLES.SUBSCRIPTIONS)
          .select('*')
          .eq('id', subId)
          .maybeSingle();
        if (!error && data) oldSub = data;
      }

      // Fallback: look for customer's most recent subscription
      if (!oldSub) {
        const { data, error } = await supabase
          .from(TABLES.SUBSCRIPTIONS)
          .select('*')
          .eq('customer_id', customerId)
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) oldSub = data;
      }

      if (!oldSub) {
        throw new Error('Current subscription not found');
      }

      // Update the existing subscription in-place with new renewal dates, order_no, and active status
      const { data: updatedSub, error: updateErr } = await supabase
        .from(TABLES.SUBSCRIPTIONS)
        .update({
          order_no: order_no || oldSub.order_no,
          start_date: new_start_date,
          end_date: new_end_date,
          status: 'Active',
          is_current: true,
          is_end_date_calculated: false,
          needs_review: false,
          review_reason: null,
          remarks: remarks || oldSub.remarks || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', oldSub.id)
        .select(`
          *,
          newspaper:${TABLES.NEWSPAPERS}(id, code, name, short_name, accent_color, badge_bg, badge_text)
        `)
        .single();

      if (updateErr) throw updateErr;

      // Update any pending notifications for this sub
      await supabase
        .from(TABLES.NOTIFICATIONS)
        .update({ status: 'renewed' })
        .eq('subscription_id', oldSub.id);

      // Audit Log
      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: customerId,
        subscription_id: oldSub.id,
        action: 'subscription_renewed',
        old_value: { old_start_date: oldSub.start_date, old_end_date: oldSub.end_date, old_status: oldSub.status },
        new_value: { new_start_date, new_end_date, order_no: order_no || oldSub.order_no, status: 'Active' },
      });

      return NextResponse.json({ success: true, subscription: updatedSub });
    } catch (err: any) {
      console.error('Error during renewal:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    // In-memory update
    const list = getMockCustomers();
    const cust = list.find(c => c.id === customerId || c.id === rawId);
    if (cust && cust.subscriptions) {
      const subIdx = cust.subscriptions.findIndex(s => s.id === subId || s.id === subscription_id);
      const targetIdx = subIdx >= 0 ? subIdx : 0;
      if (cust.subscriptions[targetIdx]) {
        const target = cust.subscriptions[targetIdx];
        target.start_date = new_start_date;
        target.end_date = new_end_date;
        if (order_no) target.order_no = order_no;
        if (remarks) target.remarks = remarks;
        target.status = 'Active';
        target.is_current = true;
        target.is_end_date_calculated = false;
        target.needs_review = false;
        target.review_reason = '';
        saveMockCustomer(cust);
      }
    }
    return NextResponse.json({ success: true });
  }
}
