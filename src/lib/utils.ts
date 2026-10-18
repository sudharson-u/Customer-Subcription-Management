import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  parseISO,
  isBefore,
  differenceInDays,
  differenceInCalendarDays,
  isValid,
  subDays,
  addMonths,
} from 'date-fns';
import { Newspaper, NewspaperCode, SubscriptionStatus, UrgencyTier } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 4 Configured Publications array
 */
export const NEWSPAPERS: Newspaper[] = [
  {
    id: 'paper-dinakaran',
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
    id: 'paper-dinamalar',
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
    id: 'paper-niedin',
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
    id: 'paper-thehindu',
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

/**
 * Publication registry metadata with styling
 */
export const NEWSPAPERS_META: Record<NewspaperCode, {
  code: NewspaperCode;
  name: string;
  short: string;
  shortName: string;
  chipClass: string;
  badgeClass: string;
  color: string;
  borderClass: string;
}> = {
  DINAKARAN: {
    code: 'DINAKARAN',
    name: 'Dinakaran',
    short: 'DK',
    shortName: 'DIN',
    chipClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60',
    color: '#E11D48',
    borderClass: 'border-rose-500',
  },
  DINAMALAR: {
    code: 'DINAMALAR',
    name: 'Dinamalar',
    short: 'DM',
    shortName: 'DMR',
    chipClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900/60',
    color: '#0D9488',
    borderClass: 'border-teal-500',
  },
  NIE_DIN: {
    code: 'NIE_DIN',
    name: 'NIE / DIN',
    short: 'ND',
    shortName: 'NIE',
    chipClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60',
    color: '#3B82F6',
    borderClass: 'border-blue-500',
  },
  THE_HINDU: {
    code: 'THE_HINDU',
    name: 'The Hindu',
    short: 'TH',
    shortName: 'HIN',
    chipClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60',
    color: '#7C3AED',
    borderClass: 'border-purple-500',
  },
};

/**
 * Calculate subscription end date: start + duration months - 1 day
 * Standard 1-year circulation cycle
 */
export function calculateEndDate(startDate: string | Date | null | undefined, durationMonths: number = 12): string | null {
  if (!startDate) return null;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  if (!isValid(start)) return null;

  // If leap day Feb 29 and duration is a multiple of 12 months, end date should be Feb 28 of target year
  if (start.getMonth() === 1 && start.getDate() === 29 && durationMonths % 12 === 0) {
    const targetYear = start.getFullYear() + durationMonths / 12;
    return `${targetYear}-02-28`;
  }

  const targetDate = addMonths(start, durationMonths);
  const end = subDays(targetDate, 1);
  return format(end, 'yyyy-MM-dd');
}

/**
 * Calculate notification trigger date = end_date - window_days (default 30 days / 1 month)
 */
export function calculateNotificationDate(endDate: Date | string, windowDays: number = 30): Date {
  const date = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return subDays(date, windowDays);
}

/**
 * Calculate subscription status based on current date
 */
export function calculateStatus(
  endDate?: Date | string | null,
  currentStatus?: SubscriptionStatus,
  today: Date = new Date(),
  windowDays: number = 30
): SubscriptionStatus {
  if (
    currentStatus === 'Staff' ||
    currentStatus === 'Free' ||
    currentStatus === 'Dropped' ||
    currentStatus === 'Renewed'
  ) {
    return currentStatus;
  }
  if (!endDate) return 'Active';

  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  if (!isValid(end)) return 'Active';

  const diffDays = differenceInCalendarDays(end, today);

  if (diffDays < 0) {
    return 'Expired';
  }
  if (diffDays <= windowDays) {
    return 'Expiring';
  }
  return 'Active';
}

export function calculateDaysRemaining(endDate?: Date | string | null, today: Date = new Date()): number | null {
  if (!endDate) return null;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  if (!isValid(end)) return null;
  return differenceInCalendarDays(end, today);
}

export const getDaysRemaining = calculateDaysRemaining;

export function getUrgencyTier(daysRemaining: number | null): UrgencyTier {
  if (daysRemaining === null) return 'info';
  if (daysRemaining < 0) return 'critical';
  if (daysRemaining <= 6) return 'urgent';
  if (daysRemaining <= 14) return 'warning';
  return 'info';
}

/**
 * Format date in standard Indian circulation format dd/MM/yyyy
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

export function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const iso = parseISO(str);
  if (isValid(iso)) return format(iso, 'yyyy-MM-dd');
  return null;
}

export function sanitizePhone(phone?: unknown): string {
  if (!phone) return '';
  let str = String(phone).replace(/\D/g, '');
  if (str.startsWith('91') && str.length === 12) {
    str = str.slice(2);
  }
  if (str.startsWith('0') && str.length === 11) {
    str = str.slice(1);
  }
  return str;
}

export function formatOrderId(orderId?: string | null): string {
  if (!orderId || !orderId.trim()) return '—';
  return orderId.replace(/[_\s]+/g, '').trim();
}

export function getStatusBadgeStyle(status: SubscriptionStatus): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    case 'Expiring':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'Expired':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    case 'Staff':
    case 'Free':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    case 'Dropped':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export const getStatusBadgeClass = getStatusBadgeStyle;

export function getUrgencyBadgeStyle(tier: UrgencyTier): string {
  switch (tier) {
    case 'critical':
      return 'bg-rose-600 text-white animate-pulse';
    case 'urgent':
      return 'bg-orange-500 text-white';
    case 'warning':
      return 'bg-amber-500 text-white';
    case 'info':
    default:
      return 'bg-purple-600 text-white';
  }
}

export function generateWhatsAppReminder(params: {
  customerName: string;
  newspaper: string;
  endDate: string;
  daysRemaining: number;
}): string {
  const { customerName, newspaper, endDate, daysRemaining } = params;
  return `Hello ${customerName}, your subscription for ${newspaper} is due for renewal on ${endDate} (${daysRemaining} days remaining). To ensure uninterrupted morning delivery in Royapuram, please contact Circulation Agency Umapathy. Thank you!`;
}

export function generateSmsReminder(params: {
  customerName: string;
  newspaper: string;
  endDate: string;
  daysRemaining: number;
}): string {
  const { customerName, newspaper, endDate, daysRemaining } = params;
  return `HINDU CIRCULATION: Dear ${customerName}, your ${newspaper} sub ends on ${endDate} (${daysRemaining}d left). Contact Umapathy to renew today.`;
}

/**
 * Generate prefilled WhatsApp and SMS message templates
 */
export function generateRenewalMessage(params: {
  customerName: string;
  newspaperName: string;
  endDateStr: string;
  lang: 'en' | 'ta';
  channel: 'whatsapp' | 'sms';
}): string {
  const { customerName, newspaperName, endDateStr, lang, channel } = params;
  if (lang === 'ta') {
    if (channel === 'whatsapp') {
      return `வணக்கம் ${customerName}, தங்களின் ${newspaperName} நாளிதழ் சந்தா ${endDateStr} அன்று முடிவடைகிறது. தடையின்றி தினசரி நாளிதழ் கிடைக்க உமாபதி (9094013926) அவர்களை தொடர்பு கொண்டு புதுப்பிக்கவும். நன்றி!`;
    }
    return `வணக்கம் ${customerName}, தங்களின் ${newspaperName} சந்தா ${endDateStr} முடிவடைகிறது. புதுப்பிக்க உமாபதி: 9094013926.`;
  }
  // English
  if (channel === 'whatsapp') {
    return `Hello ${customerName}, your subscription for ${newspaperName} is due for renewal on ${endDateStr}. To ensure uninterrupted morning delivery, please contact Umapathy at 9094013926. Thank you!`;
  }
  return `Hindu Portal: Dear ${customerName}, your ${newspaperName} renewal is due on ${endDateStr}. Call Umapathy at 9094013926.`;
}
