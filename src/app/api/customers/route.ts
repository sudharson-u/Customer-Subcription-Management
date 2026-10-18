import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer } from '@/lib/mockData';
import { calculateStatus, sanitizePhone } from '@/lib/utils';
import { Customer, NewspaperCode } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Check mobile duplicate lookup
  const checkMobile = searchParams.get('check_mobile');
  if (checkMobile) {
    const cleanPhone = sanitizePhone(checkMobile);
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('id, customer_name, customer_code')
        .eq('mobile_number', cleanPhone)
        .is('deleted_at', null)
        .maybeSingle();

      return NextResponse.json({
        exists: !!data,
        customer_name: data?.customer_name || null,
        customer_code: data?.customer_code || null,
      });
    } else {
      const list = getMockCustomers();
      const found = list.find(c => sanitizePhone(c.mobile_number) === cleanPhone && !c.deleted_at);
      return NextResponse.json({
        exists: !!found,
        customer_name: found?.customer_name || null,
        customer_code: found?.customer_code || null,
      });
    }
  }

  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const paperFilter = (searchParams.get('paper') || searchParams.get('newspaper') || '') as NewspaperCode | 'ALL' | '';
  const statusFilter = searchParams.get('status') || '';
  const expiryFilter = searchParams.get('expiry') || '';
  const sortBy = searchParams.get('sort') || 'customer_name';
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));

  let customers: Customer[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase
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

      const { data, error } = await query;
      if (!error && data) {
        customers = data.map((c: any) => ({
          ...c,
          subscriptions: (c.subscriptions || []).map((s: any) => ({
            ...s,
            newspaper: s.newspaper || s.newspapers,
          })),
        }));
      } else {
        if (error) console.error('Error fetching customers:', error);
        customers = getMockCustomers();
      }
    } catch (err) {
      console.error('Exception fetching customers:', err);
      customers = getMockCustomers();
    }
  } else {
    customers = getMockCustomers();
  }

  // Filter soft-deleted
  customers = customers.filter(c => !c.deleted_at);

  // Flatten subscriptions into discrete circulation records so every copy is accounted for without data loss
  const expandedList: any[] = [];
  customers.forEach((c) => {
    const allSubs = c.subscriptions || [];
    // Only current, non-renewed subscriptions represent active circulation copies
    const currentSubs = allSubs.filter((s: any) => s.is_current !== false && s.status !== 'Renewed');
    // If a customer has no active/current subscriptions, keep the latest one or empty
    const subs = currentSubs.length > 0 ? currentSubs : (allSubs.length > 0 ? [allSubs[0]] : []);

    if (subs.length === 0) {
      expandedList.push({
        ...c,
        id: c.id,
        customerId: c.id,
        customer_code: '', // Real order_no only, no fake HIN codes
        order_no: '',
        subscriptions: [],
        _paperCode: '',
      });
    } else {
      subs.forEach((sub: any, sIdx: number) => {
        const pCode = sub.newspaper?.code || (sub as any).newspaper || 'THE_HINDU';
        expandedList.push({
          ...c,
          id: subs.length > 1 ? `${c.id}__sub_${sub.id || sIdx}` : c.id,
          customerId: c.id,
          customer_code: sub.order_no ? String(sub.order_no).trim() : '',
          order_no: sub.order_no ? String(sub.order_no).trim() : '',
          subscriptions: [sub],
          _paperCode: pCode,
        });
      });
    }
  });
  customers = expandedList;

  const today = new Date();

  // Apply Search
  if (search) {
    customers = customers.filter((c: any) => {
      const nameMatch = c.customer_name?.toLowerCase().includes(search);
      const phoneMatch = c.mobile_number?.includes(search);
      const orderMatch = c.order_no?.toLowerCase().includes(search);
      const addrMatch = c.address?.toLowerCase().includes(search);
      const paperMatch = c.subscriptions?.some((s: any) => {
        const pName = s.newspaper?.name?.toLowerCase() || '';
        const pCode = (s.newspaper?.code || (s as any).newspaper || '').toLowerCase();
        return pName.includes(search) || pCode.includes(search);
      });
      return nameMatch || phoneMatch || orderMatch || addrMatch || paperMatch;
    });
  }

  // Filter Publication
  if (paperFilter && paperFilter !== 'ALL') {
    customers = customers.filter((c: any) => c._paperCode === paperFilter);
  }

  // Filter Status
  if (statusFilter) {
    customers = customers.filter((c) => {
      const s = c.subscriptions?.[0];
      if (!s) return false;
      const st = calculateStatus(s.end_date, s.status, today);
      return st.toLowerCase() === statusFilter.toLowerCase();
    });
  }

  // Filter Expiry Window
  if (expiryFilter) {
    customers = customers.filter((c) => {
      const s = c.subscriptions?.[0];
      if (!s || !s.end_date) return false;
      const st = calculateStatus(s.end_date, s.status, today);
      if (expiryFilter === 'expired') return st === 'Expired';
      if (expiryFilter === 'this_month') return st === 'Expiring';
      return true;
    });
  }

  // Sorting
  customers.sort((a: any, b: any) => {
    let aVal = '';
    let bVal = '';

    if (sortBy === 'customer_name') {
      aVal = a.customer_name || '';
      bVal = b.customer_name || '';
    } else if (sortBy === 'customer_code' || sortBy === 'order_no') {
      aVal = a.order_no || '';
      bVal = b.order_no || '';
    } else if (sortBy === 'end_date') {
      aVal = a.subscriptions?.[0]?.end_date || '';
      bVal = b.subscriptions?.[0]?.end_date || '';
    } else if (sortBy === 'start_date') {
      aVal = a.subscriptions?.[0]?.start_date || '';
      bVal = b.subscriptions?.[0]?.start_date || '';
    } else if (sortBy === 'newspaper') {
      aVal = a._paperCode || '';
      bVal = b._paperCode || '';
    } else if (sortBy === 'mobile_number') {
      aVal = a.mobile_number || '';
      bVal = b.mobile_number || '';
    }

    const cmp = aVal.localeCompare(bVal);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = customers.length;
  const paginated = customers.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    customers: paginated,
    total,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      mobile_number,
      email,
      address,
      street_area,
      customer_type = 'Regular',
      notes,
      newspaper = 'THE_HINDU',
      order_no,
      start_date,
      end_date,
    } = body;

    if (!customer_name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const cleanPhone = sanitizePhone(mobile_number);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      // Check if customer exists by phone
      let customerId: string | null = null;
      if (cleanPhone) {
        const { data: existing } = await supabase
          .from(TABLES.CUSTOMERS)
          .select('id')
          .eq('mobile_number', cleanPhone)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
        }
      }

      if (!customerId) {
        const code = body.customer_code ? body.customer_code.trim() : null;

        const { data: newCust, error: custErr } = await supabase
          .from(TABLES.CUSTOMERS)
          .insert({
            customer_code: code,
            customer_name,
            mobile_number: cleanPhone,
            email: email || '',
            address: address || '',
            street_area: street_area || 'Royapuram',
            customer_type,
            notes: notes || '',
          })
          .select()
          .single();

        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      // Lookup newspaper id
      const { data: paper } = await supabase
        .from(TABLES.NEWSPAPERS)
        .select('id')
        .eq('code', newspaper)
        .single();

      if (!paper) throw new Error(`Newspaper ${newspaper} not found`);

      // Insert subscription
      const { data: newSub, error: subErr } = await supabase
        .from(TABLES.SUBSCRIPTIONS)
        .insert({
          customer_id: customerId,
          newspaper_id: paper.id,
          order_no: order_no || '',
          start_date: start_date || null,
          end_date: end_date || null,
          status: customer_type === 'Staff' ? 'Staff' : (customer_type === 'Free Copy' ? 'Free' : 'Active'),
          is_current: true,
        })
        .select()
        .single();

      if (subErr) throw subErr;

      // Log in audit log
      await supabase.from(TABLES.AUDIT_LOGS).insert({
        customer_id: customerId,
        subscription_id: newSub.id,
        action: 'customer_created',
        new_value: { customer_name, newspaper, order_no, start_date, end_date },
      });

      return NextResponse.json({ success: true, customer_id: customerId });
    } else {
      // In-memory fallback
      const saved = saveMockCustomer({
        id: `cust-${Date.now()}`,
        customer_name,
        mobile_number: cleanPhone,
        email: email || '',
        address: address || '',
        street_area: street_area || 'Royapuram',
        customer_type,
        notes: notes || '',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subscriptions: [
          {
            id: `sub-${Date.now()}`,
            customer_id: '',
            newspaper_id: `paper-${newspaper.toLowerCase().replace('_', '')}`,
            newspaper: {
              id: `paper-${newspaper.toLowerCase().replace('_', '')}`,
              code: newspaper,
              name: newspaper === 'THE_HINDU' ? 'The Hindu' : newspaper,
              short_name: newspaper === 'THE_HINDU' ? 'TH' : 'DK',
              language: 'English',
              accent_color: '#7C3AED',
              badge_bg: 'bg-purple-50',
              badge_text: 'text-purple-600',
              active: true,
              display_order: 1,
            },
            order_no: order_no || '',
            start_date: start_date || null,
            end_date: end_date || null,
            status: customer_type === 'Staff' ? 'Staff' : (customer_type === 'Free Copy' ? 'Free' : 'Active'),
            is_current: true,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      return NextResponse.json({ success: true, customer_id: saved.id });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
