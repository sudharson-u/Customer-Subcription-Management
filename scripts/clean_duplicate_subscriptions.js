const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '') || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const sb = createClient(url, key);

async function cleanDuplicates() {
  const { data: subs, error } = await sb
    .from('hindu_subscriptions')
    .select('id, customer_id, newspaper_id, start_date, end_date, status, created_at, hindu_customers(customer_name), hindu_newspapers(code)');

  if (error) {
    console.error('Error fetching subs:', error);
    return;
  }

  console.log(`Total subscriptions currently in DB: ${subs.length}`);

  // Group by customer_id + newspaper_id
  const groups = new Map();
  for (const s of subs) {
    const key = `${s.customer_id}__${s.newspaper_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  let duplicatesFound = 0;
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      duplicatesFound++;
      const custName = list[0].hindu_customers?.customer_name;
      const paperCode = list[0].hindu_newspapers?.code;
      console.log(`\nDuplicate found for ${custName} (${paperCode}): ${list.length} rows`);

      // Keep the one with the latest end_date or latest updated date
      list.sort((a, b) => {
        const dateA = a.end_date || '';
        const dateB = b.end_date || '';
        return dateB.localeCompare(dateA);
      });

      const toKeep = list[0];
      const toDelete = list.slice(1);

      console.log(`  -> Keeping: ID ${toKeep.id} (Dates: ${toKeep.start_date} to ${toKeep.end_date})`);
      for (const d of toDelete) {
        console.log(`  -> Deleting duplicate: ID ${d.id} (Dates: ${d.start_date} to ${d.end_date})`);
        const { error: delErr } = await sb.from('hindu_subscriptions').delete().eq('id', d.id);
        if (delErr) console.error(`Error deleting ${d.id}:`, delErr);
      }
    }
  }

  console.log(`\nTotal duplicate groups cleaned: ${duplicatesFound}`);

  // Final check of counts
  const { data: finalSubs } = await sb.from('hindu_subscriptions').select('*, hindu_newspapers(code)');
  console.log(`Final subscriptions count in hindu_subscriptions: ${finalSubs.length}`);

  const counts = {};
  finalSubs.forEach(s => {
    const code = s.hindu_newspapers?.code;
    counts[code] = (counts[code] || 0) + 1;
  });
  console.log('Final counts by newspaper in DB:', counts);
}

cleanDuplicates();
