import { describe, it, expect } from 'vitest';
import {
  calculateEndDate,
  calculateDaysRemaining,
  getUrgencyTier,
  sanitizePhone,
  generateWhatsAppReminder,
  generateSmsReminder,
  formatDate,
  formatOrderId,
  isSameCustomerIdentity,
} from '../utils';

describe('Date & Validity Calculations (1-Month / 30-Day Window)', () => {
  it('calculates 1-year minus 1-day subscription end date correctly', () => {
    // 21/05/2025 to 20/05/2026
    const end = calculateEndDate('2025-05-21', 12);
    expect(end).toBe('2026-05-20');
  });

  it('handles leap year edge cases safely', () => {
    // Leap year start: 29 Feb 2024 -> Next year 28 Feb 2025
    const end = calculateEndDate('2024-02-29', 12);
    expect(end).toBe('2025-02-28');
  });

  it('calculates days remaining accurately', () => {
    const today = new Date('2026-05-01T00:00:00Z');

    // 19 days remaining
    expect(calculateDaysRemaining('2026-05-20', today)).toBe(19);

    // Exactly today (0 days)
    expect(calculateDaysRemaining('2026-05-01', today)).toBe(0);

    // Expired 5 days ago
    expect(calculateDaysRemaining('2026-04-26', today)).toBe(-5);

    // Null end date (continuous / open)
    expect(calculateDaysRemaining(null, today)).toBeNull();
  });

  it('categorizes urgency tiers based on the strict 30-day window', () => {
    // > 14 days and <= 30 days -> Info
    expect(getUrgencyTier(30)).toBe('info');
    expect(getUrgencyTier(20)).toBe('info');
    expect(getUrgencyTier(15)).toBe('info');

    // 7 to 14 days -> Warning
    expect(getUrgencyTier(14)).toBe('warning');
    expect(getUrgencyTier(7)).toBe('warning');

    // <= 6 days -> Urgent
    expect(getUrgencyTier(6)).toBe('urgent');
    expect(getUrgencyTier(1)).toBe('urgent');
    expect(getUrgencyTier(0)).toBe('urgent');

    // < 0 days (Expired) -> Critical
    expect(getUrgencyTier(-1)).toBe('critical');
    expect(getUrgencyTier(-10)).toBe('critical');
  });
});

describe('Sanitization & Formatter Helpers', () => {
  it('sanitizes Indian mobile numbers', () => {
    expect(sanitizePhone('+91 98400 12345')).toBe('9840012345');
    expect(sanitizePhone('91-9840012345')).toBe('9840012345');
    expect(sanitizePhone('09840012345')).toBe('9840012345');
    expect(sanitizePhone('98400 12345')).toBe('9840012345');
    expect(sanitizePhone('')).toBe('');
  });

  it('formats order IDs cleanly', () => {
    expect(formatOrderId('1343631')).toBe('1343631');
    expect(formatOrderId('')).toBe('—');
    expect(formatOrderId(undefined)).toBe('—');
  });

  it('formats dates into dd/MM/yyyy UI format', () => {
    expect(formatDate('2026-05-20')).toBe('20/05/2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('Reminder Message Generators', () => {
  it('generates polite bilingual WhatsApp reminder', () => {
    const msg = generateWhatsAppReminder({
      customerName: 'Mohammed Jaffer',
      newspaper: 'The Hindu',
      endDate: '20/05/2026',
      daysRemaining: 15,
    });

    expect(msg).toContain('Mohammed Jaffer');
    expect(msg).toContain('The Hindu');
    expect(msg).toContain('20/05/2026');
    expect(msg).toContain('15 days');
    expect(msg).toContain('Umapathy');
  });

  it('generates concise SMS reminder', () => {
    const sms = generateSmsReminder({
      customerName: 'Abdul Wajj Basha',
      newspaper: 'Dinakaran',
      endDate: '19/09/2026',
      daysRemaining: 3,
    });

    expect(sms).toContain('Abdul Wajj Basha');
    expect(sms).toContain('Dinakaran');
    expect(sms).toContain('19/09/2026');
  });
});

describe('Customer Identity Separation on Shared Mobile', () => {
  it('differentiates distinct people sharing the same mobile number (e.g. Mohammed Jaffer, Tulsi, Pachaiappan)', () => {
    const jaffer = { customer_name: 'Mohammed Jaffer', mobile_number: '9003103868' };
    const tulsi = { customer_name: 'Tulsi', mobile_number: '9003103868' };
    const pachaiappan = { customer_name: 'Pachaiappan', mobile_number: '9003103868' };

    expect(isSameCustomerIdentity(jaffer, tulsi)).toBe(false);
    expect(isSameCustomerIdentity(jaffer, pachaiappan)).toBe(false);
    expect(isSameCustomerIdentity(tulsi, pachaiappan)).toBe(false);
  });

  it('matches same individual across publications with name variations', () => {
    expect(
      isSameCustomerIdentity(
        { customer_name: 'Velpandian.S', mobile_number: '9551296219' },
        { customer_name: 'Velpandian', mobile_number: '9551296219' }
      )
    ).toBe(true);

    expect(
      isSameCustomerIdentity(
        { customer_name: 'Baskaran. A', mobile_number: '9500096060' },
        { customer_name: 'Baskaran', mobile_number: '9500096060' }
      )
    ).toBe(true);

    expect(
      isSameCustomerIdentity(
        { customer_name: 'Sarumathi', mobile_number: '9790892770' },
        { customer_name: 'Sarumathy', mobile_number: '9790892770' }
      )
    ).toBe(true);
  });
});

