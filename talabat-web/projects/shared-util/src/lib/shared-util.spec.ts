import { formatDateTime } from './date-time-format';
import { MoneyPipe } from './money.pipe';

describe('shared display utilities', () => {
  it('formats a monetary value without inventing a missing currency', () => {
    expect(new MoneyPipe().transform({ amount: 42.5 })).toBe('42.5');
    expect(new MoneyPipe().transform({ amount: 42.5, currency: 'EGP' })).toContain('42.50');
  });

  it('uses a safe placeholder for invalid date-time values', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });
});
