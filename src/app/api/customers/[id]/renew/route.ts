import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer } from '@/lib/mockData';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { subscription_id, new_start_date, new_end_date, order_no, remarks } = await request.json();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // 1. Fetch current subscription to retain newspaper_id
      const { data: oldSub, error: fetchErr } = await supabase
        .from(TABLES.SUBSCRIPTIONS)
        .select('*')
        .eq('id', subscription_id)
        .single();

      if (fetchErr || !oldSub) {
        throw new Error('Current subscription not found');
      }

      // 2. Mark old subscription as renewed / historical
      await supabase
        .from(TABLES.SUBSCRIPTIONS)
        .update({
          is_current: false,
          status: 'Renewed',
        })
        .eq('id', subscription_id);

      // 3. Insert new subscription
      const { data: newSub, error: insertErr } = await supabase
        .from(TABLES.SUBSCRIPTIONS)
        .insert({
          customer_id: id,
          newspaper_id: oldSub.newspaper_id,
          order_no: order_no || oldSub.order_no,
          start_date: new_start_date,
          end_date: new_end_date,
          status: 'Active',
          is_current: true,
          remarks: remarks || '',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 4. Update any pending notifications for the old sub
      await supabase
        .from(TABLES.NOTIFICATIONS)
        .update({ status: 'renewed' })
        .eq('subscription_id', subscription_id);

      // 5. Audit Log
      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: id,
        subscription_id: newSub.id,
        action: 'subscription_renewed',
        old_value: { old_end_date: oldSub.end_date },
        new_value: { new_start_date, new_end_date, order_no, remarks },
      });

      return NextResponse.json({ success: true, subscription: newSub });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    // In-memory update
    const list = getMockCustomers();
    const cust = list.find(c => c.id === id);
    if (cust && cust.subscriptions) {
      const subIdx = cust.subscriptions.findIndex(s => s.id === subscription_id);
      if (subIdx >= 0) {
        const old = cust.subscriptions[subIdx];
        const newSub = {
          ...old,
          id: `sub-${Date.now()}`,
          start_date: new_start_date,
          end_date: new_end_date,
          order_no: order_no || old.order_no,
          status: 'Active' as const,
          is_current: true,
          remarks: remarks || '',
        };
        // old sub marked not current
        old.is_current = false;
        cust.subscriptions.unshift(newSub);
        saveMockCustomer(cust);
      }
    }
    return NextResponse.json({ success: true });
  }
}
