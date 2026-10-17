import { jsPDF } from 'jspdf';
import at from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { formatOrderId, formatDate } from './utils';
import { Customer, NewspaperCode } from './types';

const autoTable = typeof at === 'function' ? at : (at as any).default || at;

export interface PDFTableRow {
  sNo: number;
  customerName: string;
  address: string;
  mobileNo: string;
  publication: string;
  startDate: string;
  endDate: string;
}

export interface PDFExportOptions {
  customTitle?: string;
  newspaperFilter?: NewspaperCode | 'ALL';
  zoneName?: string;
  filterLabel?: string;
  customRows?: PDFTableRow[];
}

export function generateCustomersPDF(customers: Customer[], options: PDFExportOptions = {}) {
  const {
    newspaperFilter = 'ALL',
    customRows,
  } = options;

  // Portrait A4 (210mm x 297mm)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();

  // Prepare Rows in the exact requested format:
  // S.No, Customer Name, Address, Mobile No., Publication, Start Date, End Date
  const rawRows: any[] = [];
  let currentSNo = 1;

  if (customRows && customRows.length > 0) {
    customRows.forEach((r, idx) => {
      rawRows.push([
        String(r.sNo || idx + 1),
        r.customerName || '',
        r.address || '',
        r.mobileNo || '',
        r.publication || '',
        r.startDate || '',
        r.endDate || '',
      ]);
    });
  } else {
    customers.forEach((c) => {
      const subs = c.subscriptions?.filter((s) => {
        if (!newspaperFilter || newspaperFilter === 'ALL') return true;
        const code = (s.newspaper as any)?.code || (s as any).newspaper;
        return code === newspaperFilter;
      }) || [];

      if (subs.length === 0) {
        rawRows.push([
          String(currentSNo++),
          c.customer_name || '',
          c.address || '',
          c.mobile_number || '',
          '—',
          '—',
          '—',
        ]);
      } else {
        subs.forEach((sub) => {
          const paperName = sub.newspaper?.name || (sub as any).newspaper || 'The Hindu';
          const sDate = sub.start_date ? formatDate(sub.start_date) : '';
          const eDate = sub.end_date ? formatDate(sub.end_date) : '';

          rawRows.push([
            String(currentSNo++),
            c.customer_name || '',
            c.address || '',
            c.mobile_number || '',
            paperName,
            sDate,
            eDate,
          ]);
        });
      }
    });
  }

  // Exactly 16 records only on one page
  const RECORDS_PER_PAGE = 16;
  const pages: any[][] = [];

  for (let i = 0; i < rawRows.length; i += RECORDS_PER_PAGE) {
    pages.push(rawRows.slice(i, i + RECORDS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([['1', 'No records found', '', '', '', '', '']]);
  }

  pages.forEach((pageRows, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage();
    }

    autoTable(doc, {
      head: [['S.No', 'Customer Name', 'Address', 'Mobile No.', 'Publication', 'Start Date', 'End Date']],
      body: pageRows,
      startY: 12,
      margin: { left: 8, right: 8, top: 12, bottom: 12 },
      styles: {
        fontSize: 8,
        cellPadding: { top: 3.2, bottom: 3.2, left: 2, right: 2 },
        textColor: [27, 11, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [91, 33, 182], // Royal Purple #5B21B6
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 246, 254],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, // S.No
        1: { cellWidth: 38 },                   // Customer Name
        2: { cellWidth: 56 },                   // Address
        3: { cellWidth: 24, halign: 'center' }, // Mobile No.
        4: { cellWidth: 26 },                   // Publication
        5: { cellWidth: 19, halign: 'center' }, // Start Date
        6: { cellWidth: 19, halign: 'center' }, // End Date
      },
      didDrawPage: () => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${pageIdx + 1} of ${pages.length}`,
          105,
          292,
          { align: 'center' }
        );
      },
    });
  });

  const filename = customers.length === 1
    ? `Hindu_${customers[0].customer_name.replace(/[^a-zA-Z0-9]/g, '_')}_Profile_${format(now, 'yyyyMMdd')}.pdf`
    : `Hindu_Circulation_Report_${format(now, 'yyyyMMdd_HHmm')}.pdf`;

  doc.save(filename);
}
