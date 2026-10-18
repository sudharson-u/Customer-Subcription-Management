const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function check() {
  const { data: c, count: cCount, error: cErr } = await sb.from('customers').select('*', { count: 'exact' });
  const { data: s, count: sCount, error: sErr } = await sb.from('subscriptions').select('*', { count: 'exact' });
  console.log('customers count:', cCount, cErr?.message || '');
  console.log('subscriptions count:', sCount, sErr?.message || '');

  const { data: hc } = await sb.from('hindu_customers').select('id, customer_code, customer_name, mobile_number').limit(5);
  console.log('Sample hindu_customers in DB:');
  console.log(hc);
}

check();
