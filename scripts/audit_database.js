const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function audit() {
  const seed = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));
  console.log('=== SEED DATA ===');
  console.log('Seed Customers:', seed.customers.length);
  const seedSubsCount = seed.customers.reduce((acc, c) => acc + (c.subscriptions?.length || 0), 0);
  console.log('Seed Subscriptions:', seedSubsCount);

  const { data: dbCusts, error: cErr } = await sb.from('hindu_customers').select('id, customer_name, customer_code, mobile_number');
  if (cErr) {
    console.error('Error fetching db customers:', cErr);
    return;
  }
  console.log('\n=== SUPABASE DB ===');
  console.log('DB Customers in hindu_customers:', dbCusts.length);

  const { data: dbSubs, error: sErr } = await sb.from('hindu_subscriptions').select('id, customer_id, newspaper_id, order_no, start_date, end_date, status, hindu_newspapers(code)');
  if (sErr) {
    console.error('Error fetching db subs:', sErr);
    return;
  }
  console.log('DB Subscriptions in hindu_subscriptions:', dbSubs.length);

  const paperCounts = {};
  dbSubs.forEach(s => {
    const code = s.hindu_newspapers?.code || 'UNKNOWN';
    paperCounts[code] = (paperCounts[code] || 0) + 1;
  });
  console.log('DB Paper Breakdown in hindu_subscriptions:', paperCounts);
}

audit();
