const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/))[1].trim().replace(/['"]/g, '');

const supabase = createClient(url, key);

function cleanText(t) { return !t ? '' : String(t).replace(/\s+/g, ' ').trim(); }
function sanitizePhone(p) {
  if (!p) return '';
  let str = String(p).trim().replace(/\D/g, '');
  if (str.startsWith('91') && str.length === 12) str = str.slice(2);
  if (str.startsWith('0') && str.length === 11) str = str.slice(1);
  return str.slice(-10);
}

function normalizeCustomerName(name) {
  if (!name) return '';
  return cleanText(name).toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/y$/, 'i');
}

function isSameCustomer(c1, c2) {
  const p1 = sanitizePhone(c1.mobile_number || c1.mobile || '');
  const p2 = sanitizePhone(c2.mobile_number || c2.mobile || '');

  if (p1.length === 10 && p2.length === 10 && p1 !== p2) return false;

  const n1 = normalizeCustomerName(c1.customer_name || c1.name || '');
  const n2 = normalizeCustomerName(c2.customer_name || c2.name || '');

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    if (shorter === 'ravi' && (n1.includes('ravindran') || n2.includes('ravindran'))) return false;
    if (shorter === 'siva' && (n1.includes('sivakumar') || n2.includes('sivakumar'))) return false;
    if (shorter.length >= 5) return true;
  }
  return false;
}

