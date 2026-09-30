import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatCount,
  formatPercent,
  formatMetricValue,
  formatDate,
  formatMonthYear,
} from '../i18n/uz';
import {
  getPeriodRange,
  isFactDateEditable,
  getMonthWeekBucket,
  SYSTEM_START_DATE,
} from '../utils/dates';
import { getSSPStatus } from '../utils/status';

describe('Uzbek Formatting Utilities', () => {
  it('formats money with spaces and so\'m suffix', () => {
    expect(formatMoney(1234567)).toBe("1 234 567 so'm");
    expect(formatMoney(0)).toBe("0 so'm");
    expect(formatMoney(null)).toBe('—');
  });

  it('formats counts with space thousands separators', () => {
    expect(formatCount(1234)).toBe('1 234');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(null)).toBe('—');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(0.954)).toBe('95.4%');
    expect(formatPercent(95.4)).toBe('95.4%');
    expect(formatPercent(1.2)).toBe('120.0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats metric values according to unit', () => {
    expect(formatMetricValue(5000000, 'money')).toBe("5 000 000 so'm");
    expect(formatMetricValue(125, 'count')).toBe('125');
    expect(formatMetricValue(0.92, 'percent')).toBe('92.0%');
  });

  it('formats dates as DD.MM.YYYY', () => {
    expect(formatDate('2026-09-15')).toBe('15.09.2026');
    expect(formatDate(null)).toBe('—');
  });

  it('formats month and year in Uzbek Latin', () => {
    expect(formatMonthYear('2026-09-01')).toBe('Sentabr 2026');
    expect(formatMonthYear('2026-10-15')).toBe('Oktyabr 2026');
  });
});

describe('Date & Period Calculations', () => {
  it('enforces SYSTEM_START_DATE (2026-09-01)', () => {
    const range = getPeriodRange('custom', '2026-08-01', '2026-09-15');
    expect(range.from).toBe(SYSTEM_START_DATE);
    expect(range.to).toBe('2026-09-15');
  });

  it('correctly identifies month-week buckets (1-7, 8-14, 15-21, 22-end)', () => {
    expect(getMonthWeekBucket(1)).toBe('w1');
    expect(getMonthWeekBucket(7)).toBe('w1');
    expect(getMonthWeekBucket(8)).toBe('w2');
    expect(getMonthWeekBucket(14)).toBe('w2');
    expect(getMonthWeekBucket(15)).toBe('w3');
    expect(getMonthWeekBucket(21)).toBe('w3');
    expect(getMonthWeekBucket(22)).toBe('w4');
    expect(getMonthWeekBucket(31)).toBe('w4');
  });

  it('validates fact date editability based on fact_edit_days', () => {
    // Owner can edit any date
    expect(isFactDateEditable('2026-09-01', 1, true)).toBe(true);
  });
});

describe('Status Calculations', () => {
  it('correctly maps fulfillment % to red, amber, green based on evaluation settings', () => {
    const thresholds = { min_bonus_level: 0.90, excellent_level: 1.00, cap_level: 1.20 };

    expect(getSSPStatus(0.85, thresholds)).toBe('red');
    expect(getSSPStatus(0.899, thresholds)).toBe('red');
    expect(getSSPStatus(0.90, thresholds)).toBe('amber');
    expect(getSSPStatus(0.95, thresholds)).toBe('amber');
    expect(getSSPStatus(0.999, thresholds)).toBe('amber');
    expect(getSSPStatus(1.00, thresholds)).toBe('green');
    expect(getSSPStatus(1.15, thresholds)).toBe('green');
  });
});
