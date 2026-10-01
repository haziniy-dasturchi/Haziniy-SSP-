import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Copy,
  Calendar,
  Layers,
  CheckCircle,
  X,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import {
  fetchMonthlyPlanGrid,
  upsertMonthlyPlans,
  copyMonthPlans,
  fetchDailyPlan,
  fetchDepartments,
  fetchMetrics,
  MonthlyPlanGridItem,
  DailyPlanItem,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFilterParams } from '../hooks/useFilterParams';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatMonthYear, formatDate, formatMetricValue } from '../i18n/uz';
import { SYSTEM_START_DATE } from '../utils/dates';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';
import { RefreshCw } from 'lucide-react';

export const PlansGrid: React.FC = () => {
  const { profile, can } = useAuth();
  const { branchId } = useFilterParams();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canEdit = can('monthly_plans', 'can_edit') || can('monthly_plans', 'can_create');
  const activeBranchId = branchId || profile?.branch_id || '';

  // Grid year start (default system start '2026-09-01')
  const [yearStart, setYearStart] = useState('2026-09-01');

  // Edited plan cells: key = `${metric_id}_${month}` -> value string
  const [editedCells, setEditedCells] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Copy modal state
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyFromMonth, setCopyFromMonth] = useState('2026-09-01');
  const [copyToMonth, setCopyToMonth] = useState('2026-10-01');
  const [growthPct, setGrowthPct] = useState(0);

  // Daily distribution drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ id: string; name: string; code: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09-01');

  // Fetch departments and metrics to guarantee deleted/inactive metrics are filtered out
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: allMetrics = [] } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  // Fetch monthly plan grid
  const {
    data: gridData = [],
    isLoading: gridLoading,
    error: gridError,
    refetch: refetchGrid,
  } = useQuery({
    queryKey: ['monthly-plan-grid', activeBranchId, yearStart],
    queryFn: () => fetchMonthlyPlanGrid(activeBranchId, yearStart),
    enabled: !!activeBranchId,
  });

  // Filter gridData to strictly include only currently active metrics in active departments
  const activeMetricIds = useMemo(() => {
    if (allMetrics.length === 0) return null;
    const activeDeptIds = new Set(
      departments.filter((d) => d.is_active).map((d) => d.id)
    );
    return new Set(
      allMetrics
        .filter((m) => m.is_active && (activeDeptIds.size === 0 || activeDeptIds.has(m.department_id)))
        .map((m) => m.id)
    );
  }, [departments, allMetrics]);

  const activeGridData = useMemo(() => {
    if (!activeMetricIds) return gridData;
    return gridData.filter((row) => activeMetricIds.has(row.metric_id));
  }, [gridData, activeMetricIds]);

  // Extract unique month columns from active grid data
  const monthColumns = useMemo(() => {
    if (!activeGridData || activeGridData.length === 0) return [];
    const months = new Set<string>();
    activeGridData.forEach((row) => {
      row.months?.forEach((m) => months.add(m.month));
    });
    return Array.from(months).sort();
  }, [activeGridData]);

  const handleCellChange = (metricId: string, month: string, val: string) => {
    const key = `${metricId}_${month}`;
    setEditedCells((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  // Batch save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeBranchId) throw new Error('Filial tanlanmagan');
      const rowsToUpsert: Array<{
        branch_id: string;
        metric_id: string;
        month: string;
        value: number;
      }> = [];

      for (const [key, valStr] of Object.entries(editedCells)) {
        const [metric_id, month] = key.split('_');
        const numVal = parseFloat(valStr.replace(/\s+/g, '').replace(',', '.'));
        if (!isNaN(numVal)) {
          rowsToUpsert.push({
            branch_id: activeBranchId,
            metric_id,
            month,
            value: numVal,
          });
        }
      }

      if (rowsToUpsert.length === 0) {
        throw new Error("Hech qanday o'zgartirish kiritilmagan");
      }

      return upsertMonthlyPlans(rowsToUpsert);
    },
    onSuccess: (data) => {
      if (data.errors && data.errors.length > 0) {
        toastError(data.errors[0].message || 'Rejalarni saqlashda xatolik yuz berdi');
      } else {
        success(`${data.inserted + data.updated} ta oylik reja muvaffaqiyatli saqlandi`);
        setEditedCells({});
        setIsDirty(false);
        refetchGrid();
        queryClient.invalidateQueries({ queryKey: ['ssp'] });
      }
    },
    onError: (err: any) => {
      toastError(err.message || 'Rejalarni saqlashda xatolik yuz berdi');
    },
  });

  // Copy month mutation
  const copyMutation = useMutation({
    mutationFn: async () => {
      return copyMonthPlans(activeBranchId, copyFromMonth, copyToMonth, growthPct);
    },
    onSuccess: (count) => {
      success(`${count} ta ko'rsatkich rejasi nusxalandi (+${growthPct}%)`);
      setCopyModalOpen(false);
      refetchGrid();
    },
    onError: (err: any) => {
      toastError(err.message || 'Nusxalashda xatolik yuz berdi');
    },
  });

  // Fetch daily distribution for drawer
  const { data: dailyItems = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-distribution', activeBranchId, selectedMetric?.id, selectedMonth],
    queryFn: async () => {
      if (!selectedMetric) return [];
      const mDate = parseISO(selectedMonth);
      const fromStr = formatDate(startOfMonth(mDate));
      const toStr = formatDate(endOfMonth(mDate));
      const isoFrom = format(startOfMonth(mDate), 'yyyy-MM-dd');
      const isoTo = format(endOfMonth(mDate), 'yyyy-MM-dd');
      return fetchDailyPlan(activeBranchId, selectedMetric.id, isoFrom, isoTo);
    },
    enabled: drawerOpen && !!selectedMetric && !!activeBranchId,
  });

  // Daily sum check
  const dailySum = useMemo(() => {
    return dailyItems.reduce((acc, cur) => acc + (Number(cur.plan_value) || 0), 0);
  }, [dailyItems]);

  if (gridLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Oylik Rejalar Jadvali</h1>
          <p className="text-body-sm text-on-surface-muted">
            Barcha ko'rsatkichlar bo'yicha yillik rejalarni shakllantirish va tahrirlash
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              refetchGrid();
              queryClient.invalidateQueries({ queryKey: ['departments'] });
              queryClient.invalidateQueries({ queryKey: ['metrics'] });
            }}
            className="flex items-center gap-2 text-on-surface-muted hover:text-on-surface"
            title="Jadvalni yangilash"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>

          {canEdit && (
            <>
              <Button
                variant="secondary"
                onClick={() => setCopyModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>O'tgan oydan nusxa</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!isDirty}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Saqlash {isDirty ? '*' : ''}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Table Card */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4 sticky left-0 bg-surface-muted z-10 min-w-[220px]">
                  Ko'rsatkich
                </th>
                <th className="py-3 px-3 min-w-[120px]">Bo'lim</th>
                {monthColumns.map((m) => (
                  <th key={m} className="py-3 px-3 text-right min-w-[130px]">
                    {formatMonthYear(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeGridData.length === 0 ? (
                <tr>
                  <td colSpan={monthColumns.length + 2} className="py-8 text-center text-on-surface-muted">
                    Rejalar jadvali bo'sh
                  </td>
                </tr>
              ) : (
                activeGridData.map((row) => (
                  <tr key={row.metric_id} className="hover:bg-surface-muted/30 transition-colors">
                    {/* Metric Name */}
                    <td className="py-3 px-4 font-semibold text-on-surface sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_#E2E8E4]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-surface-muted text-on-surface">
                          {row.metric_code}
                        </span>
                        <span className="truncate max-w-[180px]">{row.metric_name}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3 text-on-surface-muted text-body-sm truncate max-w-[120px]">
                      {row.department}
                    </td>

                    {/* Month Value Cells */}
                    {monthColumns.map((m) => {
                      const monthData = row.months?.find((item) => item.month === m);
                      const key = `${row.metric_id}_${m}`;
                      const isEdited = key in editedCells;
                      const displayVal = isEdited
                        ? editedCells[key]
                        : monthData?.value !== null && monthData?.value !== undefined
                        ? String(monthData.value)
                        : '';

                      return (
                        <td key={m} className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="text"
                              disabled={!canEdit}
                              value={displayVal}
                              onChange={(e) => handleCellChange(row.metric_id, m, e.target.value)}
                              placeholder="—"
                              className={`w-24 h-9 px-2 text-right rounded-sm text-body-sm font-semibold border transition-colors tnum ${
                                canEdit
                                  ? 'bg-[#E9F7EF] text-on-surface border-transparent focus:border-secondary focus:bg-surface'
                                  : 'bg-surface-muted text-on-surface-muted border-transparent cursor-not-allowed'
                              }`}
                            />
                            {/* Distribution drawer open icon */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMetric({
                                  id: row.metric_id,
                                  name: row.metric_name,
                                  code: row.metric_code,
                                });
                                setSelectedMonth(m);
                                setDrawerOpen(true);
                              }}
                              className="p-1 rounded text-on-surface-muted hover:text-primary hover:bg-surface transition-colors"
                              title="Kunlik taqsimotni ko'rish"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Copy Month Modal */}
      <Modal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="O'tgan oydan nusxa olish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCopyModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => copyMutation.mutate()}
              loading={copyMutation.isPending}
            >
              Nusxalash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            type="date"
            label="Qaysi oydan nusxa olinadi"
            value={copyFromMonth}
            onChange={(e) => setCopyFromMonth(e.target.value)}
          />
          <Input
            type="date"
            label="Qaysi oyga nusxalanadi"
            value={copyToMonth}
            onChange={(e) => setCopyToMonth(e.target.value)}
          />
          <Input
            type="number"
            label="O'sish foizi (+%)"
            value={String(growthPct)}
            onChange={(e) => setGrowthPct(Number(e.target.value))}
            placeholder="0"
            helperText="Misol: 10 kiritilsa, barcha rejalar 10% ga oshirilib nusxalanadi"
          />
        </div>
      </Modal>

      {/* Daily Distribution Side Drawer */}
      {drawerOpen && selectedMetric && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-[#0A1E14]/40 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface h-full shadow-2xl border-l border-border p-6 flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-secondary-soft text-primary">
                  {selectedMetric.code}
                </span>
                <h3 className="text-headline-sm font-bold text-on-surface mt-1">
                  {selectedMetric.name}
                </h3>
                <p className="text-body-sm text-on-surface-muted">
                  {formatMonthYear(selectedMonth)} kunlik taqsimoti
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-md text-on-surface-muted hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sum check indicator */}
            <div className="my-4 p-3 rounded-lg bg-surface-muted border border-border flex items-center justify-between text-body-sm">
              <span className="text-on-surface-muted">Kunlar yig'indisi:</span>
              <strong className="text-primary text-headline-sm tnum font-bold">
                {dailySum}
              </strong>
            </div>

            {/* Daily items list */}
            <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-border pr-1">
              {dailyLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : dailyItems.length === 0 ? (
                <div className="py-8 text-center text-on-surface-muted">
                  Kunlik taqsimot ma'lumotlari mavjud emas
                </div>
              ) : (
                dailyItems.map((d: DailyPlanItem, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 text-body-sm">
                    <span className="text-on-surface font-medium">{formatDate(d.plan_date)}</span>
                    <span className="font-bold text-on-surface tnum bg-surface px-2.5 py-0.5 rounded border border-border">
                      {d.plan_value !== null ? d.plan_value : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
