import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TrendingDown,
  Calculator,
  RefreshCw,
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
import { MetricUnit, MetricCalcType } from '../types/database';

export interface GridRowItem {
  metric_id: string;
  metric_code: string;
  metric_name: string;
  department: string;
  department_id: string;
  unit: MetricUnit;
  sort_order: number;
  dept_sort_order: number;
  isCalculated: boolean;
  calcType?: MetricCalcType;
  formulaLabel?: string;
  operandAId?: string | null;
  operandBId?: string | null;
  months: Array<{ month: string; value: number | null }>;
}

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

  // Extract unique month columns from active grid data
  const monthColumns = useMemo(() => {
    const months = new Set<string>();
    gridData.forEach((row) => {
      row.months?.forEach((m) => months.add(m.month));
    });
    if (months.size === 0) {
      let cur = parseISO(yearStart);
      for (let i = 0; i < 12; i++) {
        months.add(format(cur, 'yyyy-MM-01'));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }
    return Array.from(months).sort();
  }, [gridData, yearStart]);

  // Combine regular input metrics with calculated metrics (e.g. F3 Foyda = Kirim - Chiqim)
  const combinedGridRows = useMemo<GridRowItem[]>(() => {
    if (departments.length === 0 || allMetrics.length === 0) {
      return gridData.map((row) => ({
        ...row,
        department_id: '',
        unit: 'count' as MetricUnit,
        sort_order: 0,
        dept_sort_order: 0,
        isCalculated: false,
      }));
    }

    const activeDeptMap = new Map(
      departments.filter((d) => d.is_active).map((d) => [d.id, d])
    );
    const metricMap = new Map(allMetrics.map((m) => [m.id, m]));

    const rows: GridRowItem[] = [];

    // 1. Process active input metrics from gridData
    gridData.forEach((row) => {
      const metric = metricMap.get(row.metric_id);
      if (!metric || !metric.is_active) return;
      const dept = activeDeptMap.get(metric.department_id);
      if (!dept) return;

      rows.push({
        metric_id: row.metric_id,
        metric_code: row.metric_code,
        metric_name: row.metric_name,
        department: dept.name,
        department_id: dept.id,
        unit: metric.unit,
        sort_order: metric.sort_order,
        dept_sort_order: dept.sort_order,
        isCalculated: false,
        months: row.months || [],
      });
    });

    // 2. Process active calculated metrics (difference / ratio)
    allMetrics.forEach((m) => {
      if (!m.is_active || m.calc_type === 'input') return;
      const dept = activeDeptMap.get(m.department_id);
      if (!dept) return;

      const opA = m.operand_a_id ? metricMap.get(m.operand_a_id) : null;
      const opB = m.operand_b_id ? metricMap.get(m.operand_b_id) : null;

      const opAName = opA ? opA.name : 'A';
      const opBName = opB ? opB.name : 'B';
      const opSymbol = m.calc_type === 'difference' ? '−' : '÷';
      const formulaLabel = `${opAName} ${opSymbol} ${opBName}`;

      rows.push({
        metric_id: m.id,
        metric_code: m.code,
        metric_name: m.name,
        department: dept.name,
        department_id: dept.id,
        unit: m.unit,
        sort_order: m.sort_order,
        dept_sort_order: dept.sort_order,
        isCalculated: true,
        calcType: m.calc_type,
        formulaLabel,
        operandAId: m.operand_a_id,
        operandBId: m.operand_b_id,
        months: monthColumns.map((mc) => ({ month: mc, value: null })),
      });
    });

    return rows.sort((a, b) => {
      if (a.dept_sort_order !== b.dept_sort_order) {
        return a.dept_sort_order - b.dept_sort_order;
      }
      return a.sort_order - b.sort_order;
    });
  }, [departments, allMetrics, gridData, monthColumns]);

  // Read operand values for calculated metrics
  const getOperandValue = useCallback(
    (metricId?: string | null, month?: string): number | null => {
      if (!metricId || !month) return null;
      const key = `${metricId}_${month}`;
      if (key in editedCells) {
        const str = editedCells[key];
        if (str === '' || str === undefined) return null;
        const parsed = parseFloat(str.replace(/\s+/g, '').replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      }
      const gridRow = gridData.find((r) => r.metric_id === metricId);
      const mItem = gridRow?.months?.find((item) => item.month === month);
      return mItem?.value !== null && mItem?.value !== undefined ? Number(mItem.value) : null;
    },
    [editedCells, gridData]
  );

  // Compute live cell value for display
  const getCellValue = useCallback(
    (row: GridRowItem, month: string) => {
      if (!row.isCalculated) {
        const key = `${row.metric_id}_${month}`;
        const isEdited = key in editedCells;
        const raw = isEdited
          ? editedCells[key]
          : row.months?.find((item) => item.month === month)?.value;
        const numVal =
          raw !== '' && raw !== null && raw !== undefined
            ? parseFloat(String(raw).replace(/\s+/g, '').replace(',', '.'))
            : null;
        return {
          numVal: numVal !== null && !isNaN(numVal) ? numVal : null,
          displayVal: raw !== null && raw !== undefined ? String(raw) : '',
        };
      }

      // Calculated metric (e.g. F3 Foyda = F1 Kirim - F2 Chiqim)
      const valA = getOperandValue(row.operandAId, month);
      const valB = getOperandValue(row.operandBId, month);

      if (valA === null && valB === null) {
        return { numVal: null, displayVal: '—' };
      }

      const a = valA ?? 0;
      const b = valB ?? 0;
      let calcVal: number | null = null;
      if (row.calcType === 'difference') {
        calcVal = a - b;
      } else if (row.calcType === 'ratio') {
        calcVal = b !== 0 ? a / b : null;
      }

      return {
        numVal: calcVal,
        displayVal: calcVal !== null ? String(calcVal) : '—',
      };
    },
    [editedCells, getOperandValue]
  );

  const handleCellChange = (metricId: string, month: string, val: string) => {
    const row = combinedGridRows.find((r) => r.metric_id === metricId);
    if (row?.isCalculated) return;
    const key = `${metricId}_${month}`;
    setEditedCells((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  // Batch save mutation (only persists input metrics)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeBranchId) throw new Error('Filial tanlanmagan');
      const rowsToUpsert: Array<{
        branch_id: string;
        metric_id: string;
        month: string;
        value: number;
      }> = [];

      const calculatedIds = new Set(
        combinedGridRows.filter((r) => r.isCalculated).map((r) => r.metric_id)
      );

      for (const [key, valStr] of Object.entries(editedCells)) {
        const [metric_id, month] = key.split('_');
        if (calculatedIds.has(metric_id)) continue;
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
        queryClient.invalidateQueries({ queryKey: ['daily-plans-map'] });
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
              {combinedGridRows.length === 0 ? (
                <tr>
                  <td colSpan={monthColumns.length + 2} className="py-8 text-center text-on-surface-muted">
                    Rejalar jadvali bo'sh
                  </td>
                </tr>
              ) : (
                combinedGridRows.map((row) => (
                  <tr
                    key={row.metric_id}
                    className={`hover:bg-surface-muted/30 transition-colors ${
                      row.isCalculated ? 'bg-[#F9FBFA]/80' : ''
                    }`}
                  >
                    {/* Metric Name */}
                    <td className="py-3 px-4 font-semibold text-on-surface sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_#E2E8E4]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                              row.isCalculated
                                ? 'bg-primary/10 text-primary'
                                : 'bg-surface-muted text-on-surface'
                            }`}
                          >
                            {row.metric_code}
                          </span>
                          <span className="truncate max-w-[180px]" title={row.metric_name}>
                            {row.metric_name}
                          </span>
                        </div>
                        {row.isCalculated && (
                          <div
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20 w-fit"
                            title={`Formula: ${row.formulaLabel || 'Kirim − Chiqim'}`}
                          >
                            <Calculator className="w-3 h-3 text-primary shrink-0" />
                            <span>f(x) = {row.formulaLabel || 'Kirim − Chiqim'}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3 text-on-surface-muted text-body-sm truncate max-w-[120px]">
                      {row.department}
                    </td>

                    {/* Month Value Cells */}
                    {monthColumns.map((m) => {
                      const cell = getCellValue(row, m);

                      if (row.isCalculated) {
                        return (
                          <td key={m} className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end">
                              {cell.numVal === null ? (
                                <span className="text-on-surface-muted text-xs font-medium px-2 py-1">
                                  —
                                </span>
                              ) : cell.numVal > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#E3F5EA] text-[#17703D] border border-[#BCE8CD] shadow-2xs"
                                  title={`Foyda (ko'payish): +${formatMetricValue(cell.numVal, row.unit)}`}
                                >
                                  <TrendingUp className="w-3.5 h-3.5 text-[#17703D] shrink-0" />
                                  <span>+{formatMetricValue(cell.numVal, row.unit)}</span>
                                </span>
                              ) : cell.numVal < 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#FBE9E9] text-[#B33636] border border-[#F5C2C2] shadow-2xs"
                                  title={`Zarar (kamayish): ${formatMetricValue(cell.numVal, row.unit)}`}
                                >
                                  <TrendingDown className="w-3.5 h-3.5 text-[#B33636] shrink-0" />
                                  <span>{formatMetricValue(cell.numVal, row.unit)}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-surface-muted text-on-surface-muted border border-border">
                                  0 so'm
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={m} className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="text"
                              disabled={!canEdit}
                              value={cell.displayVal}
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
