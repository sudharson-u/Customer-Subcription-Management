const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function cleanText(t) {
  if (!t) return '';
  return String(t).replace(/\s+/g, ' ').trim();
}

function sanitizePhone(p) {
  if (!p) return '';
  let str = String(p).trim();
  // If multiple phones separated by /, take the 10-digit mobile if present
  if (str.includes('/')) {
    const parts = str.split('/');
    const p1 = parts[0].replace(/\D/g, '');
    const p2 = parts[1].replace(/\D/g, '');
    if (p2.length === 10) return p2;
    if (p1.length === 10) return p1;
    return p2 || p1;
  }
  let cleaned = str.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

function extractEmail(text) {
  if (!text) return { cleanAddress: '', email: '' };
  const str = String(text);
  const emailMatch = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    const email = emailMatch[1].trim();
    const cleanAddress = str.replace(emailMatch[0], '').replace(/\s+,/, ',').replace(/,\s*$/, '').trim();
    return { cleanAddress, email };
  }
  return { cleanAddress: str.trim(), email: '' };
}

function extractPincode(addr) {
  if (!addr) return '600013';
  const m = addr.match(/600\s*0(\d{2})/i) || addr.match(/chennai\s*[-–—]?\s*(\d{1,2})/i) || addr.match(/ch\s*[-–—]?\s*(\d{1,2})/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return `6000${String(num).padStart(2, '0')}`;
  }
  return '600013';
}

function extractArea(addr) {
  if (!addr) return 'Royapuram';
  const lower = addr.toLowerCase();
  if (lower.includes('new washerm') || lower.includes('t.h road') || lower.includes('chennai-81') || lower.includes('chennai 81')) {
    return 'New Washermanpet';
  }
  if (lower.includes('old washerm') || lower.includes('g.a road') || lower.includes('chennai-21')) {
    return 'Old Washermanpet';
  }
  return 'Royapuram';
}

function parseDateSmart(val, fallbackYear = 2026) {
  if (val === undefined || val === null) return { date: null, isStaff: false, isFree: false };
  const str = String(val).trim();
  if (!str || str === '-' || str === '—') return { date: null, isStaff: false, isFree: false };
  if (str.toUpperCase().includes('STAFF')) return { date: null, isStaff: true, isFree: false };
  if (str.toUpperCase().includes('FREE')) return { date: null, isStaff: false, isFree: true };

  // Excel serial number
  if (/^\d{5}$/.test(str)) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + Number(str) * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, isStaff: false, isFree: false };
  }

  // d/m/y
  const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    if (year.length === 3) year = `202${year.slice(-1)}`; // e.g. 202 -> 2026
    return { date: `${year}-${month}-${day}`, isStaff: false, isFree: false };
  }

  // Month name e.g. "June 2026"
  const mVague = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\']+(\d{2,4})/i);
  if (mVague) {
    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const month = monthMap[mVague[1].toLowerCase().slice(0, 3)];
    let y = mVague[2];
    if (y.length === 2) y = `20${y}`;
    return { date: `${y}-${month}-01`, isStaff: false, isFree: false };
  }

  return { date: null, isStaff: false, isFree: false };
}

