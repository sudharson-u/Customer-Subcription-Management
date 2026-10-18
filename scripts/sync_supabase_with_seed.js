const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const supabase = createClient(url, key);

async function syncData() {
  console.log('🔄 Starting Synchronous In-Place Data Update for Hindu Portal...');

  // 1. Fetch newspapers
  const { data: papers, error: pErr } = await supabase.from('hindu_newspapers').select('*');
  if (pErr || !papers) {
    console.error('Failed to load newspapers:', pErr);
    return;
  }
  const paperMap = {};
  papers.forEach(p => { paperMap[p.code] = p.id; });

  // 2. Load seed_data.json
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  const newCustomers = seed.customers || [];
  console.log(`Loaded ${newCustomers.length} customer dossiers from seed_data.json`);

  // 3. Fetch existing hindu_customers
  const { data: existingCustomers, error: cErr } = await supabase.from('hindu_customers').select('*');
  if (cErr) {
    console.error('Failed to load hindu_customers:', cErr);
    return;
  }
  console.log(`Found ${existingCustomers.length} existing customers in hindu_customers.`);

  let updatedCount = 0;
  let insertedCount = 0;
  let subUpdatedCount = 0;
  let subInsertedCount = 0;

  for (const c of newCustomers) {
    // Match by 10-digit mobile if available, or customer_code, or exact name
    const match = existingCustomers.find(ex => {
      if (c.mobile_number && c.mobile_number.length === 10 && ex.mobile_number === c.mobile_number) return true;
      if (c.customer_code && ex.customer_code === c.customer_code) return true;
      if (ex.customer_name.toLowerCase().trim() === c.customer_name.toLowerCase().trim()) return true;
      return false;
    });

    let customerId;

    if (match) {
      customerId = match.id;
      // Update customer details with the new Excel data
      const { error: uErr } = await supabase
        .from('hindu_customers')
        .update({
          customer_name: c.customer_name,
          mobile_number: c.mobile_number || '',
          email: c.email || null,
          address: c.address || '',
          street_area: c.street_area || 'Royapuram',
          pincode: c.pincode || '600013',
          customer_type: c.customer_type || 'Regular',
          notes: c.notes || null,
          version: (match.version || 1) + 1,
        })
        .eq('id', customerId);

      if (!uErr) updatedCount++;
      else console.warn(`Error updating ${c.customer_name}:`, uErr.message);
    } else {
      // Insert new customer
      const { data: newCust, error: iErr } = await supabase
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

      if (newCust) {
        customerId = newCust.id;
        insertedCount++;
      } else {
        console.warn(`Error inserting ${c.customer_name}:`, iErr?.message);
        continue;
      }
    }

    // Now update / sync subscriptions for this customer
    const { data: existingSubs } = await supabase
      .from('hindu_subscriptions')
      .select('*')
      .eq('customer_id', customerId);

    for (const s of c.subscriptions || []) {
      const pId = paperMap[s.newspaper] || paperMap['THE_HINDU'];
      // Find matching existing sub by newspaper
      const subMatch = (existingSubs || []).find(es => es.newspaper_id === pId);

      if (subMatch) {
        const { error: sUpdateErr } = await supabase
          .from('hindu_subscriptions')
          .update({
            order_no: s.order_no || null,
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            status: s.status || 'Active',
            is_end_date_calculated: s.is_end_date_calculated || false,
            needs_review: s.needs_review || false,
            review_reason: s.review_reason || null,
            is_current: true,
          })
          .eq('id', subMatch.id);

        if (!sUpdateErr) subUpdatedCount++;
      } else {
        const { error: sInsertErr } = await supabase
          .from('hindu_subscriptions')
          .insert({
            customer_id: customerId,
            newspaper_id: pId,
            order_no: s.order_no || null,
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            status: s.status || 'Active',
            is_end_date_calculated: s.is_end_date_calculated || false,
            needs_review: s.needs_review || false,
            review_reason: s.review_reason || null,
            is_current: true,
            version: 1,
          });

        if (!sInsertErr) subInsertedCount++;
      }
    }
  }

  console.log('\n✅ SYNC COMPLETE:');
  console.log(`- Customers Updated: ${updatedCount}`);
  console.log(`- Customers Inserted: ${insertedCount}`);
  console.log(`- Subscriptions Updated: ${subUpdatedCount}`);
  console.log(`- Subscriptions Inserted: ${subInsertedCount}`);
}

syncData().catch(console.error);
