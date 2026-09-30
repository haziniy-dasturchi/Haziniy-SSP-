import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '../api/supabase';
import { fetchMetricSeries, fetchSSP } from '../api';
import { useFilterParams } from '../hooks/useFilterParams';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  formatPercent,
  formatMetricValue,
  formatDate,
  formatMonthYear,
} from '../i18n/uz';
import { Metric, MetricSeriesItem } from '../types/database';
import { StatusLevel } from '../utils/status';
import { getTashkentToday } from '../utils/dates';
import { endOfMonth, differenceInCalendarDays } from 'date-fns';

type GrainType = 'day' | 'week' | 'month_week' | 'month';

export const MetricDetail: React.FC = () => {
  const { id: metricId = '' } = useParams<{ id: string }>();
  const { branchId, dateFrom, dateTo } = useFilterParams();
  const [grain, setGrain] = useState<GrainType>('week');
  const [isCumulative, setIsCumulative] = useState(false);

  // Fetch metric info
  const { data: metric, isLoading: metricLoading } = useQuery<Metric>({
    queryKey: ['metric', metricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metrics')
        .select('*, department:departments(*)')
        .eq('id', metricId)
        .single();
      if (error) throw error;
      return data as Metric;
    },
    enabled: !!metricId,
  });

  // Fetch metric series
  const {
    data: rawSeries = [],
    isLoading: seriesLoading,
    error: seriesError,
  } = useQuery({
    queryKey: ['metric-series-detail', branchId, metricId, dateFrom, dateTo, grain],
    queryFn: () => fetchMetricSeries(branchId, metricId, dateFrom, dateTo, grain),
    enabled: !!metricId,
  });

  // Fetch month_week series for the 4-week table
  const { data: weekSeries = [] } = useQuery({
    queryKey: ['metric-week-series', branchId, metricId, dateFrom, dateTo],
    queryFn: () => fetchMetricSeries(branchId, metricId, dateFrom, dateTo, 'month_week'),
    enabled: !!metricId,
  });

  // Transform series if cumulative
  const chartData = useMemo(() => {
    if (!isCumulative) {
      return rawSeries.map((item) => ({
        ...item,
        pctDisplay: Math.round((item.pct ?? 0) * 100),
      }));
    }
    let cumPlan = 0;
    let cumFact = 0;
    return rawSeries.map((item) => {
      cumPlan += Number(item.plan) || 0;
      cumFact += Number(item.fact) || 0;
      const pct = cumPlan > 0 ? cumFact / cumPlan : 0;
      return {
        ...item,
        plan: cumPlan,
        fact: cumFact,
        pct,
        pctDisplay: Math.round(pct * 100),
      };
    });
  }, [rawSeries, isCumulative]);

  // Compute overall summary totals
  const summary = useMemo(() => {
    const totalPlan = rawSeries.reduce((acc, cur) => acc + (Number(cur.plan) || 0), 0);
    const totalFact = rawSeries.reduce((acc, cur) => acc + (Number(cur.fact) || 0), 0);
    const pct = totalPlan > 0 ? totalFact / totalPlan : 0;
    const diff = totalFact - totalPlan;

    // Remaining days to end of month in Tashkent
    const today = getTashkentToday();
    const monthEnd = endOfMonth(today);
    const remainingDays = Math.max(differenceInCalendarDays(monthEnd, today) + 1, 1);

    // Needed per day to reach 100%
    const neededFor100 = Math.max(totalPlan - totalFact, 0);
    const dailyFor100 = Math.ceil(neededFor100 / remainingDays);

    return {
      totalPlan,
      totalFact,
      pct,
      diff,
      remainingDays,
      dailyFor100,
      status: (pct >= 1.0 ? 'green' : pct >= 0.9 ? 'amber' : 'red') as StatusLevel,
    };
  }, [rawSeries]);

  if (metricLoading || seriesLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (seriesError || !metric) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Ko'rsatkich topilmadi"
        description="Bunday ko'rsatkich mavjud emas yoki sizda uni ko'rish huquqi yo'q."
        actionLabel="SSP ga qaytish"
        onAction={() => window.history.back()}
      />
    );
  }

  const grainLabels: Record<GrainType, string> = {
    day: 'Kunlik',
    week: 'Haftalik',
    month_week: 'Oy haftalari',
    month: 'Oylik',
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-lg bg-surface border border-border text-on-surface-muted hover:text-on-surface hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-label-md font-bold px-2 py-0.5 rounded bg-secondary-soft text-primary">
                {metric.code}
              </span>
              <h1 className="text-headline-md font-bold text-on-surface">{metric.name}</h1>
            </div>
            <p className="text-body-sm text-on-surface-muted">
              {(metric as any).department?.name} bo'limi &bull; Vazn: {formatPercent(metric.weight)}
            </p>
          </div>
        </div>

        <Badge status={summary.status} className="text-sm px-3 py-1">
          Bajarilish: {formatPercent(summary.pct)}
        </Badge>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-label-sm uppercase tracking-wider text-on-surface-muted font-bold">
            Davr Rejasi
          </span>
          <p className="text-3xl font-extrabold text-on-surface mt-2 tnum">
            {formatMetricValue(summary.totalPlan, metric.unit)}
          </p>
          <span className="text-body-sm text-on-surface-muted mt-1 block">Belgilangan reja</span>
        </Card>

        <Card className="p-5">
          <span className="text-label-sm uppercase tracking-wider text-on-surface-muted font-bold">
            Haqiqiy Fakt
          </span>
          <p className="text-3xl font-extrabold text-primary mt-2 tnum">
            {formatMetricValue(summary.totalFact, metric.unit)}
          </p>
          <span className="text-body-sm text-on-surface-muted mt-1 block">
            Farq: {summary.diff >= 0 ? '+' : ''}
            {formatMetricValue(summary.diff, metric.unit)}
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-label-sm uppercase tracking-wider text-on-surface-muted font-bold">
            Bajarilish darajasi
          </span>
          <p className="text-3xl font-extrabold text-on-surface mt-2 tnum">
            {formatPercent(summary.pct)}
          </p>
          <div className="mt-2">
            <Badge status={summary.status}>{formatPercent(summary.pct)}</Badge>
          </div>
        </Card>

        <Card className="p-5 bg-secondary-soft/50 border-secondary/30">
          <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
            Kuniga kerak (100% uchun)
          </span>
          <p className="text-3xl font-extrabold text-on-surface mt-2 tnum">
            {summary.dailyFor100 > 0 ? formatMetricValue(summary.dailyFor100, metric.unit) : '0'}
          </p>
          <span className="text-body-sm text-on-surface-muted mt-1 block">
            Oy oxirigacha {summary.remainingDays} kun qoldi
          </span>
        </Card>
      </div>

      {/* Main Chart Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-headline-sm font-bold text-on-surface">Reja vs Fakt Dinamikasi</h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Grain Selector */}
            <div className="flex bg-surface-muted p-1 rounded-lg border border-border">
              {(['day', 'week', 'month_week', 'month'] as GrainType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrain(g)}
                  className={`px-3 py-1 rounded-md text-label-sm font-semibold transition-colors ${
                    grain === g
                      ? 'bg-surface text-on-surface shadow-sm'
                      : 'text-on-surface-muted hover:text-on-surface'
                  }`}
                >
                  {grainLabels[g]}
                </button>
              ))}
            </div>

            {/* Cumulative Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-body-sm font-medium text-on-surface bg-surface border border-border px-3 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={isCumulative}
                onChange={(e) => setIsCumulative(e.target.checked)}
                className="w-4 h-4 text-primary border-border-strong rounded focus:ring-secondary"
              />
              <span>Kumulyativ</span>
            </label>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" />
              <XAxis
                dataKey="bucket_label"
                stroke="#5F6E66"
                tick={{ fontSize: 12, fill: '#5F6E66' }}
              />
              <YAxis
                stroke="#5F6E66"
                tick={{ fontSize: 12, fill: '#5F6E66' }}
                tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-surface p-3 border border-border rounded-lg shadow-lg text-body-sm">
                        <p className="font-bold text-on-surface mb-2">{label || data.bucket_start}</p>
                        <p className="text-on-surface-muted">
                          Reja: <strong className="text-on-surface tnum">{formatMetricValue(data.plan, metric.unit)}</strong>
                        </p>
                        <p className="text-on-surface-muted">
                          Fakt: <strong className="text-primary tnum">{formatMetricValue(data.fact, metric.unit)}</strong>
                        </p>
                        <p className="text-on-surface-muted">
                          Bajarilish: <strong className="text-on-surface tnum">{formatPercent(data.pct)}</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="plan"
                name="Reja"
                stroke="#9AA8A0"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="fact"
                name="Fakt"
                stroke="#0A5D3A"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Week Table: 1–7, 8–14, 15–21, 22–oxiri */}
      <Card className="p-6">
        <h3 className="text-headline-sm font-bold text-on-surface mb-4">
          Oy haftalari bo'yicha tahlil (1–7, 8–14, 15–21, 22–oxiri)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Davr</th>
                <th className="py-3 px-4 text-right font-semibold">Reja</th>
                <th className="py-3 px-4 text-right font-semibold">Fakt</th>
                <th className="py-3 px-4 text-right font-semibold">Farq</th>
                <th className="py-3 px-4 text-center font-semibold">Bajarilish %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weekSeries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-on-surface-muted">
                    Haftalik ma'lumotlar mavjud emas
                  </td>
                </tr>
              ) : (
                weekSeries.map((item, idx) => {
                  const planVal = Number(item.plan) || 0;
                  const factVal = Number(item.fact) || 0;
                  const diff = factVal - planVal;
                  const isPositive = diff >= 0;
                  const pctVal = item.pct ?? 0;
                  const status = pctVal >= 1.0 ? 'green' : pctVal >= 0.9 ? 'amber' : 'red';

                  return (
                    <tr key={idx} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-on-surface">
                        {item.bucket_label} ({formatDate(item.bucket_start)})
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-on-surface tnum">
                        {formatMetricValue(planVal, metric.unit)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-primary tnum">
                        {formatMetricValue(factVal, metric.unit)}
                      </td>
                      <td className="py-3.5 px-4 text-right tnum">
                        <span
                          className={`font-semibold ${
                            isPositive ? 'text-[#17703D]' : 'text-[#B33636]'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatMetricValue(diff, metric.unit)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge status={status}>{formatPercent(item.pct)}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