function calculateOneYearMinusOneDay(startIso) {
  if (!startIso) return null;
  const [y, m, d] = startIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const target = new Date(y + 1, m - 1, d);
  target.setDate(target.getDate() - 1);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 1. DINAKARAN RECORDS (5 records)
const dinakaranRaw = [
  {
    raw_s_no: 1,
    newspaper: 'DINAKARAN',
    name: 'Mohammed Jaffer',
    address: '17/2, Kumaravelu Street, Royapuram, Chennai-13',
    mobile: '9003103868',
    order_no: '',
    start_date: '2025-05-21',
    end_date: '2026-05-20',
    customer_type: 'Regular',
    status: 'Active',
  },
  {
    raw_s_no: 2,
    newspaper: 'DINAKARAN',
    name: 'Abdul Wajj Basha',
    address: '108/109, S.N Complex, 1st Floor, M.S Koil Street, Royapuram, Chennai-13',
    mobile: '8428402963',
    order_no: '',
    start_date: '2026-09-20',
    end_date: '2027-09-19',
    customer_type: 'Regular',
    status: 'Active',
  },
  {
    raw_s_no: 3,
    newspaper: 'DINAKARAN',
    name: 'Umapathy',
    address: 'Old No:3/2, New No:9, 2nd Floor, Veerasamy Lane, Royapuram, Chennai-13',
    mobile: '9094013926',
    order_no: '',
    start_date: '2025-11-06',
    end_date: '2026-11-05',
    customer_type: 'Regular',
    status: 'Active',
  },
  {
    raw_s_no: 4,
    newspaper: 'DINAKARAN',
    name: 'Baskaran',
    address: '25, Adam Sahib Street, Royapuram, Chennai-13',
    mobile: '9500096060',
    order_no: '',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    customer_type: 'Regular',
    status: 'Active',
  },
  {
    raw_s_no: 5,
    newspaper: 'DINAKARAN',
    name: 'Abdul Rahman',
    address: '3, M.S. Koil Street, Royapuram, Chennai-13',
    mobile: '8754917984',
    order_no: '',
    start_date: '2026-06-01',
    end_date: '2027-05-31',
    customer_type: 'Regular',
    status: 'Active',
    needs_review: true,
    review_reason: "Vague month date: 'June 2026' defaulted to 01/06/2026",
  },
];

// 2. THE HINDU RECORDS (35 records)
const wbH = xlsx.readFile('THE_Hindu_Final_Customer_Details.xlsx');
const rowsH = xlsx.utils.sheet_to_json(wbH.Sheets[wbH.SheetNames[0]]);
const theHinduRaw = rowsH.map((r, idx) => {
  const { cleanAddress, email } = extractEmail(r.Address);
  const s = parseDateSmart(r['Start Date']);
  const e = parseDateSmart(r['End Date']);

  let startDate = s.date;
  let endDate = e.date;
  let status = 'Active';
  let customerType = 'Regular';
  let isCalc = false;
  let needsReview = false;
  let reviewReason = '';

  const nameUpper = String(r.Name).toUpperCase();
  if (s.isStaff || e.isStaff || nameUpper.includes('OFFICE STAFF')) {
    status = 'Staff';
    customerType = 'Staff';
    startDate = null;
    endDate = null;
  } else if (s.isFree || e.isFree || nameUpper.includes('FREE COPY')) {
    status = 'Free';
    customerType = 'Free Copy';
    startDate = null;
    endDate = null;
  } else {
    // If end date is missing or invalid or in past while start date is future (typos like 2020)
    if (!endDate || (startDate && endDate <= startDate)) {
      endDate = calculateOneYearMinusOneDay(startDate);
      isCalc = true;
      needsReview = true;
      reviewReason = `End date auto-corrected to 1 year minus 1 day (${endDate}) from raw '${e.date || r['End Date']}'`;
    }
    // Also if end date is 3+ years ahead like 2028 or 2029 for standard 1 year sub
    if (startDate && endDate) {
      const startYear = parseInt(startDate.slice(0, 4), 10);
      const endYear = parseInt(endDate.slice(0, 4), 10);
      if (endYear - startYear > 1) {
        endDate = calculateOneYearMinusOneDay(startDate);
        isCalc = true;
        needsReview = true;
        reviewReason = `Multi-year end date auto-aligned to 1 year subscription (${endDate}) from raw '${r['End Date']}'`;
      }
    }
  }

  // Clean customer name from "(Office Staff)" suffix
  let cleanName = cleanText(r.Name);
  cleanName = cleanName.replace(/\(Office Staff\)/i, '').trim();

  return {
    raw_s_no: idx + 1,
    newspaper: 'THE_HINDU',
    name: cleanName,
    address: cleanAddress,
    email: email,
    mobile: sanitizePhone(r['Mobile Number']),
    order_no: '',
    start_date: startDate,
    end_date: endDate,
    status,
    customer_type: customerType,
    is_end_date_calculated: isCalc,
    needs_review: needsReview,
    review_reason: reviewReason,
  };
});

// 3. NIE AND DIN RECORDS (18 records)
const wbN = xlsx.readFile('NIE_and_DIN_Final_Customer_Details.xlsx');
const rowsN = xlsx.utils.sheet_to_json(wbN.Sheets[wbN.SheetNames[0]]);
const nieDinRaw = rowsN.map((r, idx) => {
  const { cleanAddress, email } = extractEmail(r.Address);
  const s = parseDateSmart(r['Start Date']);
  const e = parseDateSmart(r['End Date']);

  let startDate = s.date;
  let endDate = e.date;
  let status = 'Active';
  let customerType = 'Regular';
  let isCalc = false;
  let needsReview = false;
  let reviewReason = '';

  const nameUpper = String(r.Name).toUpperCase();
  const orderUpper = String(r['Order No'] || '').toUpperCase();
  if (s.isStaff || e.isStaff || nameUpper.includes('OFFICE STAFF')) {
    status = 'Staff';
    customerType = 'Staff';
    startDate = null;
    endDate = null;
  } else if (s.isFree || e.isFree || String(r['End Date']).toUpperCase().includes('FREE COPY')) {
    status = 'Free';
    customerType = 'Free Copy';
    startDate = null;
    endDate = null;
  } else {
    if (!endDate || (startDate && endDate <= startDate)) {
      endDate = calculateOneYearMinusOneDay(startDate);
      isCalc = true;
      needsReview = true;
      reviewReason = `End date auto-aligned to 1 year (${endDate}) from raw '${r['End Date']}'`;
    }
  }

  let orderNo = cleanText(r['Order No']);
  if (orderNo === '-' || orderNo === '—') orderNo = '';

  return {
    raw_s_no: idx + 1,
    newspaper: 'NIE_DIN',
    name: cleanText(r.Name),
    address: cleanAddress === '-' ? 'Royapuram, Chennai-13' : cleanAddress,
    email: email,
    mobile: sanitizePhone(r['Mobile Number']),
    order_no: orderNo,
    start_date: startDate,
    end_date: endDate,
    status,
    customer_type: customerType,
    is_end_date_calculated: isCalc,
    needs_review: needsReview,
    review_reason: reviewReason,
  };
});

// 4. DINAMALAR RECORDS (21 records)
const wbD = xlsx.readFile('Dinamalar_Final_Customer_Details.xlsx');
const rowsD = xlsx.utils.sheet_to_json(wbD.Sheets[wbD.SheetNames[0]]);
const dinamalarRaw = rowsD.map((r, idx) => {
  const { cleanAddress, email } = extractEmail(r.Address);
  const s = parseDateSmart(r['Start Date']);
  const e = parseDateSmart(r['End Date']);

  let startDate = s.date;
  let endDate = e.date;
  let status = 'Active';
  let customerType = 'Regular';
  let isCalc = false;
  let needsReview = false;
  let reviewReason = '';

  const nameUpper = String(r.Name).toUpperCase();
  if (s.isStaff || e.isStaff || String(r['Start Date']).toUpperCase().includes('OFFICE STAFF')) {
    status = 'Staff';
    customerType = 'Staff';
    startDate = null;
    endDate = null;
  } else if (s.isFree || e.isFree) {
    status = 'Free';
    customerType = 'Free Copy';
    startDate = null;
    endDate = null;
  } else {
    if (!endDate || (startDate && endDate <= startDate)) {
      endDate = calculateOneYearMinusOneDay(startDate);
      isCalc = true;
      needsReview = true;
      reviewReason = `End date auto-corrected to 1 year (${endDate}) from raw '${r['End Date']}'`;
    }
  }

  let orderNo = cleanText(r['Order No']);
  if (orderNo === '-' || orderNo === '—') orderNo = '';

  return {
    raw_s_no: idx + 1,
    newspaper: 'DINAMALAR',
    name: cleanText(r.Name),
    address: cleanAddress,
    email: email,
    mobile: sanitizePhone(r['Mobile Number']),
    order_no: orderNo,
    start_date: startDate,
    end_date: endDate,
    status,
    customer_type: customerType,
    is_end_date_calculated: isCalc,
    needs_review: needsReview,
    review_reason: reviewReason,
  };
});

console.log(`Summary:`);
console.log(`- Dinakaran: ${dinakaranRaw.length}`);
console.log(`- The Hindu: ${theHinduRaw.length}`);
console.log(`- NIE & DIN: ${nieDinRaw.length}`);
console.log(`- Dinamalar: ${dinamalarRaw.length}`);
console.log(`Total subscriptions: ${dinakaranRaw.length + theHinduRaw.length + nieDinRaw.length + dinamalarRaw.length}`);

// Now merge multi-newspaper customer records into customer profiles with subscriptions
const allRecords = [...dinakaranRaw, ...theHinduRaw, ...nieDinRaw, ...dinamalarRaw];

function normalizeCustomerName(name) {
  if (!name) return '';
  return cleanText(name).toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/y$/, 'i');
}

