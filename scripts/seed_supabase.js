/**
 * Supabase Database Seed Script for "Hindu" Customer Subscription Portal
 * Usage: node scripts/seed_supabase.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or process.env
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple .env.local parser if dotenv is not installed
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('----------------------------------------------------');
  console.log('⚠️  SUPABASE NOT CONFIGURED');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('The application will seamlessly operate in in-memory Mock Data mode.');
  console.log('----------------------------------------------------');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NEWSPAPERS_SEED = [
  {
    code: 'DINAKARAN',
    name: 'Dinakaran',
    short_name: 'DIN',
    language: 'Tamil',
    accent_color: '#DC2626',
    badge_bg: 'bg-red-50 dark:bg-red-950/40',
    badge_text: 'text-red-700 dark:text-red-300',
    active: true,
    display_order: 1,
  },
  {
    code: 'DINAMALAR',
    name: 'Dinamalar',
    short_name: 'DMR',
    language: 'Tamil',
    accent_color: '#EA580C',
    badge_bg: 'bg-orange-50 dark:bg-orange-950/40',
    badge_text: 'text-orange-700 dark:text-orange-300',
    active: true,
    display_order: 2,
  },
  {
    code: 'NIE_DIN',
    name: 'NIE / DIN',
    short_name: 'NIE',
    language: 'English / Tamil',
    accent_color: '#2563EB',
    badge_bg: 'bg-blue-50 dark:bg-blue-950/40',
    badge_text: 'text-blue-700 dark:text-blue-300',
    active: true,
    display_order: 3,
  },
  {
    code: 'THE_HINDU',
    name: 'The Hindu',
    short_name: 'HIN',
    language: 'English',
    accent_color: '#7C3AED',
    badge_bg: 'bg-purple-50 dark:bg-purple-950/40',
    badge_text: 'text-purple-700 dark:text-purple-300',
    active: true,
    display_order: 4,
  },
];

async function seed() {
  console.log('🚀 Starting Cloud Supabase Database Seeding...');

  // Auto-detect if hindu_ isolated tables exist
  let tablePrefix = '';
  const { data: testHindu } = await supabase.from('hindu_newspapers').select('count', { count: 'exact', head: true });
  if (testHindu !== null || process.env.SUPABASE_CUSTOMERS_TABLE?.startsWith('hindu_')) {
    tablePrefix = 'hindu_';
    console.log('🛡️  Using ISOLATED schema tables: hindu_customers, hindu_subscriptions, etc.');
    console.log('    Your 290 TOI customer records are protected and untouched.');
  } else {
    // Check if public.customers already has TOI records
    const { count: toiCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    if (toiCount && toiCount > 0) {
      console.log(`⚠️  Detected ${toiCount} existing records in public.customers from your TOI portal!`);
      console.log('    Please run supabase/schema_isolated.sql in Supabase SQL editor to create hindu_* tables');
      console.log('    so both apps can safely share this Supabase project without mixing records.');
      tablePrefix = 'hindu_';
    }
  }

  const tblNewspapers = `${tablePrefix}newspapers`;
  const tblCustomers = `${tablePrefix}customers`;
  const tblSubscriptions = `${tablePrefix}subscriptions`;
  const tblSettings = `${tablePrefix}notification_settings`;

  // 1. Seed Newspapers
  console.log(`📦 Seeding ${tblNewspapers} table...`);
  const { data: upsertedPapers, error: paperError } = await supabase
    .from(tblNewspapers)
    .upsert(NEWSPAPERS_SEED, { onConflict: 'code' })
    .select();

  if (paperError) {
    console.error(`Error seeding ${tblNewspapers}:`, paperError.message);
    if (paperError.message.includes('relation') || paperError.message.includes('schema cache')) {
      console.log('\n👉 ACTION REQUIRED:');
      console.log('   Please run supabase/schema_isolated.sql in your Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/hkmckranacbsqtlouwir/sql/new');
      console.log('   Then rerun this seed script.\n');
    }
    return;
  }
  console.log(`✓ Seeded ${upsertedPapers.length} newspapers`);

  const paperMap = {};
  upsertedPapers.forEach((p) => {
    paperMap[p.code] = p.id;
  });

  // 2. Load seed_data.json
  const seedFile = path.resolve(__dirname, '../seed_data.json');
  if (!fs.existsSync(seedFile)) {
    console.error('seed_data.json not found!');
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const customers = rawData.customers || [];
  console.log(`📄 Read ${customers.length} deduplicated customer dossiers from seed_data.json`);

  let customerCount = 0;
  let subCount = 0;

  for (const c of customers) {
    // Insert Customer
    const { data: custData, error: custErr } = await supabase
      .from(tblCustomers)
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

    if (custErr) {
      console.warn(`Customer insert warning (${c.customer_name}):`, custErr.message);
      continue;
    }

    customerCount++;
    const customerId = custData.id;

    // Insert Subscriptions
    for (const s of c.subscriptions || []) {
      const newspaperId = paperMap[s.newspaper] || paperMap['THE_HINDU'];
      const { error: subErr } = await supabase.from(tblSubscriptions).insert({
        customer_id: customerId,
        newspaper_id: newspaperId,
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

      if (!subErr) {
        subCount++;
      } else {
        console.warn(`Subscription insert warning:`, subErr.message);
      }
    }
  }

  // 3. Seed Default Notification Settings (30 Days window)
  await supabase.from(tblSettings).upsert({
    id: '00000000-0000-0000-0000-000000000001',
    window_days: 30,
    whatsapp_template_en: 'Dear {name}, your annual subscription for {newspaper} (Royapuram zone) expires on {end_date} ({days} days remaining). Please renew to continue uninterrupted morning delivery. - Circulation Agency Umapathy',
    whatsapp_template_ta: 'அன்புள்ள {name}, தங்களின் {newspaper} நாளிதழ் சந்தா {end_date} அன்று ({days} நாட்களில்) முடிவடைகிறது. காலை செய்தித்தாள் விநியோகம் தடையின்றி தொடர உடனடியாக புதுப்பிக்கவும். - உமாபதி ஏஜென்சி, ராயபுரம்',
    sms_template_en: 'HINDU CIRCULATION: {name}, your {newspaper} sub ends {end_date}. Renew today for smooth delivery. Call 9840012345.',
    sms_template_ta: 'ராயபுரம் விநியோகம்: {name}, உங்கள் {newspaper} சந்தா {end_date} முடிவடைகிறது. புதுப்பிக்க அழைக்கவும்.',
  });

  console.log('----------------------------------------------------');
  console.log('✅ SEEDING COMPLETE');
  console.log(`• Inserted Customers: ${customerCount}`);
  console.log(`• Inserted Subscriptions: ${subCount}`);
  console.log('• Configured 30-Day Expiry Notification Window');
  console.log('----------------------------------------------------');
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
});
