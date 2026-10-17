import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers } from '@/lib/mockData';
import { jsPDF } from 'jspdf';
import at from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { formatDate, formatOrderId, NEWSPAPERS_META } from '@/lib/utils';
import { NewspaperCode } from '@/lib/types';

const autoTable = typeof at === 'function' ? at : (at as any).default || at;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function POST(request: Request) {
  try {
    const { month = 1, year = 2026, report_type = 'ending', newspaper = 'ALL' } = await request.json();

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
          console.error('Error in PDF report fetch:', error);
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

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const filteredRows: any[] = [];
    let counter = 1;

    customers.forEach((c) => {
      const subs = c.subscriptions?.filter((s: any) => {
        if (newspaper !== 'ALL') {
          const code = s.newspaper?.code || (s as any).newspaper;
          if (code !== newspaper) return false;
        }

        if (report_type === 'ending') {
          return s.end_date && s.end_date >= monthStart && s.end_date <= monthEnd;
        } else if (report_type === 'starting') {
          return s.start_date && s.start_date >= monthStart && s.start_date <= monthEnd;
        } else if (report_type === 'active') {
          return s.is_current && s.status === 'Active';
        } else if (report_type === 'renewed') {
          return s.status === 'Renewed';
        }
        return true;
      }) || [];

      subs.forEach((sub: any) => {
        const pName = sub.newspaper?.name || sub.newspaper_id || 'The Hindu';
        filteredRows.push([
          String(counter++),
          formatOrderId(sub.order_no) || c.customer_code || '—',
          c.customer_name,
          pName,
          c.address || '—',
          c.mobile_number || '—',
          formatDate(sub.start_date),
          formatDate(sub.end_date),
          sub.status || 'Active',
        ]);
      });
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Deep Violet Header Banner
    doc.setFillColor(27, 11, 59);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('HINDU — SUBSCRIPTION & CIRCULATION PORTAL', 10, 10);

    const monthName = MONTHS[month - 1] || 'Month';
    const reportLabel = report_type.toUpperCase();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(233, 185, 73); // Champagne Gold
    doc.text(`OFFICIAL REPORT: ${monthName} ${year} • TYPE: ${reportLabel}`, 10, 16);

    doc.setFontSize(7.5);
    doc.setTextColor(200, 190, 230);
    doc.text(`Zone: Royapuram, Chennai-13 | Filter: ${newspaper} | Total Subscribers: ${filteredRows.length}`, 10, 22);

    autoTable(doc, {
      head: [['#', 'Order / ID', 'Subscriber Name', 'Paper', 'Delivery Address', 'Mobile No', 'Start', 'Expiry', 'Status']],
      body: filteredRows.length > 0 ? filteredRows : [['—', '—', 'No matching subscriber records found for this period', '—', '—', '—', '—', '—', '—']],
      startY: 30,
      margin: { left: 8, right: 8, top: 30, bottom: 14 },
      styles: {
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        textColor: [27, 11, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [91, 33, 182], // Royal Purple
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [248, 246, 254],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 20, fontStyle: 'bold' },
        4: { cellWidth: 58 },
        5: { cellWidth: 22 },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
        8: { cellWidth: 16, halign: 'center' },
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Hindu Circulation Management • Royapuram, Chennai-13 • Page ${data.pageNumber} of ${pageCount}`,
          105,
          292,
          { align: 'center' }
        );
      },
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Hindu_Report_${monthName}_${year}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'PDF Generation failed' }, { status: 500 });
  }
}
