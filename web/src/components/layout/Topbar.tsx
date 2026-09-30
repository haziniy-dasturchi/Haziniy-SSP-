import React from 'react';
import { BranchSwitcher } from '../filters/BranchSwitcher';
import { PeriodSelector } from '../filters/PeriodSelector';
import { useFilterParams } from '../../hooks/useFilterParams';
import { useAuth } from '../../context/AuthContext';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const { branchId, period, dateFrom, dateTo, setBranchId, setPeriod } = useFilterParams();
  const { profile } = useAuth();

  return (
    <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Mobile brand header or desktop filters */}
      <div className="flex items-center gap-3 md:hidden">
        <img src="/brand/logo-mark.png" alt="Haziniy" className="w-8 h-8 object-contain" />
        <span className="font-bold text-headline-sm text-primary tracking-tight">Haziniy SSP</span>
      </div>

      {/* Global Filter Bar */}
      <div className="hidden sm:flex items-center gap-4 flex-1 max-w-4xl">
        <BranchSwitcher currentBranchId={branchId} onBranchChange={setBranchId} />
        <div className="h-5 w-[1px] bg-border hidden md:block" />
        <div className="flex-1 overflow-hidden">
          <PeriodSelector
            currentPeriod={period}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPeriodChange={setPeriod}
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        <Link
          to="/profile"
          className="flex items-center gap-2 p-1.5 rounded-full sm:rounded-md hover:bg-surface-muted transition-colors text-on-surface"
        >
          <div className="w-8 h-8 rounded-full bg-secondary-soft text-primary flex items-center justify-center font-bold text-xs">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <span className="text-body-sm font-semibold hidden md:inline truncate max-w-[120px]">
            {profile?.full_name}
          </span>
        </Link>
      </div>
    </header>
  );
};
