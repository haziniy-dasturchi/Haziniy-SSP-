import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback, useEffect } from 'react';
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

const BRANCH_STORAGE_KEY = 'haziniy_selected_branch';
const PERIOD_STORAGE_KEY = 'haziniy_selected_period';

export function useFilterParams(): FilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, role, loading } = useAuth();

  // Branch ID resolution
  const branchParam = searchParams.get('branch');
  const branchId = useMemo(() => {
    // If user is loaded and not owner and limited to own branch, lock to own branch
    if (!loading && profile && !profile.is_owner && role?.branch_scope !== 'all') {
      return profile.branch_id || null;
    }

    // 1. Explicit URL parameter
    if (branchParam !== null) {
      if (branchParam === 'all' || !branchParam) {
        try {
          localStorage.setItem(BRANCH_STORAGE_KEY, 'all');
        } catch (e) {}
        return null;
      }
      try {
        localStorage.setItem(BRANCH_STORAGE_KEY, branchParam);
      } catch (e) {}
      return branchParam;
    }

    // 2. Saved branch in localStorage
    try {
      const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
      if (saved && saved !== 'all') {
        return saved;
      }
    } catch (e) {}

    return null; // 'all'
  }, [branchParam, loading, profile, role]);

  // Keep URL in sync with resolved branchId if URL parameter was missing
  useEffect(() => {
    if (branchParam === null && branchId) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('branch', branchId);
          return next;
        },
        { replace: true }
      );
    }
  }, [branchParam, branchId, setSearchParams]);

  // Period resolution
  const periodParamFromUrl = searchParams.get('period') as PeriodType | null;
  const customFrom = searchParams.get('from') || undefined;
  const customTo = searchParams.get('to') || undefined;

  const periodParam = useMemo(() => {
    if (periodParamFromUrl) {
      try {
        localStorage.setItem(PERIOD_STORAGE_KEY, periodParamFromUrl);
      } catch (e) {}
      return periodParamFromUrl;
    }
    try {
      const saved = localStorage.getItem(PERIOD_STORAGE_KEY) as PeriodType | null;
      if (saved) return saved;
    } catch (e) {}
    return 'this_month' as PeriodType;
  }, [periodParamFromUrl]);

  const { dateFrom, dateTo } = useMemo(() => {
    const range = getPeriodRange(periodParam, customFrom, customTo);
    return {
      dateFrom: range.from < SYSTEM_START_DATE ? SYSTEM_START_DATE : range.from,
      dateTo: range.to,
    };
  }, [periodParam, customFrom, customTo]);

  const setBranchId = useCallback(
    (newBranch: string | null) => {
      const val = !newBranch || newBranch === 'all' ? 'all' : newBranch;
      try {
        localStorage.setItem(BRANCH_STORAGE_KEY, val);
      } catch (e) {}

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('branch', val);
        return next;
      });
    },
    [setSearchParams]
  );

  const setPeriod = useCallback(
    (newPeriod: PeriodType, from?: string, to?: string) => {
      try {
        localStorage.setItem(PERIOD_STORAGE_KEY, newPeriod);
      } catch (e) {}

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
      try {
        localStorage.setItem(PERIOD_STORAGE_KEY, 'custom');
      } catch (e) {}

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