async function runMigration() {
  console.log('🚀 Starting customer separation and database synchronization...');

  // 1. Get newspaper IDs
  const { data: papers, error: pErr } = await supabase.from('hindu_newspapers').select('*');
  if (pErr || !papers) {
    console.error('Failed to load hindu_newspapers:', pErr);
    return;
  }
  const paperMap = {};
  papers.forEach(p => { paperMap[p.code] = p.id; });
  console.log('Newspapers:', paperMap);

  // 2. Load seed_data.json
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  const seedCustomers = seed.customers || [];
  console.log(`Loaded ${seedCustomers.length} customer records from seed_data.json`);

  // 3. Load all existing customers in hindu_customers
  const { data: existingCustomers, error: cErr } = await supabase.from('hindu_customers').select('*');
  if (cErr) {
    console.error('Failed to load hindu_customers:', cErr);
    return;
  }
  console.log(`Found ${existingCustomers.length} existing customers in DB`);

  const customerIdMap = new Map(); // seedCustomer customer_code -> DB id
  const existingCodes = new Set(existingCustomers.map(c => c.customer_code).filter(Boolean));
  let maxCodeNum = 0;
  for (const c of existingCustomers) {
    if (c.customer_code && c.customer_code.startsWith('HIN-')) {
      const n = parseInt(c.customer_code.replace('HIN-', ''), 10);
      if (!isNaN(n) && n > maxCodeNum) maxCodeNum = n;
    }
  }

  for (const sc of seedCustomers) {
    // Match by exact identity (phone AND name match)
    const match = existingCustomers.find(ec => isSameCustomer(ec, sc));
    if (match) {
      // Update customer info
      await supabase
        .from('hindu_customers')
        .update({
          customer_name: sc.customer_name,
          mobile_number: sc.mobile_number || '',
          email: sc.email || null,
          address: sc.address || '',
          street_area: sc.street_area || 'Royapuram',
          pincode: sc.pincode || '600013',
          customer_type: sc.customer_type || 'Regular',
          notes: sc.notes || null,
        })
        .eq('id', match.id);
      customerIdMap.set(sc.customer_code, match.id);
    } else {
      // Generate guaranteed unique customer_code
      let targetCode = sc.customer_code;
      if (existingCodes.has(targetCode)) {
        maxCodeNum++;
        targetCode = `HIN-${String(maxCodeNum).padStart(4, '0')}`;
      }
      existingCodes.add(targetCode);

      // Create separate customer record
      const { data: created, error: crErr } = await supabase
        .from('hindu_customers')
        .insert({
          customer_name: sc.customer_name,
          customer_code: targetCode,
          mobile_number: sc.mobile_number || '',
          email: sc.email || null,
          address: sc.address || '',
          street_area: sc.street_area || 'Royapuram',
          pincode: sc.pincode || '600013',
          customer_type: sc.customer_type || 'Regular',
          notes: sc.notes || null,
          version: 1,
        })
        .select('id')
        .single();

      if (crErr) {
        console.error(`Failed to create separate customer for ${sc.customer_name}:`, crErr.message);
      } else {
        console.log(`+ Created separate customer: ${sc.customer_name} (${targetCode})`);
        customerIdMap.set(sc.customer_code, created.id);
      }
    }
  }

  // 4. In-place subscription synchronization
  // Fetch all existing subscriptions in hindu_subscriptions
  const { data: existingSubs, error: subFetchErr } = await supabase
    .from('hindu_subscriptions')
    .select('*, hindu_newspapers(code)');

  if (subFetchErr) {
    console.error('Failed to fetch existing subscriptions:', subFetchErr);
    return;
  }
  console.log(`Found ${existingSubs.length} existing subscriptions in DB.`);

  let reassignedCount = 0;
  let insertedSubCount = 0;

  for (const sc of seedCustomers) {
    const custDbId = customerIdMap.get(sc.customer_code);
    if (!custDbId) continue;

    for (const targetSub of sc.subscriptions) {
      const pId = paperMap[targetSub.newspaper];
      if (!pId) continue;

      // Find an existing subscription for this newspaper and matching dates
      let match = existingSubs.find(es => {
        if (es._used) return false;
        if (es.newspaper_id !== pId) return false;
        // Same customer already
        if (es.customer_id === custDbId) return true;
        // Or dates match and currently assigned to another customer
        if (es.start_date === targetSub.start_date && es.end_date === targetSub.end_date) return true;
        return false;
      });

      if (match) {
        match._used = true;
        if (match.customer_id !== custDbId) {
          console.log(`Reassigning ${targetSub.newspaper} sub from wrong customer to ${sc.customer_name}...`);
          await supabase
            .from('hindu_subscriptions')
            .update({ customer_id: custDbId })
            .eq('id', match.id);
          match.customer_id = custDbId;
          reassignedCount++;
        }
      } else {
        // Insert missing subscription
        console.log(`+ Inserting missing sub for ${sc.customer_name} (${targetSub.newspaper})...`);
        const { error: insErr } = await supabase.from('hindu_subscriptions').insert({
          customer_id: custDbId,
          newspaper_id: pId,
          order_no: targetSub.order_no || null,
          start_date: targetSub.start_date || null,
          end_date: targetSub.end_date || null,
          duration_months: 12,
          status: targetSub.status || 'Active',
          is_current: true,
          is_end_date_calculated: targetSub.is_end_date_calculated || false,
          needs_review: targetSub.needs_review || false,
          review_reason: targetSub.review_reason || null,
          remarks: targetSub.remarks || null,
          version: 1,
        });
        if (!insErr) insertedSubCount++;
      }
    }
  }

  console.log(`\nReassigned: ${reassignedCount}, Inserted: ${insertedSubCount}`);

  // 5. Verification
  const { data: finalSubs } = await supabase
    .from('hindu_subscriptions')
    .select('*, hindu_newspapers(code), hindu_customers(customer_name, mobile_number)');

  console.log(`Total subscriptions in hindu_subscriptions: ${finalSubs.length}`);

  const counts = {};
  finalSubs.forEach(s => {
    const code = s.hindu_newspapers?.code;
    counts[code] = (counts[code] || 0) + 1;
  });
  console.log('Counts by newspaper in DB:', counts);

  console.log('\nChecking 9003103868 in DB:');
  const check9003 = finalSubs.filter(s => s.hindu_customers?.mobile_number === '9003103868');
  check9003.forEach(s => {
    console.log(` - Customer: ${s.hindu_customers?.customer_name} | Paper: ${s.hindu_newspapers?.code}`);
  });
}

runMigration();
