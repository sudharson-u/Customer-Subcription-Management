const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const supabase = createClient(url, key);

async function reseed() {
  console.log('🚀 CLEAN RE-SEED OF ISOLATED HINDU PORTAL TABLES ONLY');
  console.log('Targeting ONLY hindu_* tables. TOI records remain completely untouched.');

  // 1. Fetch newspapers to build mapping
  const { data: papers, error: pErr } = await supabase.from('hindu_newspapers').select('*');
  if (pErr || !papers || papers.length === 0) {
    console.error('Failed to get hindu_newspapers:', pErr);
    return;
  }
  const paperMap = {};
  papers.forEach(p => { paperMap[p.code] = p.id; });
  console.log('Paper mappings:', paperMap);

  // 2. Clean only isolated hindu_* child tables first
  console.log('Clearing old hindu_notifications and hindu_audit_logs...');
  await supabase.from('hindu_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('hindu_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Clearing old hindu_subscriptions...');
  const { error: delSubErr } = await supabase.from('hindu_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delSubErr) {
    console.error('Error clearing hindu_subscriptions:', delSubErr);
    return;
  }

  console.log('Clearing old hindu_customers...');
  const { error: delCustErr } = await supabase.from('hindu_customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delCustErr) {
    console.error('Error clearing hindu_customers:', delCustErr);
    return;
  }

  // 3. Load seed_data.json
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  const customers = seed.customers || [];
  console.log(`Loaded ${customers.length} customer dossiers from seed_data.json`);

  let customerInsertCount = 0;
  let subInsertCount = 0;

  for (const c of customers) {
    const { data: insertedCust, error: cErr } = await supabase
      .from('hindu_customers')
      .insert({
        customer_code: c.customer_code,
        customer_name: c.customer_name,
        mobile_number: c.mobile_number || '',
        email: c.email || null,
        address: c.address || '',
        street_area: c.street_area || 'Royapuram',
        pincode: c.pincode || '600013',
        customer_type: c.customer_type || 'Regular',
        notes: c.notes || null,
        version: 1,
      })
      .select('id')
      .single();

    if (cErr || !insertedCust) {
      console.error(`Error inserting ${c.customer_name}:`, cErr?.message);
      continue;
    }

    customerInsertCount++;
    const customerId = insertedCust.id;

    for (const s of c.subscriptions || []) {
      const pId = paperMap[s.newspaper];
      if (!pId) {
        console.error(`Newspaper ${s.newspaper} not mapped!`);
        continue;
      }

      const { error: sErr } = await supabase
        .from('hindu_subscriptions')
        .insert({
          customer_id: customerId,
          newspaper_id: pId,
          order_no: s.order_no || null,
          start_date: s.start_date || null,
          end_date: s.end_date || null,
          status: s.status || 'Active',
          is_current: true,
          is_end_date_calculated: s.is_end_date_calculated || false,
          needs_review: s.needs_review || false,
          review_reason: s.review_reason || null,
          remarks: s.remarks || c.notes || null,
          version: 1,
        });

      if (sErr) {
        console.error(`Error inserting subscription for ${c.customer_name} (${s.newspaper}):`, sErr.message);
      } else {
        subInsertCount++;
      }
    }
  }

  console.log(`\n🎉 Seed finished: ${customerInsertCount} customers, ${subInsertCount} subscriptions.`);

  // 4. Verification queries
  const { data: finalSubs } = await supabase
    .from('hindu_subscriptions')
    .select('*, hindu_newspapers(code, name)');

  const countsByCode = {};
  (finalSubs || []).forEach(s => {
    const code = s.hindu_newspapers?.code || 'UNKNOWN';
    countsByCode[code] = (countsByCode[code] || 0) + 1;
  });

  const { count: finalCustCount } = await supabase.from('hindu_customers').select('*', { count: 'exact', head: true });

  console.log('\n📊 === FINAL COUNTS IN SUPABASE ===');
  console.log(`Total Customers: ${finalCustCount}`);
  console.log(`Total Subscriptions: ${finalSubs.length}`);
  console.log('Per Newspaper:');
  console.log(`  - The Hindu: ${countsByCode['THE_HINDU'] || 0} (Expected: 35)`);
  console.log(`  - Dinamalar: ${countsByCode['DINAMALAR'] || 0} (Expected: 21)`);
  console.log(`  - NIE / DIN: ${countsByCode['NIE_DIN'] || 0} (Expected: 18)`);
  console.log(`  - Dinakaran: ${countsByCode['DINAKARAN'] || 0} (Expected: 5)`);

  // Verify Aadhavan specifically
  const { data: aadhavanCust } = await supabase
    .from('hindu_customers')
    .select('id, customer_name')
    .ilike('customer_name', '%aadhavan%');

  if (aadhavanCust && aadhavanCust.length > 0) {
    const { data: aSubs } = await supabase
      .from('hindu_subscriptions')
      .select('*, hindu_newspapers(code, name)')
      .eq('customer_id', aadhavanCust[0].id);

    console.log(`\n🔎 Aadhavan Ad Service subscriptions (${aSubs?.length}):`);
    aSubs?.forEach(s => {
      console.log(`  - Paper: ${s.hindu_newspapers?.name} (${s.hindu_newspapers?.code}), Order: #${s.order_no}, Status: ${s.status}`);
    });
  }
}

reseed();