function isSameCustomer(c1, c2) {
  const p1 = sanitizePhone(c1.mobile_number || c1.mobile || '');
  const p2 = sanitizePhone(c2.mobile_number || c2.mobile || '');

  // If both have 10-digit phone and phones differ, definitely not same customer
  if (p1.length === 10 && p2.length === 10 && p1 !== p2) {
    return false;
  }

  // If phone matches, names must genuinely match (not different customers sharing phone)
  const n1 = normalizeCustomerName(c1.customer_name || c1.name || '');
  const n2 = normalizeCustomerName(c2.customer_name || c2.name || '');

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    if (shorter === 'ravi' && (n1.includes('ravindran') || n2.includes('ravindran'))) return false;
    if (shorter === 'siva' && (n1.includes('sivakumar') || n2.includes('sivakumar'))) return false;
    if (shorter.length >= 5) return true;
  }
  return false;
}

const customerList = [];

for (const rec of allRecords) {
  let existingCust = customerList.find(c => isSameCustomer(c, rec));

  if (!existingCust) {
    existingCust = {
      customer_name: rec.name,
      mobile_number: sanitizePhone(rec.mobile),
      email: rec.email || '',
      address: rec.address || '',
      street_area: extractArea(rec.address),
      pincode: extractPincode(rec.address),
      customer_type: rec.customer_type,
      notes: '',
      subscriptions: [],
    };
    customerList.push(existingCust);
  }

  // Enhance customer details if missing
  if (!existingCust.email && rec.email) existingCust.email = rec.email;
  if ((!existingCust.address || existingCust.address === 'Royapuram, Chennai-13') && rec.address && rec.address !== '-') {
    existingCust.address = rec.address;
    existingCust.street_area = extractArea(rec.address);
    existingCust.pincode = extractPincode(rec.address);
  }
  if (!existingCust.mobile_number && rec.mobile) existingCust.mobile_number = sanitizePhone(rec.mobile);
  if (rec.customer_type === 'Staff') existingCust.customer_type = 'Staff';

  existingCust.subscriptions.push({
    newspaper: rec.newspaper,
    order_no: rec.order_no || '',
    start_date: rec.start_date,
    end_date: rec.end_date,
    is_end_date_calculated: rec.is_end_date_calculated || false,
    status: rec.status,
    needs_review: rec.needs_review || false,
    review_reason: rec.review_reason || '',
    remarks: '',
    raw_s_no: rec.raw_s_no,
  });
}

