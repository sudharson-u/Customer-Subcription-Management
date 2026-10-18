const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function check() {
  const { data: custs } = await sb.from('hindu_customers').select('id, customer_name').ilike('customer_name', '%baskaran%');
  console.log('Baskaran found:', custs);
  for (const c of custs) {
    const { data: subs } = await sb.from('hindu_subscriptions').select('*, hindu_newspapers(code, name)').eq('customer_id', c.id);
    console.log(`Baskaran (${c.id}) has ${subs.length} subscriptions:`);
    subs.forEach(s => {
      console.log(`- ID: ${s.id}, Paper: ${s.hindu_newspapers?.name} (${s.hindu_newspapers?.code}), Dates: ${s.start_date} to ${s.end_date}, Status: ${s.status}, is_current: ${s.is_current}`);
    });
  }
}

check();
