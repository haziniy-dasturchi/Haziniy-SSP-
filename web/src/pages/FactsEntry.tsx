import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Building,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import {
  upsertDailyFacts,
  fetchDailyFactsForDate,
  fetchDepartments,
  fetchMetrics,
  fetchDailyPlan,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFilterParams } from '../hooks/useFilterParams';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  getTashkentToday,
  formatDateISO,
  isFactDateEditable,
  SYSTEM_START_DATE,
} from '../utils/dates';
import { formatMetricValue, formatDate } from '../i18n/uz';
import { Department, Metric, DailyFact } from '../types/database';
import { subDays } from 'date-fns';

export const FactsEntry: React.FC = () => {
  const { profile, canEnterFact, role } = useAuth();
  const { branchId, setBranchId } = useFilterParams();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const isOwner = !!profile?.is_owner;
  const isOwnerOrAll = isOwner || role?.branch_scope === 'all';

  // Active branch selection (defaults to user's branch if not owner)
  const activeBranchId = branchId || profile?.branch_id || '';

  // Date selection (default today)
  const todayStr = useMemo(() => formatDateISO(getTashkentToday()), []);
  const yesterdayStr = useMemo(() => formatDateISO(subDays(getTashkentToday(), 1)), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form values: metricId -> string
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch evaluation settings for fact_edit_days
  const { data: evalSettings } = useQuery({
    queryKey: ['evaluation-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('evaluation_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const factEditDays = evalSettings?.fact_edit_days ?? 1;
  const isEditable = isFactDateEditable(selectedDate, factEditDays, isOwner);

  // Fetch departments and metrics
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: allMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  // Filter metrics that the user can enter facts for and are active
  const enterableMetrics = useMemo(() => {
    return allMetrics.filter((m) => m.is_active && canEnterFact(m.id));
  }, [allMetrics, canEnterFact]);

  // Fetch existing facts for this branch and date
  const {
    data: existingFacts = [],
    isLoading: factsLoading,
    refetch: refetchFacts,
  } = useQuery({
    queryKey: ['daily-facts', activeBranchId, selectedDate],
    queryFn: () => fetchDailyFactsForDate(activeBranchId, selectedDate),
    enabled: !!activeBranchId,
  });

  // Fetch today's daily plan values for each enterable metric
  const { data: dailyPlans = {} } = useQuery({
    queryKey: ['daily-plans-map', activeBranchId, selectedDate, enterableMetrics.map((m) => m.id)],
    queryFn: async () => {
      const planMap: Record<string, number | null> = {};
      await Promise.all(
        enterableMetrics.map(async (m) => {
          try {
            const res = await fetchDailyPlan(activeBranchId, m.id, selectedDate, selectedDate);
            if (res && res.length > 0) {
              planMap[m.id] = res[0].plan_value;
            }
          } catch (e) {
            planMap[m.id] = null;
          }
        })
      );
      return planMap;
    },
    enabled: !!activeBranchId && enterableMetrics.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Synchronize existing facts into form values
  useEffect(() => {
    const vals: Record<string, string> = {};
    existingFacts.forEach((f) => {
      vals[f.metric_id] = f.value !== null && f.value !== undefined ? String(f.value) : '';
    });
    setFormValues(vals);
    setInitialValues(vals);
    setIsDirty(false);
  }, [existingFacts, selectedDate]);

  // Track dirty state & warn on window unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleInputChange = (metricId: string, val: string) => {
    setFormValues((prev) => {
      const next = { ...prev, [metricId]: val };
      setIsDirty(true);
      return next;
    });
  };

  // Mutation to save facts
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeBranchId) throw new Error('Filial tanlanmagan');

      const rowsToUpsert: Array<{
        branch_id: string;
        metric_id: string;
        fact_date: string;
        value: number;
      }> = [];

      for (const m of enterableMetrics) {
        const strVal = formValues[m.id]?.trim();
        if (strVal !== undefined && strVal !== '') {
          const numVal = parseFloat(strVal.replace(/\s+/g, '').replace(',', '.'));
          if (!isNaN(numVal)) {
            rowsToUpsert.push({
              branch_id: activeBranchId,
              metric_id: m.id,
              fact_date: selectedDate,
              value: numVal,
            });
          }
        }
      }

      if (rowsToUpsert.length === 0) {
        throw new Error('Hech qanday fakt qiymati kiritilmadi');
      }

      return upsertDailyFacts(rowsToUpsert);
    },
    onSuccess: (data) => {
      if (data.errors && data.errors.length > 0) {
        toastError(data.errors[0].message || 'Faktlarni saqlashda xatolik yuz berdi');
      } else {
        success(`${data.inserted + data.updated} ta fakt muvaffaqiyatli saqlandi`);
        setIsDirty(false);
        refetchFacts();
        queryClient.invalidateQueries({ queryKey: ['ssp'] });
      }
    },
    onError: (err: any) => {
      toastError(err.message || 'Faktlarni saqlashda xatolik yuz berdi');
    },
  });

  // Group enterable metrics by department
  const groupedMetrics = useMemo(() => {
    const map = new Map<Department, Metric[]>();
    departments.forEach((dept) => {
      const metricsInDept = enterableMetrics.filter((m) => m.department_id === dept.id);
      if (metricsInDept.length > 0) {
        map.set(dept, metricsInDept);
      }
    });
    return map;
  }, [departments, enterableMetrics]);

  if (deptsLoading || metricsLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (enterableMetrics.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Fakt kiritish huquqi yo'q"
        description="Sizning rolingizga biriktirilgan ko'rsatkichlar topilmadi yoki fakt kiritish huquqi berilmagan."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Kundalik Fakt Kiritish</h1>
          <p className="text-body-sm text-on-surface-muted">
            Kunlik rejalarning bajarilishini tezkor kiritish va monitoring
          </p>
        </div>

        {/* Save button pinned on desktop */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!isEditable || !isDirty}
          className="hidden sm:inline-flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>Saqlash</span>
        </Button>
      </div>

      {/* Date & Quick Chips Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              min={SYSTEM_START_DATE}
              max={todayStr}
              onChange={(e) => {
                if (isDirty && !window.confirm("Saqlanmagan o'zgarishlar bor. Sanani o'zgartirmoqchimisiz?")) {
                  return;
                }
                setSelectedDate(e.target.value);
              }}
              className="h-11 px-3 bg-surface text-on-surface border border-border-strong rounded-md font-semibold text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          {/* Quick Date Chips: Bugun, Kecha */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm("Saqlanmagan o'zgarishlar bor. Sanani o'zgartirmoqchimisiz?")) {
                  return;
                }
                setSelectedDate(todayStr);
              }}
              className={`h-9 px-4 rounded-full text-label-md font-semibold transition-colors ${
                selectedDate === todayStr
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-muted text-on-surface-muted hover:text-on-surface'
              }`}
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm("Saqlanmagan o'zgarishlar bor. Sanani o'zgartirmoqchimisiz?")) {
                  return;
                }
                setSelectedDate(yesterdayStr);
              }}
              className={`h-9 px-4 rounded-full text-label-md font-semibold transition-colors ${
                selectedDate === yesterdayStr
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-muted text-on-surface-muted hover:text-on-surface'
              }`}
            >
              Kecha
            </button>
          </div>
        </div>

        {/* Read-only warning if outside allowed date window */}
        {!isEditable && (
          <div className="mt-4 p-3 rounded-lg bg-[#FFF4D6] text-[#8A6100] border border-[#FBE099] flex items-center gap-2.5 text-body-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              Bu sana uchun fakt kiritish muddati o'tgan (ruxsat etilgan muddat: {factEditDays} kun). Faqat o'qish rejimida.
            </span>
          </div>
        )}
      </Card>

      {/* Metrics List Grouped by Department */}
      <div className="space-y-6">
        {Array.from(groupedMetrics.entries()).map(([dept, metrics]) => (
          <div key={dept.id} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h3 className="text-headline-sm font-bold text-on-surface">{dept.name}</h3>
            </div>

            <div className="space-y-3">
              {metrics.map((metric) => {
                const planValue = dailyPlans[metric.id];
                const existingFact = existingFacts.find((f) => f.metric_id === metric.id);
                const currentVal = formValues[metric.id] ?? '';

                return (
                  <Card key={metric.id} className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Metric info */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-label-sm font-bold px-2 py-0.5 rounded bg-surface-muted text-on-surface">
                            {metric.code}
                          </span>
                          <span className="font-semibold text-body-lg text-on-surface">
                            {metric.name}
                          </span>
                        </div>

                        {/* Helper info: today's plan & last value */}
                        <div className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface-muted pt-1">
                          {planValue !== null && planValue !== undefined && (
                            <span className="bg-secondary-soft text-on-secondary-soft px-2 py-0.5 rounded font-medium text-xs">
                              Kungi reja: <strong className="tnum">{formatMetricValue(planValue, metric.unit)}</strong>
                            </span>
                          )}

                          {existingFact && (
                            <span className="flex items-center gap-1 text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              Oldingi: <strong className="text-on-surface tnum">{formatMetricValue(existingFact.value, metric.unit)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fact Input (Mobile-First 52px height) */}
                      <div className="w-full sm:w-48 flex items-center gap-2">
                        <div className="relative w-full">
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={!isEditable}
                            value={currentVal}
                            onChange={(e) => handleInputChange(metric.id, e.target.value)}
                            placeholder="0"
                            className="w-full h-[52px] px-4 text-right font-bold text-headline-sm bg-surface text-on-surface border border-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent disabled:bg-surface-muted disabled:text-on-surface-muted transition-colors tnum"
                          />
                        </div>
                        <span className="text-body-sm font-medium text-on-surface-muted min-w-[36px]">
                          {metric.unit === 'money' ? "so'm" : metric.unit === 'percent' ? '%' : 'ta'}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Sticky Save Button */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 p-4 bg-surface/95 backdrop-blur border-t border-border z-30 shadow-lg">
        <Button
          variant="primary"
          size="lg"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!isEditable || !isDirty}
          className="w-full h-12 text-label-lg font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>Saqlash {isDirty ? "(O'zgarishlar bor)" : ''}</span>
        </Button>
      </div>
    </div>
  );
};
