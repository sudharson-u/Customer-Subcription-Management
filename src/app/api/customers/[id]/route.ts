import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer, deleteMockCustomer } from '@/lib/mockData';
import { sanitizePhone } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId.includes('__sub_') ? rawId.split('__sub_')[0] : rawId;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: customer, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select(`
          *,
          subscriptions:${TABLES.SUBSCRIPTIONS}(
            *,
            newspaper:${TABLES.NEWSPAPERS}(*)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !customer) {
        if (error) console.error('Error fetching customer by id:', error);
        const found = getMockCustomers().find(c => c.id === id || c.customer_code === id);
        if (!found) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        return NextResponse.json({ customer: found });
      }

      const custObj = customer as any;
      const formatted = {
        ...custObj,
        subscriptions: (custObj.subscriptions || []).map((s: any) => ({
          ...s,
          newspaper: s.newspaper || s.newspapers,
        })),
      };

      return NextResponse.json({ customer: formatted });
    } catch {
      const found = getMockCustomers().find(c => c.id === id);
      return NextResponse.json({ customer: found });
    }
  } else {
    const found = getMockCustomers().find(c => c.id === id || c.customer_code === id);
    if (!found) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ customer: found });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId.includes('__sub_') ? rawId.split('__sub_')[0] : rawId;
  const body = await request.json();
  const {
    customer_name,
    mobile_number,
    email,
    address,
    street_area,
    customer_type,
    notes,
    subscriptions,
    expected_version,
  } = body;

  const cleanPhone = sanitizePhone(mobile_number);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Check concurrency version
      if (expected_version) {
        const { data: current } = await supabase
          .from(TABLES.CUSTOMERS)
          .select('version')
          .eq('id', id)
          .single();

        if (current && current.version > expected_version) {
          return NextResponse.json(
            { error: 'Conflict: This record was modified on another device. Please reload.', conflict: true },
            { status: 409 }
          );
        }
      }

      const { data: updated, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update({
          customer_name,
          mobile_number: cleanPhone,
          email: email || null,
          address,
          street_area: street_area || 'Royapuram',
          customer_type: customer_type || 'Regular',
          notes: notes || null,
          version: (expected_version || 1) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update subscriptions if provided
      if (Array.isArray(subscriptions)) {
        // Fetch existing subscriptions for this customer
        const { data: existingSubs } = await supabase
          .from(TABLES.SUBSCRIPTIONS)
          .select('id')
          .eq('customer_id', id);

        const existingIds = (existingSubs || []).map((s: any) => s.id);
        const incomingIds = subscriptions.filter((s: any) => s.id && !s.id.startsWith('temp-')).map((s: any) => s.id);

        // Remove subscriptions removed in the edit form
        const toRemoveIds = existingIds.filter((exId: string) => !incomingIds.includes(exId));
        if (toRemoveIds.length > 0) {
          await supabase
            .from(TABLES.SUBSCRIPTIONS)
            .delete()
            .in('id', toRemoveIds);
        }

        // Upsert / update incoming subscriptions
        for (const sub of subscriptions) {
          if (sub.id && existingIds.includes(sub.id)) {
            await supabase
              .from(TABLES.SUBSCRIPTIONS)
              .update({
                newspaper_id: sub.newspaper_id,
                order_no: sub.order_no || null,
                start_date: sub.start_date || null,
                end_date: sub.end_date || null,
                status: sub.status || 'Active',
                is_end_date_calculated: sub.is_end_date_calculated || false,
                is_current: true,
              })
              .eq('id', sub.id);
          } else {
            await supabase
              .from(TABLES.SUBSCRIPTIONS)
              .insert({
                customer_id: id,
                newspaper_id: sub.newspaper_id,
                order_no: sub.order_no || null,
                start_date: sub.start_date || null,
                end_date: sub.end_date || null,
                status: sub.status || 'Active',
                is_end_date_calculated: sub.is_end_date_calculated || false,
                is_current: true,
                version: 1,
              });
          }
        }
      }

      // Log in audit logs
      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: id,
        action: 'customer_updated',
        new_value: { customer_name, mobile_number: cleanPhone, address, street_area, subscriptions_count: subscriptions?.length },
      });

      return NextResponse.json({ success: true, customer: updated });
    } catch (err: any) {
      console.error('Error updating customer:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    const list = getMockCustomers();
    const found = list.find(c => c.id === id);
    if (!found) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const updated = saveMockCustomer({
      ...found,
      customer_name: customer_name ?? found.customer_name,
      mobile_number: cleanPhone ?? found.mobile_number,
      email: email ?? found.email,
      address: address ?? found.address,
      street_area: street_area ?? found.street_area,
      customer_type: customer_type ?? found.customer_type,
      notes: notes ?? found.notes,
      subscriptions: Array.isArray(subscriptions)
        ? subscriptions.map((s: any, idx: number) => ({
            id: s.id && !s.id.startsWith('temp-') ? s.id : `sub-${id}-${Date.now()}-${idx}`,
            customer_id: id,
            newspaper_id: s.newspaper_id,
            order_no: s.order_no || '',
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            status: s.status || 'Active',
            is_current: true,
            is_end_date_calculated: s.is_end_date_calculated || false,
            needs_review: false,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        : found.subscriptions,
    });

    return NextResponse.json({ success: true, customer: updated });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId.includes('__sub_') ? rawId.split('__sub_')[0] : rawId;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Soft delete
      const { error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: id,
        action: 'customer_soft_deleted',
        new_value: { deleted_at: new Date().toISOString() },
      });

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    deleteMockCustomer(id);
    return NextResponse.json({ success: true });
  }
}
