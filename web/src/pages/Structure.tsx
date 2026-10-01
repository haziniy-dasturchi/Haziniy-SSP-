import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Network,
  ChevronDown,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { fetchDepartments, fetchMetrics } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { formatPercent } from '../i18n/uz';
import { Department, Metric } from '../types/database';

export const Structure: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canCreate = can('structure', 'can_create');
  const canEdit = can('structure', 'can_edit');
  const canDelete = can('structure', 'can_delete');

  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<Metric[]>({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  // Check sum of department weights (active only)
  const activeDeptWeightSum = useMemo(() => {
    const sum = departments
      .filter((d) => d.is_active)
      .reduce((acc, d) => acc + (Number(d.weight) || 0), 0);
    return Math.round(sum * 10000) / 10000;
  }, [departments]);

  const isDeptWeightValid = Math.abs(activeDeptWeightSum - 1.0) < 0.001;

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptWeight, setDeptWeight] = useState('0.25');
  const [deptActive, setDeptActive] = useState(true);

  // Metric Modal State
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [metricDeptId, setMetricDeptId] = useState('');
  const [metricCode, setMetricCode] = useState('');
  const [metricName, setMetricName] = useState('');
  const [metricUnit, setMetricUnit] = useState<'count' | 'money' | 'percent'>('count');
  const [metricAgg, setMetricAgg] = useState<'sum' | 'last' | 'avg'>('sum');
  const [metricDir, setMetricDir] = useState<'higher_better' | 'lower_better'>('higher_better');
  const [metricDist, setMetricDist] = useState<'equal' | 'no_sunday' | 'none'>('equal');
  const [metricWeight, setMetricWeight] = useState('0.25');
  const [metricActive, setMetricActive] = useState(true);

  // Delete State
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [deleteMetricOpen, setDeleteMetricOpen] = useState(false);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);

  // Save Department Mutation
  const saveDeptMutation = useMutation({
    mutationFn: async () => {
      const weightNum = parseFloat(deptWeight);
      if (isNaN(weightNum) || weightNum <= 0 || weightNum > 1) {
        throw new Error("Vazn 0 va 1 oralig'ida bo'lishi kerak (masalan 0.25)");
      }
      const payload = {
        name: deptName.trim(),
        weight: weightNum,
        is_active: deptActive,
      };

      if (editingDept) {
        const { error } = await supabase.from('departments').update(payload).eq('id', editingDept.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('departments').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      success(editingDept ? 'Bo‘lim yangilandi' : 'Yangi bo‘lim qo‘shildi');
      setDeptModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-plan-grid'] });
      queryClient.invalidateQueries({ queryKey: ['ssp'] });
      queryClient.invalidateQueries({ queryKey: ['daily-facts'] });
      queryClient.invalidateQueries({ queryKey: ['daily-plans-map'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  // Save Metric Mutation
  const saveMetricMutation = useMutation({
    mutationFn: async () => {
      const weightNum = parseFloat(metricWeight);
      if (isNaN(weightNum) || weightNum <= 0 || weightNum > 1) {
        throw new Error("Metrika vazni 0 va 1 oralig'ida bo'lishi kerak (masalan 0.25)");
      }
      const payload = {
        department_id: metricDeptId,
        code: metricCode.trim(),
        name: metricName.trim(),
        unit: metricUnit,
        aggregation: metricAgg,
        direction: metricDir,
        distribution: metricDist,
        weight: weightNum,
        is_active: metricActive,
      };

      if (editingMetric) {
        const { error } = await supabase.from('metrics').update(payload).eq('id', editingMetric.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('metrics').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      success(editingMetric ? 'Ko‘rsatkich yangilandi' : 'Yangi ko‘rsatkich qo‘shildi');
      setMetricModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-plan-grid'] });
      queryClient.invalidateQueries({ queryKey: ['ssp'] });
      queryClient.invalidateQueries({ queryKey: ['daily-facts'] });
      queryClient.invalidateQueries({ queryKey: ['daily-plans-map'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  if (deptsLoading || metricsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Tuzilma va Ko'rsatkichlar</h1>
          <p className="text-body-sm text-on-surface-muted">
            Bo'limlar va ularga tegishli ko'rsatkichlar iyerarxiyasi hamda vaznlari
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingDept(null);
                setDeptName('');
                setDeptWeight('0.25');
                setDeptActive(true);
                setDeptModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi bo'lim</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                setEditingMetric(null);
                setMetricDeptId(departments[0]?.id || '');
                setMetricCode('');
                setMetricName('');
                setMetricUnit('count');
                setMetricAgg('sum');
                setMetricDir('higher_better');
                setMetricDist('equal');
                setMetricWeight('0.25');
                setMetricActive(true);
                setMetricModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi ko'rsatkich</span>
            </Button>
          </div>
        )}
      </div>

      {/* 100% Weight Sum Validation Banner */}
      <Card
        className={`p-4 flex items-center justify-between gap-4 border ${
          isDeptWeightValid
            ? 'bg-[#E3F5EA]/40 border-[#BCE8CD] text-[#17703D]'
            : 'bg-[#FBE9E9]/60 border-[#F5C2C2] text-[#B33636]'
        }`}
      >
        <div className="flex items-center gap-3">
          {isDeptWeightValid ? (
            <CheckCircle className="w-5 h-5 text-[#17703D] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#B33636] shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-body-md">
              {isDeptWeightValid
                ? "Bo'limlar vaznlari yig'indisi to'g'ri (100%)"
                : "Diqqat: Bo'limlar vaznlari yig'indisi 100% bo'lishi shart!"}
            </h4>
            <p className="text-body-sm opacity-90">
              Faol bo'limlarning jami vazni: <strong>{(activeDeptWeightSum * 100).toFixed(1)}%</strong> (talab: 100.0%)
            </p>
          </div>
        </div>
      </Card>

      {/* Departments & Metrics List */}
      <div className="space-y-6">
        {departments.map((dept) => {
          const deptMetrics = metrics.filter((m) => m.department_id === dept.id);
          const deptMetricWeightSum = deptMetrics
            .filter((m) => m.is_active)
            .reduce((acc, m) => acc + (Number(m.weight) || 0), 0);
          const isMetricWeightValid = Math.abs(deptMetricWeightSum - 1.0) < 0.001;

          return (
            <Card key={dept.id} className="p-0 overflow-hidden shadow-sm">
              {/* Department Header Bar */}
              <div className="p-4 bg-secondary-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-secondary-soft">
                      {dept.name}
                    </h3>
                    <span className="text-body-sm text-on-surface-muted">
                      Bo'lim vazni: <strong className="tnum text-on-surface">{formatPercent(dept.weight)}</strong> &bull; Ichki ko'rsatkichlar vazni: <strong className="tnum">{formatPercent(deptMetricWeightSum)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isMetricWeightValid && (
                    <span className="text-xs px-2.5 py-1 rounded bg-[#FBE9E9] text-[#B33636] font-semibold">
                      Ko'rsatkichlar vazni: {(deptMetricWeightSum * 100).toFixed(0)}% / 100%
                    </span>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingDept(dept);
                        setDeptName(dept.name);
                        setDeptWeight(String(dept.weight));
                        setDeptActive(dept.is_active);
                        setDeptModalOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-surface text-on-surface-muted hover:text-on-surface transition-colors"
                      title="Bo'limni tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => {
                        setDeptToDelete(dept);
                        setDeleteDeptOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-[#FBE9E9] text-on-surface-muted hover:text-[#B33636] transition-colors"
                      title="Bo'limni o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Table inside Department */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Kod</th>
                      <th className="py-2.5 px-4 font-semibold">Ko'rsatkich nomi</th>
                      <th className="py-2.5 px-3 font-semibold">Birlik</th>
                      <th className="py-2.5 px-3 font-semibold">Aggregatsiya</th>
                      <th className="py-2.5 px-3 font-semibold">Yo'nalish</th>
                      <th className="py-2.5 px-3 font-semibold">Taqsimot</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Vazn</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Holat</th>
                      <th className="py-2.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deptMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-on-surface-muted">
                          Bu bo'limda ko'rsatkichlar mavjud emas
                        </td>
                      </tr>
                    ) : (
                      deptMetrics.map((m) => (
                        <tr key={m.id} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{m.code}</td>
                          <td className="py-3 px-4 font-semibold text-on-surface">{m.name}</td>
                          <td className="py-3 px-3 text-on-surface-muted">
                            {m.unit === 'money' ? "so'm" : m.unit === 'percent' ? '%' : 'soni'}
                          </td>
                          <td className="py-3 px-3 text-on-surface-muted font-mono text-xs">
                            {m.aggregation}
                          </td>
                          <td className="py-3 px-3 text-on-surface-muted text-xs">
                            {m.direction === 'higher_better' ? "O'sish yaxshi" : "Kamayish yaxshi"}
                          </td>
                          <td className="py-3 px-3 text-on-surface-muted text-xs font-mono">
                            {m.distribution}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-on-surface tnum">
                            {formatPercent(m.weight)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {m.is_active ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E3F5EA] text-[#17703D] font-semibold">
                                Faol
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-on-surface-muted font-semibold">
                                Nofaol
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingMetric(m);
                                  setMetricDeptId(m.department_id);
                                  setMetricCode(m.code);
                                  setMetricName(m.name);
                                  setMetricUnit(m.unit);
                                  setMetricAgg(m.aggregation);
                                  setMetricDir(m.direction);
                                  setMetricDist(m.distribution);
                                  setMetricWeight(String(m.weight));
                                  setMetricActive(m.is_active);
                                  setMetricModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-surface-muted text-on-surface-muted hover:text-on-surface"
                                title="Tahrirlash"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setMetricToDelete(m);
                                  setDeleteMetricOpen(true);
                                }}
                                className="p-1 rounded hover:bg-[#FBE9E9] text-on-surface-muted hover:text-[#B33636]"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editingDept ? "Bo'limni tahrirlash" : "Yangi bo'lim qo'shish"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeptModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => saveDeptMutation.mutate()}
              loading={saveDeptMutation.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Bo'lim nomi"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="Masalan: Sotuv"
            required
          />
          <Input
            label="Bo'lim vazni (0 dan 1 gacha)"
            type="number"
            step="0.01"
            value={deptWeight}
            onChange={(e) => setDeptWeight(e.target.value)}
            placeholder="0.25"
            helperText="Barcha faol bo'limlar vaznlari yig'indisi 1.0 (100%) bo'lishi shart"
            required
          />
          <label className="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface pt-2">
            <input
              type="checkbox"
              checked={deptActive}
              onChange={(e) => setDeptActive(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary"
            />
            <span>Faol bo'lim</span>
          </label>
        </div>
      </Modal>

      {/* Metric Modal */}
      <Modal
        isOpen={metricModalOpen}
        onClose={() => setMetricModalOpen(false)}
        title={editingMetric ? "Ko'rsatkichni tahrirlash" : "Yangi ko'rsatkich qo'shish"}
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMetricModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMetricMutation.mutate()}
              loading={saveMetricMutation.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Select
            label="Bo'lim"
            value={metricDeptId}
            onChange={(e) => setMetricDeptId(e.target.value)}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Input
            label="Kod"
            value={metricCode}
            onChange={(e) => setMetricCode(e.target.value)}
            placeholder="S1"
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Ko'rsatkich nomi"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              placeholder="Masalan: Yangi lidlar soni"
              required
            />
          </div>
          <Select
            label="O'lchov birligi"
            value={metricUnit}
            onChange={(e) => setMetricUnit(e.target.value as any)}
            options={[
              { value: 'count', label: 'Soni (ta)' },
              { value: 'money', label: "Pul (so'm)" },
              { value: 'percent', label: 'Foiz (%)' },
            ]}
          />
          <Select
            label="Aggregatsiya"
            value={metricAgg}
            onChange={(e) => setMetricAgg(e.target.value as any)}
            options={[
              { value: 'sum', label: "Yig'indi (sum)" },
              { value: 'last', label: "Oxirgi qiymat (last)" },
              { value: 'avg', label: "O'rtacha (avg)" },
            ]}
          />
          <Select
            label="Yo'nalish"
            value={metricDir}
            onChange={(e) => setMetricDir(e.target.value as any)}
            options={[
              { value: 'higher_better', label: "O'sish yaxshi (higher_better)" },
              { value: 'lower_better', label: "Kamayish yaxshi (lower_better)" },
            ]}
          />
          <Select
            label="Kunlik taqsimot"
            value={metricDist}
            onChange={(e) => setMetricDist(e.target.value as any)}
            options={[
              { value: 'equal', label: 'Teng taqsimlash (equal)' },
              { value: 'no_sunday', label: 'Yakshanbasiz (no_sunday)' },
              { value: 'none', label: "Taqsimotsiz (none)" },
            ]}
          />
          <Input
            label="Vazn (0 dan 1 gacha)"
            type="number"
            step="0.01"
            value={metricWeight}
            onChange={(e) => setMetricWeight(e.target.value)}
            placeholder="0.25"
            helperText="Bo'lim ichidagi barcha ko'rsatkichlar vazni 1.0 (100%) bo'lishi kerak"
            required
          />
          <div className="flex items-center pt-8">
            <label className="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface">
              <input
                type="checkbox"
                checked={metricActive}
                onChange={(e) => setMetricActive(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary"
              />
              <span>Faol ko'rsatkich</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Department Dialog */}
      <ConfirmDialog
        isOpen={deleteDeptOpen}
        onClose={() => setDeleteDeptOpen(false)}
        onConfirm={async () => {
          if (!deptToDelete) return;
          const { error } = await supabase.from('departments').delete().eq('id', deptToDelete.id);
          if (error) {
            toastError(error.message);
          } else {
            success("Bo'lim o'chirildi");
            setDeleteDeptOpen(false);
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-plan-grid'] });
            queryClient.invalidateQueries({ queryKey: ['ssp'] });
            queryClient.invalidateQueries({ queryKey: ['daily-facts'] });
            queryClient.invalidateQueries({ queryKey: ['daily-plans-map'] });
          }
        }}
        title="Bo'limni o'chirish"
        message={`"${deptToDelete?.name}" bo'limini o'chirishni tasdiqlaysizmi?`}
      />

      {/* Delete Metric Dialog */}
      <ConfirmDialog
        isOpen={deleteMetricOpen}
        onClose={() => setDeleteMetricOpen(false)}
        onConfirm={async () => {
          if (!metricToDelete) return;
          const { error } = await supabase.from('metrics').delete().eq('id', metricToDelete.id);
          if (error) {
            toastError(error.message);
          } else {
            success("Ko'rsatkich o'chirildi");
            setDeleteMetricOpen(false);
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-plan-grid'] });
            queryClient.invalidateQueries({ queryKey: ['ssp'] });
            queryClient.invalidateQueries({ queryKey: ['daily-facts'] });
            queryClient.invalidateQueries({ queryKey: ['daily-plans-map'] });
          }
        }}
        title="Ko'rsatkichni o'chirish"
        message={`"${metricToDelete?.code} - ${metricToDelete?.name}" ko'rsatkichini o'chirishni tasdiqlaysizmi?`}
      />
    </div>
  );
};
