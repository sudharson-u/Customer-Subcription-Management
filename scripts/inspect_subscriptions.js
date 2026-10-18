const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function inspect() {
  const { data: papers } = await sb.from('hindu_newspapers').select('*');
  const paperMap = {};
  papers.forEach(p => { paperMap[p.id] = p.code; });

  const { data: subs, error } = await sb.from('hindu_subscriptions').select('*, hindu_customers(*)');
  if (error) {
    console.error('Error fetching subs:', error);
    return;
  }

  console.log('Total subscriptions in hindu_subscriptions:', subs.length);
  const byPaper = {};
  subs.forEach(s => {
    const code = paperMap[s.newspaper_id] || 'UNKNOWN';
    byPaper[code] = (byPaper[code] || 0) + 1;
  });
  console.log('By Paper in hindu_subscriptions:', byPaper);

  const aadhavanSubs = subs.filter(s => s.hindu_customers?.customer_name?.toLowerCase().includes('aadhavan'));
  console.log('Aadhavan subs in DB:', aadhavanSubs.map(s => ({
    id: s.id,
    customer_id: s.customer_id,
    newspaper: paperMap[s.newspaper_id],
    order_no: s.order_no,
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
  })));
}

inspect();
