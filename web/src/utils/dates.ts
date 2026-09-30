import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';

export const SYSTEM_START_DATE = '2026-09-01';

export type PeriodType =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/**
 * Returns today's date in Asia/Tashkent
 */
export function getTashkentToday(): Date {
  const now = new Date();
  const tashkentStr = now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
  return new Date(tashkentStr);
}

export function formatDateISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Computes date range for a given period preset in Asia/Tashkent (Monday start of week).
 * Ensures no dates before 2026-09-01.
 */
export function getPeriodRange(period: PeriodType, customFrom?: string, customTo?: string): DateRange {
  const today = getTashkentToday();
  let fromDate = today;
  let toDate = today;

  switch (period) {
    case 'today':
      fromDate = today;
      toDate = today;
      break;

    case 'yesterday': {
      const yest = subDays(today, 1);
      fromDate = yest;
      toDate = yest;
      break;
    }

    case 'this_week':
      // Monday start
      fromDate = startOfWeek(today, { weekStartsOn: 1 });
      toDate = endOfWeek(today, { weekStartsOn: 1 });
      break;

    case 'last_week': {
      const prevWeek = subWeeks(today, 1);
      fromDate = startOfWeek(prevWeek, { weekStartsOn: 1 });
      toDate = endOfWeek(prevWeek, { weekStartsOn: 1 });
      break;
    }

    case 'this_month':
      fromDate = startOfMonth(today);
      toDate = endOfMonth(today);
      break;

    case 'last_month': {
      const prevMonth = subMonths(today, 1);
      fromDate = startOfMonth(prevMonth);
      toDate = endOfMonth(prevMonth);
      break;
    }

    case 'quarter': {
      const currentMonth = today.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      fromDate = new Date(today.getFullYear(), quarterStartMonth, 1);
      toDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
      break;
    }

    case 'year':
      fromDate = startOfYear(today);
      toDate = endOfYear(today);
      break;

    case 'custom':
      if (customFrom && customTo) {
        return {
          from: customFrom < SYSTEM_START_DATE ? SYSTEM_START_DATE : customFrom,
          to: customTo,
        };
      }
      fromDate = startOfMonth(today);
      toDate = today;
      break;
  }

  const fromStr = formatDateISO(fromDate);
  const toStr = formatDateISO(toDate);

  return {
    from: fromStr < SYSTEM_START_DATE ? SYSTEM_START_DATE : fromStr,
    to: toStr < SYSTEM_START_DATE ? SYSTEM_START_DATE : toStr,
  };
}

/**
 * Checks if a fact date is editable given evaluation_settings.fact_edit_days
 */
export function isFactDateEditable(factDate: string, factEditDays = 1, isOwner = false): boolean {
  if (isOwner) return true;
  const today = getTashkentToday();
  const minDate = subDays(today, factEditDays);
  const minDateStr = formatDateISO(minDate);
  const todayStr = formatDateISO(today);

  return factDate >= minDateStr && factDate <= todayStr;
}

/**
 * Month-weeks breakdown:
 * W1: 1–7
 * W2: 8–14
 * W3: 15–21
 * W4: 22–end
 */
export function getMonthWeekBucket(dayOfMonth: number): 'w1' | 'w2' | 'w3' | 'w4' {
  if (dayOfMonth <= 7) return 'w1';
  if (dayOfMonth <= 14) return 'w2';
  if (dayOfMonth <= 21) return 'w3';
  return 'w4';
}
