const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function findExtra() {
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  const { data: dbCusts } = await sb.from('hindu_customers').select('*');
  const { data: dbSubs } = await sb.from('hindu_subscriptions').select('*, hindu_newspapers(code)');

  console.log(`dbCusts: ${dbCusts.length}, dbSubs: ${dbSubs.length}`);

  // Create lookup for seed customers and subscriptions
  // Match dbCust to seed customer
  const extraSubs = [];
  const validSubs = [];

  for (const s of dbSubs) {
    const cust = dbCusts.find(c => c.id === s.customer_id);
    if (!cust) {
      extraSubs.push({ id: s.id, reason: 'No customer found', sub: s });
      continue;
    }

    const seedCust = seed.customers.find(sc => {
      if (sc.mobile_number && sc.mobile_number.length === 10 && sc.mobile_number === cust.mobile_number) return true;
      if (sc.customer_code && sc.customer_code === cust.customer_code) return true;
      if (sc.customer_name.toLowerCase().trim() === cust.customer_name.toLowerCase().trim()) return true;
      return false;
    });

    if (!seedCust) {
      extraSubs.push({ id: s.id, customer: cust.customer_name, reason: 'Customer not in seed', sub: s });
      continue;
    }

    const paperCode = s.hindu_newspapers?.code;
    // Check if seedCust has a subscription with this paperCode
    const matchSeedSub = (seedCust.subscriptions || []).find(ss => ss.newspaper === paperCode);
    if (!matchSeedSub) {
      extraSubs.push({
        id: s.id,
        customer: cust.customer_name,
        paper: paperCode,
        order_no: s.order_no,
        reason: 'Newspaper not in seed for this customer'
      });
    } else {
      validSubs.push(s.id);
    }
  }

  console.log('Total Extra/Obsolete Subscriptions in DB:', extraSubs.length);
  console.log('Valid Subscriptions in DB:', validSubs.length);
  console.log('List of Extra Subscriptions:');
  console.log(JSON.stringify(extraSubs, null, 2));
}

findExtra();
