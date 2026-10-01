import React, { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { BranchSwitcher } from '../filters/BranchSwitcher';
import { PeriodSelector } from '../filters/PeriodSelector';
import { useFilterParams } from '../../hooks/useFilterParams';
import { warmUpCoreRoutes } from '../../utils/prefetch';

const ContentLoader = () => (
  <div className="space-y-6 animate-pulse max-w-[1440px] w-full">
    <div className="h-32 w-full bg-surface-muted rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-24 bg-surface-muted rounded-xl" />
      <div className="h-24 bg-surface-muted rounded-xl" />
      <div className="h-24 bg-surface-muted rounded-xl" />
    </div>
    <div className="h-60 bg-surface-muted rounded-xl" />
  </div>
);

export const Layout: React.FC = () => {
  const { branchId, period, dateFrom, dateTo, setBranchId, setPeriod } = useFilterParams();

  // Warm up core application routes in background on mount
  useEffect(() => {
    warmUpCoreRoutes();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral font-sans antialiased text-on-surface">
      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />

        {/* Mobile filter bar */}
        <div className="sm:hidden px-4 py-2.5 bg-surface border-b border-border space-y-2">
          <BranchSwitcher currentBranchId={branchId} onBranchChange={setBranchId} />
          <PeriodSelector
            currentPeriod={period}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPeriodChange={setPeriod}
          />
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 sm:pb-8">
          <div className="mx-auto max-w-[1440px] w-full">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
};
