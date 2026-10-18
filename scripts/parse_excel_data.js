const xlsx = require('xlsx');
const fs = require('fs');

function parseDateVal(val) {
  if (val === undefined || val === null) return { date: null, raw: val };
  const str = String(val).trim();
  if (!str || str === '-' || str === '—') return { date: null, raw: str };
  if (str.toUpperCase().includes('FREE COPY')) return { date: null, raw: str, isFree: true };
  if (str.toUpperCase().includes('OFFICE STAFF') || str.toUpperCase().includes('STAFF')) return { date: null, raw: str, isStaff: true };

  // Excel serial number (like 46266, 46630)
  if (/^\d{5}$/.test(str)) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + Number(str) * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, raw: str };
  }

  // d/m/y format
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    d = d.padStart(2, '0');
    m = m.padStart(2, '0');
    if (y.length === 2) {
      y = '20' + y;
    } else if (y.length === 3) {
      // e.g. "202" -> "2026" or "2027"
      y = '2026';
    } else if (y.length === 4) {
      // Check year sanity e.g. 2020 when start is 2026
    }
    return { date: `${y}-${m}-${d}`, raw: str };
  }

  return { date: null, raw: str };
}

function extractEmail(text) {
  if (!text) return { cleanText: '', email: '' };
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const email = emailMatch[1].trim();
    const cleanText = text.replace(emailMatch[0], '').trim().replace(/,\s*$/, '');
    return { cleanText, email };
  }
  return { cleanText: text.trim(), email: '' };
}

console.log('--- THE HINDU ---');
const wbH = xlsx.readFile('THE_Hindu_Final_Customer_Details.xlsx');
const rowsH = xlsx.utils.sheet_to_json(wbH.Sheets[wbH.SheetNames[0]]);
console.log('Count:', rowsH.length);
rowsH.forEach((r, idx) => {
  const s = parseDateVal(r['Start Date']);
  const e = parseDateVal(r['End Date']);
  const { cleanText, email } = extractEmail(r.Address);
  console.log(`${idx + 1}. [${r.Name}] Phone: ${r['Mobile Number']} | Start: ${s.date} (raw: ${s.raw}) | End: ${e.date} (raw: ${e.raw}) | Email: ${email}`);
});

console.log('\n--- NIE AND DIN ---');
const wbN = xlsx.readFile('NIE_and_DIN_Final_Customer_Details.xlsx');
const rowsN = xlsx.utils.sheet_to_json(wbN.Sheets[wbN.SheetNames[0]]);
console.log('Count:', rowsN.length);
rowsN.forEach((r, idx) => {
  const s = parseDateVal(r['Start Date']);
  const e = parseDateVal(r['End Date']);
  console.log(`${idx + 1}. [${r.Name}] Order: ${r['Order No']} | Phone: ${r['Mobile Number']} | Start: ${s.date} (raw: ${s.raw}) | End: ${e.date} (raw: ${e.raw})`);
});

console.log('\n--- DINAMALAR ---');
const wbD = xlsx.readFile('Dinamalar_Final_Customer_Details.xlsx');
const rowsD = xlsx.utils.sheet_to_json(wbD.Sheets[wbD.SheetNames[0]]);
console.log('Count:', rowsD.length);
rowsD.forEach((r, idx) => {
  const s = parseDateVal(r['Start Date']);
  const e = parseDateVal(r['End Date']);
  console.log(`${idx + 1}. [${r.Name}] Order: ${r['Order No']} | Phone: ${r['Mobile Number']} | Start: ${s.date} (raw: ${s.raw}) | End: ${e.date} (raw: ${e.raw})`);
});
