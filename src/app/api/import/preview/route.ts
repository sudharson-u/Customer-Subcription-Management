import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { sanitizePhone } from '@/lib/utils';
import { NewspaperCode } from '@/lib/types';
import { parseISO, isValid } from 'date-fns';

function parseDateValue(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel date serial
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const iso = parseISO(str);
  if (isValid(iso)) return iso.toISOString().split('T')[0];
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const defaultPaper = (formData.get('newspaper') as NewspaperCode) || 'THE_HINDU';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'Uploaded spreadsheet is empty.' }, { status: 400 });
    }

    const previewRows: any[] = [];

    rawRows.forEach((row, idx) => {
      // Flexible field matching
      const name = clean(row['Name'] || row['Customer Name'] || row['Subscriber Name'] || row['NAME']);
      const phone = sanitizePhone(row['Phone'] || row['Mobile'] || row['Mobile No'] || row['Mobile Number'] || row['Phone Number'] || row['MOBILE NUMBER'] || '');
      const addr = clean(row['Address'] || row['Delivery Address'] || row['Customer Address'] || row['ADDRESS']);
      const order = clean(row['Order No'] || row['Order ID'] || row['Order Number'] || row['ORDER NO'] || row['ORDER ID']);
      const rawPub = clean(row['Publication'] || row['Newspaper'] || row['Paper'] || defaultPaper).toUpperCase();
      
      let paper: NewspaperCode = defaultPaper;
      if (rawPub.includes('DINAKARAN')) paper = 'DINAKARAN';
      else if (rawPub.includes('DINAMALAR')) paper = 'DINAMALAR';
      else if (rawPub.includes('NIE') || rawPub.includes('DINAMANI')) paper = 'NIE_DIN';
      else if (rawPub.includes('HINDU')) paper = 'THE_HINDU';

      const sDate = parseDateValue(row['Start Date'] || row['START DATE'] || row['Start']);
      const eDate = parseDateValue(row['End Date'] || row['END DATE'] || row['Expiry'] || row['End']);
      const type = clean(row['Customer Type'] || row['Type'] || 'Regular');

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!name) errors.push('Missing customer name');
      if (phone && phone.length !== 10) {
        warnings.push(`Mobile is ${phone.length} digits (expected 10)`);
      }
      if (!phone) {
        warnings.push('Mobile number missing');
      }

      previewRows.push({
        row: idx + 2,
        newspaper: paper,
        customer_name: name,
        mobile_number: phone,
        address: addr,
        order_no: order,
        start_date: sDate,
        end_date: eDate,
        customer_type: type.includes('Staff') ? 'Staff' : (type.includes('Free') ? 'Free Copy' : 'Regular'),
        valid: errors.length === 0,
        errors,
        warnings,
      });
    });

    return NextResponse.json({
      rows: previewRows,
      total: previewRows.length,
      valid_count: previewRows.filter(r => r.valid).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to parse file' }, { status: 500 });
  }
}

function clean(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}
