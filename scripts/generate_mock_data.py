import json

with open('seed_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

customers = data['customers']
review_queue = data['review_queue']

ts_content = """import { Customer, Newspaper, NewspaperCode, ReviewQueueItem } from './types';

export const MOCK_NEWSPAPERS: Newspaper[] = [
  {
    id: 'paper-dk',
    code: 'DINAKARAN',
    name: 'Dinakaran',
    short_name: 'DK',
    language: 'Tamil',
    accent_color: '#E11D48',
    badge_bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60',
    badge_text: 'text-rose-600',
    active: true,
    display_order: 1,
  },
  {
    id: 'paper-dm',
    code: 'DINAMALAR',
    name: 'Dinamalar',
    short_name: 'DM',
    language: 'Tamil',
    accent_color: '#0D9488',
    badge_bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900/60',
    badge_text: 'text-teal-600',
    active: true,
    display_order: 2,
  },
  {
    id: 'paper-nd',
    code: 'NIE_DIN',
    name: 'NIE / DIN',
    short_name: 'ND',
    language: 'English / Tamil',
    accent_color: '#3B82F6',
    badge_bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60',
    badge_text: 'text-blue-600',
    active: true,
    display_order: 3,
  },
  {
    id: 'paper-th',
    code: 'THE_HINDU',
    name: 'The Hindu',
    short_name: 'TH',
    language: 'English',
    accent_color: '#7C3AED',
    badge_bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60',
    badge_text: 'text-purple-600',
    active: true,
    display_order: 4,
  },
];
"""

mock_custs = []
for idx, c in enumerate(customers):
    cust_id = f'cust-{idx+1:03d}'
    subs = []
    for s_idx, s in enumerate(c['subscriptions']):
        sub_id = f'sub-{idx+1:03d}-{s_idx+1}'
        paper_code = s['newspaper']
        clean_code = paper_code.lower().replace('_', '')
        subs.append({
            'id': sub_id,
            'customer_id': cust_id,
            'newspaper_id': f'paper-{clean_code}',
            'newspaper': {
                'code': paper_code,
                'name': 'The Hindu' if paper_code == 'THE_HINDU' else ('Dinakaran' if paper_code == 'DINAKARAN' else ('Dinamalar' if paper_code == 'DINAMALAR' else 'NIE / DIN')),
            },
            'order_no': s.get('order_no', ''),
            'start_date': s.get('start_date'),
            'end_date': s.get('end_date'),
            'status': s.get('status', 'Active'),
            'is_current': True,
            'is_end_date_calculated': s.get('is_end_date_calculated', False),
            'needs_review': s.get('needs_review', False),
            'review_reason': s.get('review_reason', ''),
            'version': 1,
            'created_at': '2026-01-01T00:00:00.000Z',
            'updated_at': '2026-01-01T00:00:00.000Z',
        })
    mock_custs.append({
        'id': cust_id,
        'customer_code': c.get('customer_code', f'HIN-{idx+1:04d}'),
        'customer_name': c['customer_name'],
        'mobile_number': c.get('mobile_number', ''),
        'email': c.get('email', ''),
        'address': c.get('address', ''),
        'street_area': c.get('street_area', 'Royapuram'),
        'pincode': c.get('pincode', '600013'),
        'customer_type': c.get('customer_type', 'Regular'),
        'notes': '',
        'version': 1,
        'created_at': '2026-01-01T00:00:00.000Z',
        'updated_at': '2026-01-01T00:00:00.000Z',
        'subscriptions': subs
    })

ts_content += f'\nexport const INITIAL_MOCK_CUSTOMERS: Customer[] = {json.dumps(mock_custs, indent=2)};\n\n'
ts_content += f'export const INITIAL_REVIEW_QUEUE: ReviewQueueItem[] = {json.dumps(review_queue, indent=2)};\n\n'

ts_content += """
let inMemoryCustomers: Customer[] = JSON.parse(JSON.stringify(INITIAL_MOCK_CUSTOMERS));
let inMemoryReviewQueue: ReviewQueueItem[] = JSON.parse(JSON.stringify(INITIAL_REVIEW_QUEUE));

export function getMockCustomers(): Customer[] {
  return inMemoryCustomers.map(c => ({
    ...c,
    subscriptions: (c.subscriptions || []).map(s => {
      const pCode = (s.newspaper as any)?.code || (s as any).newspaper_code;
      const paper = MOCK_NEWSPAPERS.find(p => p.id === s.newspaper_id || p.code === pCode);
      return {
        ...s,
        newspaper: paper || MOCK_NEWSPAPERS[3],
      };
    })
  }));
}

export function saveMockCustomer(customer: Customer): Customer {
  const existingIdx = inMemoryCustomers.findIndex(c => c.id === customer.id);
  if (existingIdx >= 0) {
    inMemoryCustomers[existingIdx] = {
      ...customer,
      version: (inMemoryCustomers[existingIdx].version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    return inMemoryCustomers[existingIdx];
  } else {
    const newCust = {
      ...customer,
      id: customer.id || `cust-${Date.now()}`,
      customer_code: customer.customer_code || `HIN-${inMemoryCustomers.length + 1:04d}`,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryCustomers.unshift(newCust);
    return newCust;
  }
}

export function deleteMockCustomer(id: string): boolean {
  const existingIdx = inMemoryCustomers.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    inMemoryCustomers[existingIdx].deleted_at = new Date().toISOString();
    return true;
  }
  return false;
}

export function getMockReviewQueue(): ReviewQueueItem[] {
  return inMemoryReviewQueue;
}
"""

with open('src/lib/mockData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print('Generated src/lib/mockData.ts successfully!')
