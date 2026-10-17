import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers } from '@/lib/mockData';
import { formatDate, formatOrderId } from '@/lib/utils';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'customers';
  const paper = searchParams.get('paper') || 'ALL';

  let customers: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select(`
          *,
          subscriptions:${TABLES.SUBSCRIPTIONS}(
            *,
            newspaper:${TABLES.NEWSPAPERS}(code, name)
          )
        `)
        .is('deleted_at', null)
        .order('customer_name');
      if (error) {
        console.error('Error fetching export data:', error);
        customers = getMockCustomers();
      } else {
        customers = data || [];
      }
    } catch {
      customers = getMockCustomers();
    }
  } else {
    customers = getMockCustomers();
  }

  // Flatten for Excel strictly matching the requested format:
  // S.No, Order ID(Leave Blank if not there), Customer Name, Address, Start Date, End Date
  const rows: any[] = [];
  let sNo = 1;

  customers.forEach((c) => {
    const subs = c.subscriptions?.filter((s: any) => {
      if (paper === 'ALL') return true;
      const code = s.newspaper?.code || (s as any).newspaper;
      return code === paper;
    }) || [];

    if (subs.length === 0) {
      if (paper === 'ALL') {
        rows.push({
          'S.No.': sNo++,
          'Order ID': '',
          'Customer Name': c.customer_name || '',
          'Address': c.address || '',
          'Publication': '—',
          'Start Date': '',
          'End Date': '',
        });
      }
    } else {
      subs.forEach((sub: any) => {
        const pubName = sub.newspaper?.name || (sub as any).newspaper || 'The Hindu';
        rows.push({
          'S.No.': sNo++,
          'Order ID': sub.order_no ? String(sub.order_no).trim() : '',
          'Customer Name': c.customer_name || '',
          'Address': c.address || '',
          'Publication': pubName,
          'Start Date': sub.start_date ? formatDate(sub.start_date) : '',
          'End Date': sub.end_date ? formatDate(sub.end_date) : '',
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 8 },  // S.No.
    { wch: 18 }, // Order ID
    { wch: 32 }, // Customer Name
    { wch: 48 }, // Address
    { wch: 22 }, // Publication
    { wch: 16 }, // Start Date
    { wch: 16 }, // End Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Hindu_Subscribers_${paper}_${dateStr}.xlsx`;

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
