const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const supabase = createClient(url, key);

async function cleanAndSync() {
  console.log('🔄 Synchronizing hindu_* tables strictly to match seed_data.json (79 subscriptions)...');

  // 1. Fetch newspapers
  const { data: papers, error: pErr } = await supabase.from('hindu_newspapers').select('*');
  if (pErr || !papers) {
    console.error('Failed to load hindu_newspapers:', pErr);
    return;
  }
  const paperMap = {};
  papers.forEach(p => { paperMap[p.code] = p.id; });
  console.log('Newspaper mappings:', paperMap);

  // 2. Load seed_data.json
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  const seedCustomers = seed.customers || [];
  console.log(`Loaded ${seedCustomers.length} customer dossiers from seed_data.json`);

  // 3. Fetch all existing customers in hindu_customers
  const { data: existingCustomers, error: cErr } = await supabase.from('hindu_customers').select('*');
  if (cErr) {
    console.error('Failed to load hindu_customers:', cErr);
    return;
  }

  const validCustomerIds = new Set();
  const validSubscriptionIds = new Set();

  for (const c of seedCustomers) {
    // Match existing by mobile (if 10 digits), customer_code, or exact name
    const match = existingCustomers.find(ex => {
      if (c.mobile_number && c.mobile_number.length === 10 && ex.mobile_number === c.mobile_number) return true;
      if (c.customer_code && ex.customer_code === c.customer_code) return true;
      if (ex.customer_name.toLowerCase().trim() === c.customer_name.toLowerCase().trim()) return true;
      return false;
    });

    let customerId;

    if (match) {
      customerId = match.id;
      await supabase
        .from('hindu_customers')
        .update({
          customer_code: c.customer_code,
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
    } else {
      const { data: inserted, error: iErr } = await supabase
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

      if (iErr || !inserted) {
        console.error(`Failed to insert customer ${c.customer_name}:`, iErr);
        continue;
      }
      customerId = inserted.id;
    }

    validCustomerIds.add(customerId);

    // Now sync subscriptions for this customer
    const { data: existingSubs } = await supabase
      .from('hindu_subscriptions')
      .select('*')
      .eq('customer_id', customerId);

    for (const s of c.subscriptions || []) {
      const pId = paperMap[s.newspaper];
      if (!pId) {
        console.error(`Unknown newspaper code: ${s.newspaper}`);
        continue;
      }

      // Check if there is an existing sub for this customer & newspaper
      const existingSub = (existingSubs || []).find(es => es.newspaper_id === pId);

      if (existingSub) {
        const { data: updatedSub, error: uSubErr } = await supabase
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
          .eq('id', existingSub.id)
          .select('id')
          .single();

        if (updatedSub) {
          validSubscriptionIds.add(updatedSub.id);
        }
      } else {
        const { data: newSub, error: nSubErr } = await supabase
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
          })
          .select('id')
          .single();

        if (newSub) {
          validSubscriptionIds.add(newSub.id);
        }
      }
    }
  }

  console.log(`Valid customers processed: ${validCustomerIds.size}`);
  console.log(`Valid subscriptions processed: ${validSubscriptionIds.size}`);

  // 4. Delete obsolete subscriptions in hindu_subscriptions
  const { data: allDbSubs } = await supabase.from('hindu_subscriptions').select('id, customer_id');
  const subsToDelete = (allDbSubs || []).filter(s => !validSubscriptionIds.has(s.id));
  console.log(`Found ${subsToDelete.length} obsolete subscriptions to delete from hindu_subscriptions...`);

  if (subsToDelete.length > 0) {
    const idsToDelete = subsToDelete.map(s => s.id);
    // Delete in batches of 50
    for (let i = 0; i < idsToDelete.length; i += 50) {
      const batch = idsToDelete.slice(i, i + 50);
      const { error: delErr } = await supabase.from('hindu_subscriptions').delete().in('id', batch);
      if (delErr) {
        console.error('Error deleting obsolete subscriptions batch:', delErr);
      }
    }
    console.log(`Deleted ${subsToDelete.length} obsolete subscriptions.`);
  }

  // 5. Delete any customer in hindu_customers that is not in validCustomerIds
  const custsToDelete = (existingCustomers || []).filter(c => !validCustomerIds.has(c.id));
  console.log(`Found ${custsToDelete.length} obsolete customers to delete from hindu_customers...`);
  if (custsToDelete.length > 0) {
    const custIdsToDelete = custsToDelete.map(c => c.id);
    for (let i = 0; i < custIdsToDelete.length; i += 50) {
      const batch = custIdsToDelete.slice(i, i + 50);
      const { error: delCustErr } = await supabase.from('hindu_customers').delete().in('id', batch);
      if (delCustErr) {
        console.error('Error deleting obsolete customers batch:', delCustErr);
      }
    }
  }

  // 6. Verify final numbers in hindu_subscriptions
  const { data: finalSubs } = await supabase.from('hindu_subscriptions').select('*, hindu_newspapers(code)');
  const { count: finalCustCount } = await supabase.from('hindu_customers').select('*', { count: 'exact', head: true });
  
  const finalBreakdown = {};
  (finalSubs || []).forEach(s => {
    const code = s.hindu_newspapers?.code || 'UNKNOWN';
    finalBreakdown[code] = (finalBreakdown[code] || 0) + 1;
  });

  console.log('\n=== FINAL VERIFICATION IN SUPABASE ===');
  console.log(`Total hindu_customers: ${finalCustCount}`);
  console.log(`Total hindu_subscriptions: ${finalSubs?.length}`);
  console.log('Breakdown by Newspaper:', finalBreakdown);

  // Check Aadhavan specifically
  const { data: aadhavanCust } = await supabase.from('hindu_customers').select('id, customer_name').ilike('customer_name', '%aadhavan%');
  if (aadhavanCust && aadhavanCust.length > 0) {
    const { data: aSubs } = await supabase.from('hindu_subscriptions').select('*, hindu_newspapers(code, name)').eq('customer_id', aadhavanCust[0].id);
    console.log(`Aadhavan Subscriptions count: ${aSubs?.length}`);
    console.log('Aadhavan Subscriptions:', aSubs?.map(s => ({
      newspaper: s.hindu_newspapers?.name,
      code: s.hindu_newspapers?.code,
      order_no: s.order_no,
      status: s.status,
    })));
  }
}

cleanAndSync();
