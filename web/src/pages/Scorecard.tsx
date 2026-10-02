import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Info,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { fetchSSP, fetchMetricSeries } from '../api';
import { useFilterParams } from '../hooks/useFilterParams';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Sparkline } from '../components/charts/Sparkline';
import {
  formatPercent,
  formatMetricValue,
  formatMetricDiff,
  formatDate,
} from '../i18n/uz';
import { SSPDepartment, SSPMetric } from '../types/database';

// Component to fetch and display sparkline for an individual metric
const MetricSparklineCell: React.FC<{
  branchId: string | null;
  metricId: string;
  dateFrom: string;
  dateTo: string;
  statusColor?: string;
}> = ({ branchId, metricId, dateFrom, dateTo, statusColor = '#0A5D3A' }) => {
  const { data: series = [] } = useQuery({
    queryKey: ['metric-series', branchId, metricId, dateFrom, dateTo, 'week'],
    queryFn: () => fetchMetricSeries(branchId, metricId, dateFrom, dateTo, 'week'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const points = series.map((s) => (s.pct ?? 0) * 100);
  return <Sparkline data={points} color={statusColor} width={64} height={20} />;
};

export const Scorecard: React.FC = () => {
  const { branchId, dateFrom, dateTo } = useFilterParams();
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const {
    data: sspData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ssp', branchId, dateFrom, dateTo],
    queryFn: () => fetchSSP(branchId, dateFrom, dateTo),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const toggleDept = (deptId: string) => {
    setCollapsedDepts((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !sspData) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Ma'lumotlarni yuklab bo'lmadi"
        description="SSP ko'rsatkichlarini yuklashda xatolik yuz berdi. Qayta urinib ko'ring."
        actionLabel="Qayta yuklash"
        onAction={() => refetch()}
      />
    );
  }

  const { total, departments = [], effective_date } = sspData;
  const totalScorePct = total.pct || 0;

  return (
    <div className="space-y-6">
      {/* Effective Date Notice & Full Plan Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-border text-body-sm text-on-surface-muted">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          {effective_date ? (
            <span>
              Reja <strong className="text-on-surface">{formatDate(effective_date)}</strong> gacha bo'lgan qismi bilan solishtirildi.
            </span>
          ) : (
            <span>Tanlangan oraliq: {formatDate(dateFrom)} — {formatDate(dateTo)}</span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-on-surface text-body-sm">
          <input
            type="checkbox"
            checked={showFullPlan}
            onChange={(e) => setShowFullPlan(e.target.checked)}
            className="w-4 h-4 text-primary border-border-strong rounded focus:ring-secondary cursor-pointer"
          />
          <span>To'liq davr rejasini ko'rsatish</span>
        </label>
      </div>

      {/* Total Score KPI Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-surface to-[#F9FBFA] border-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-label-md uppercase tracking-wider text-on-surface-muted font-bold">
              Umumiy SSP Bajarilishi
            </span>
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black text-on-surface tnum tracking-tight">
                {formatPercent(totalScorePct)}
              </span>
              <Badge status={total.status} className="text-sm px-3 py-1">
                {total.status === 'green' ? 'A\'lo' : total.status === 'amber' ? 'Qoniqarli' : 'Yetarli emas'}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-muted">
              {departments.length} ta bo'lim bo'yicha vaznli o'rtacha ko'rsatkich
            </p>
          </div>

          <div className="w-full md:w-72 space-y-2">
            <div className="flex justify-between text-body-sm font-medium">
              <span className="text-on-surface-muted">Umumiy progress</span>
              <span className="font-semibold text-on-surface tnum">{formatPercent(totalScorePct)}</span>
            </div>
            <ProgressBar pct={totalScorePct} status={total.status} height="lg" cap={120} />
            <div className="flex justify-between text-[11px] text-on-surface-muted tnum">
              <span>0%</span>
              <span>Reja: 100%</span>
              <span>120%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept: SSPDepartment) => (
          <div
            key={dept.id}
            onClick={() => toggleDept(dept.id)}
            className="p-4 bg-surface rounded-xl border border-border hover:border-border-strong cursor-pointer transition-all shadow-sm hover:shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="text-headline-sm font-semibold text-on-surface leading-tight">
                  {dept.name}
                </h4>
                <span className="text-label-sm text-on-surface-muted">
                  Vazn: {formatPercent(dept.weight)}
                </span>
              </div>
              <Badge status={dept.status}>{formatPercent(dept.pct)}</Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              <ProgressBar pct={dept.pct} status={dept.status} height="sm" cap={120} />
              <div className="flex justify-between text-body-sm text-on-surface-muted">
                <span>{dept.metrics?.length || 0} ta ko'rsatkich</span>
                <span className="font-semibold text-on-surface tnum">{formatPercent(dept.pct)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expandable Department & Metric Tables */}
      <div className="space-y-4">
        <h3 className="text-headline-sm font-bold text-on-surface">Bo'limlar va Ko'rsatkichlar</h3>

        {departments.map((dept: SSPDepartment) => {
          const isCollapsed = collapsedDepts[dept.id];

          return (
            <div key={dept.id} className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Department Header Row */}
              <div
                onClick={() => toggleDept(dept.id)}
                className="flex items-center justify-between p-4 bg-secondary-soft cursor-pointer hover:bg-[#DFF1E7] transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <span className="text-label-lg font-bold text-on-secondary-soft">
                      {dept.name}
                    </span>
                    <span className="ml-3 text-label-sm text-on-surface-muted font-medium">
                      (Vazn: {formatPercent(dept.weight)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge status={dept.status} className="text-sm px-2.5">
                    {formatPercent(dept.pct)}
                  </Badge>
                </div>
              </div>

              {/* Metrics Table */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body-sm border-collapse">
                    <thead>
                      <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Ko'rsatkich</th>
                        <th className="py-3 px-3 text-right font-semibold">Vazn</th>
                        <th className="py-3 px-3 text-right font-semibold">
                          {showFullPlan ? "To'liq reja" : 'Reja'}
                        </th>
                        <th className="py-3 px-3 text-right font-semibold">Fakt</th>
                        <th className="py-3 px-3 text-right font-semibold">Farq</th>
                        <th className="py-3 px-4 text-center font-semibold min-w-[140px]">Bajarilish</th>
                        <th className="py-3 px-3 text-center font-semibold">Dinamika</th>
                        <th className="py-3 px-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(!dept.metrics || dept.metrics.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-on-surface-muted">
                            Ko'rsatkichlar topilmadi
                          </td>
                        </tr>
                      ) : (
                        dept.metrics.map((metric: SSPMetric) => {
                          const planVal = (showFullPlan
                            ? (metric.full_period_plan ?? metric.plan)
                            : metric.plan) ?? 0;
                          const factVal = metric.fact ?? 0;
                          const diffVal = factVal - planVal;
                          const isPositive = diffVal >= 0;

                          const statusColor =
                            metric.status === 'green'
                              ? '#17703D'
                              : metric.status === 'amber'
                              ? '#8A6100'
                              : '#B33636';

                          return (
                            <tr
                              key={metric.id}
                              className="hover:bg-[#F9FBFA] transition-colors group"
                            >
                              <td className="py-3.5 px-4 font-medium text-on-surface">
                                <Link
                                  to={`/metric/${metric.id}`}
                                  className="hover:text-primary flex items-center gap-2 group-hover:underline"
                                >
                                  <span className="font-bold text-primary tnum">{metric.code}</span>
                                  <span>{metric.name}</span>
                                </Link>
                              </td>

                              <td className="py-3.5 px-3 text-right text-on-surface-muted tnum">
                                {formatPercent(metric.weight)}
                              </td>

                              <td className="py-3.5 px-3 text-right font-medium text-on-surface tnum">
                                {formatMetricValue(planVal, metric.unit)}
                              </td>

                              <td className="py-3.5 px-3 text-right font-bold text-on-surface tnum">
                                {formatMetricValue(factVal, metric.unit)}
                              </td>

                              <td className="py-3.5 px-3 text-right tnum">
                                <span
                                  className={`inline-flex items-center font-semibold text-xs ${
                                    isPositive ? 'text-[#17703D]' : 'text-[#B33636]'
                                  }`}
                                >
                                  {isPositive ? '+' : ''}
                                  {formatMetricDiff(diffVal, metric.unit)}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <ProgressBar
                                      pct={metric.pct}
                                      status={metric.status}
                                      height="sm"
                                      cap={120}
                                    />
                                  </div>
                                  <Badge status={metric.status}>
                                    {formatPercent(metric.pct)}
                                  </Badge>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <div className="inline-block">
                                  <MetricSparklineCell
                                    branchId={branchId}
                                    metricId={metric.id}
                                    dateFrom={dateFrom}
                                    dateTo={dateTo}
                                    statusColor={statusColor}
                                  />
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <Link
                                  to={`/metric/${metric.id}`}
                                  className="p-1 rounded hover:bg-surface-muted text-on-surface-muted hover:text-primary transition-colors inline-block"
                                  title="Batafsil ko'rish"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