// Assign customer codes
customerList.forEach((c, idx) => {
  c.customer_code = `HIN-${String(idx + 1).padStart(4, '0')}`;
});

// Build review queue items
const reviewQueue = [];
customerList.forEach((c) => {
  c.subscriptions.forEach((s) => {
    if (s.needs_review) {
      reviewQueue.push({
        id: `rq-${reviewQueue.length + 1}`,
        customer_name: c.customer_name,
        newspaper: s.newspaper,
        order_no: s.order_no,
        issue_type: 'DATE_AMBIGUITY',
        description: s.review_reason,
        raw_data: {
          start_date: s.start_date,
          end_date: s.end_date,
        },
        status: 'pending',
      });
    }
  });
});

const finalSeed = {
  generated_at: new Date().toISOString(),
  summary: {
    total_customers: customerList.length,
    total_subscriptions: allRecords.length,
    multi_paper_customers: customerList.filter(c => c.subscriptions.length > 1).length,
    review_queue_count: reviewQueue.length,
    dinakaran_count: dinakaranRaw.length,
    dinamalar_count: dinamalarRaw.length,
    nie_din_count: nieDinRaw.length,
    the_hindu_count: theHinduRaw.length,
  },
  customers: customerList,
  review_queue: reviewQueue,
};

fs.writeFileSync('seed_data.json', JSON.stringify(finalSeed, null, 2));
console.log(`\n Successfully generated seed_data.json!`);
console.log(`- Unique Customers: ${customerList.length}`);
console.log(`- Total Subscriptions: ${allRecords.length}`);
console.log(`- Multi-paper Customers: ${finalSeed.summary.multi_paper_customers}`);
console.log(`- Review Queue Items: ${reviewQueue.length}`);
