import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getMockCustomers, saveMockCustomer } from '@/lib/mockData';
import { sanitizePhone, isSameCustomerIdentity } from '@/lib/utils';
import { NewspaperCode } from '@/lib/types';
import { invalidateServerCustomerCache } from '@/lib/dataCache';
import * as XLSX from 'xlsx';
import { parseISO, isValid, addYears, subDays, format } from 'date-fns';

function parseDateValue(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
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
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const name = String(row['Name'] || row['Customer Name'] || row['NAME'] || '').trim();
        const phone = sanitizePhone(row['Phone'] || row['Mobile'] || row['Mobile Number'] || '');
        const addr = String(row['Address'] || row['ADDRESS'] || '').trim();
        const order = String(row['Order No'] || row['Order ID'] || '').trim();
        const rawPub = String(row['Publication'] || row['Newspaper'] || defaultPaper).toUpperCase();

        let paper: NewspaperCode = defaultPaper;
        if (rawPub.includes('DINAKARAN')) paper = 'DINAKARAN';
        else if (rawPub.includes('DINAMALAR')) paper = 'DINAMALAR';
        else if (rawPub.includes('NIE')) paper = 'NIE_DIN';
        else if (rawPub.includes('HINDU')) paper = 'THE_HINDU';

        let sDate = parseDateValue(row['Start Date'] || row['START DATE']);
        let eDate = parseDateValue(row['End Date'] || row['END DATE']);
        let isCalc = false;

        if (sDate && !eDate) {
          eDate = format(subDays(addYears(parseISO(sDate), 1), 1), 'yyyy-MM-dd');
          isCalc = true;
        }

        if (!name) {
          skipped++;
          errors.push({ row: i + 2, field: 'name', message: 'Name is required' });
          continue;
        }

        try {
          // Check existing customer with same identity (phone AND name match)
          let customerId: string | null = null;
          if (phone && phone.length === 10) {
            const { data: existingList } = await supabase
              .from(TABLES.CUSTOMERS)
              .select('id, customer_name, mobile_number')
              .eq('mobile_number', phone)
              .is('deleted_at', null);

            if (existingList && existingList.length > 0) {
              const match = existingList.find(ex =>
                isSameCustomerIdentity(
                  { customer_name: name, mobile_number: phone },
                  { customer_name: ex.customer_name, mobile_number: ex.mobile_number }
                )
              );
              if (match) {
                customerId = match.id;
                updated++;
              }
            }
          }

          if (!customerId) {
            const { data: newCust, error: cErr } = await supabase
              .from(TABLES.CUSTOMERS)
              .insert({
                customer_name: name,
                mobile_number: phone,
                address: addr,
                street_area: 'Royapuram',
                pincode: '600013',
                customer_type: 'Regular',
              })
              .select('id')
              .single();
            if (cErr) throw cErr;
            customerId = newCust.id;
            imported++;
          }

          // Insert subscription
          const { data: pData } = await supabase.from(TABLES.NEWSPAPERS).select('id').eq('code', paper).single();
          if (pData) {
            await supabase.from(TABLES.SUBSCRIPTIONS).insert({
              customer_id: customerId,
              newspaper_id: pData.id,
              order_no: order,
              start_date: sDate,
              end_date: eDate,
              is_end_date_calculated: isCalc,
              status: 'Active',
              is_current: true,
            });
          }
        } catch (err: any) {
          skipped++;
          errors.push({ row: i + 2, field: 'database', message: err.message });
        }
      }

      // Record batch log
      await supabase.from(TABLES.IMPORT_BATCHES).insert({
        filename: file.name,
        newspaper_code: defaultPaper,
        total_rows: rawRows.length,
        imported_count: imported,
        updated_count: updated,
        skipped_count: skipped,
      });
    } else {
      // Mock import
      rawRows.forEach((row, i) => {
        const name = String(row['Name'] || row['Customer Name'] || '').trim();
        const phone = sanitizePhone(row['Phone'] || row['Mobile'] || '');
        if (!name) {
          skipped++;
          return;
        }
        imported++;
        saveMockCustomer({
          id: `cust-${Date.now()}-${i}`,
          customer_name: name,
          mobile_number: phone,
          address: String(row['Address'] || 'Royapuram, Chennai-13').trim(),
          customer_type: 'Regular',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subscriptions: [
            {
              id: `sub-${Date.now()}-${i}`,
              customer_id: '',
              newspaper_id: `paper-${defaultPaper.toLowerCase().replace('_', '')}`,
              status: 'Active',
              is_current: true,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        });
      });
    }

    invalidateServerCustomerCache();

    return NextResponse.json({
      total: rawRows.length,
      imported,
      updated,
      skipped,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}
