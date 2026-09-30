import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { PeriodType, getPeriodRange, SYSTEM_START_DATE } from '../utils/dates';
import { useAuth } from '../context/AuthContext';

export interface FilterParams {
  branchId: string | null; // null represents "all"
  period: PeriodType;
  dateFrom: string;
  dateTo: string;
  setBranchId: (branchId: string | null) => void;
  setPeriod: (period: PeriodType, customFrom?: string, customTo?: string) => void;
  setDateRange: (from: string, to: string) => void;
}

export function useFilterParams(): FilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, role } = useAuth();

  const isOwnerOrAll = profile?.is_owner || role?.branch_scope === 'all';

  // Branch ID resolution
  const branchParam = searchParams.get('branch');
  const branchId = useMemo(() => {
    if (!isOwnerOrAll) {
      return profile?.branch_id || null;
    }
    if (branchParam === 'all' || !branchParam) {
      return null;
    }
    return branchParam;
  }, [branchParam, isOwnerOrAll, profile?.branch_id]);

  // Period resolution
  const periodParam = (searchParams.get('period') as PeriodType) || 'this_month';
  const customFrom = searchParams.get('from') || undefined;
  const customTo = searchParams.get('to') || undefined;

  const { dateFrom, dateTo } = useMemo(() => {
    const range = getPeriodRange(periodParam, customFrom, customTo);
    return {
      dateFrom: range.from < SYSTEM_START_DATE ? SYSTEM_START_DATE : range.from,
      dateTo: range.to,
    };
  }, [periodParam, customFrom, customTo]);

  const setBranchId = useCallback(
    (newBranch: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (!newBranch || newBranch === 'all') {
          next.set('branch', 'all');
        } else {
          next.set('branch', newBranch);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const setPeriod = useCallback(
    (newPeriod: PeriodType, from?: string, to?: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', newPeriod);
        if (newPeriod === 'custom' && from && to) {
          next.set('from', from < SYSTEM_START_DATE ? SYSTEM_START_DATE : from);
          next.set('to', to);
        } else {
          next.delete('from');
          next.delete('to');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const setDateRange = useCallback(
    (from: string, to: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', 'custom');
        next.set('from', from < SYSTEM_START_DATE ? SYSTEM_START_DATE : from);
        next.set('to', to);
        return next;
      });
    },
    [setSearchParams]
  );

  return {
    branchId,
    period: periodParam,
    dateFrom,
    dateTo,
    setBranchId,
    setPeriod,
    setDateRange,
  };
}
