import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer } from '@/lib/mockData';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId.includes('__sub_') ? rawId.split('__sub_')[0] : rawId;
  const { notes } = await request.json();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      await supabase
        .from(TABLES.CUSTOMERS)
        .update({ notes })
        .eq('id', id);

      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: id,
        action: 'customer_note',
        new_value: { note: notes },
      });

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    const list = getMockCustomers();
    const found = list.find(c => c.id === id);
    if (found) {
      saveMockCustomer({ ...found, notes });
    }
    return NextResponse.json({ success: true });
  }
}
