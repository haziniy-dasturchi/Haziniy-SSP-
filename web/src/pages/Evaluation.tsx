import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings2,
  Save,
  Calculator,
  Gift,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { fetchEvaluationSettings, fetchBonusSchemes, fetchRoles, fetchDepartments } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Skeleton } from '../components/common/Skeleton';
import { formatMoney, formatPercent } from '../i18n/uz';
import { EvaluationSettings, BonusScheme, Role, Department } from '../types/database';

export const Evaluation: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canEdit = can('evaluation', 'can_edit');

  const { data: settings, isLoading: settingsLoading } = useQuery<EvaluationSettings>({
    queryKey: ['evaluation-settings'],
    queryFn: fetchEvaluationSettings,
  });

  const { data: schemes = [], isLoading: schemesLoading } = useQuery<BonusScheme[]>({
    queryKey: ['bonus-schemes'],
    queryFn: fetchBonusSchemes,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  // Settings form states
  const [minBonus, setMinBonus] = useState('0.90');
  const [excellent, setExcellent] = useState('1.00');
  const [capLevel, setCapLevel] = useState('1.20');
  const [editDays, setEditDays] = useState('1');

  // Scheme modal states
  const [schemeModalOpen, setSchemeModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [baseAmount, setBaseAmount] = useState('5000000');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // Delete scheme state
  const [deleteSchemeOpen, setDeleteSchemeOpen] = useState(false);
  const [schemeToDelete, setSchemeToDelete] = useState<BonusScheme | null>(null);

  // Live Calculator State
  const [calcBase, setCalcBase] = useState('5000000');
  const [calcScore, setCalcScore] = useState('95');

  useEffect(() => {
    if (settings) {
      setMinBonus(String(settings.min_bonus_level));
      setExcellent(String(settings.excellent_level));
      setCapLevel(String(settings.cap_level));
      setEditDays(String(settings.fact_edit_days));
    }
  }, [settings]);

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const minB = parseFloat(minBonus);
      const exc = parseFloat(excellent);
      const cap = parseFloat(capLevel);
      const days = parseInt(editDays, 10);

      if (isNaN(minB) || isNaN(exc) || isNaN(cap) || isNaN(days)) {
        throw new Error("Barcha qiymatlar to'g'ri kiritilishi shart");
      }
      if (minB >= exc) {
        throw new Error("Minimal bonus chegarasi a'lo darajadan kichik bo'lishi kerak");
      }

      // evaluation_settings has only one row
      const { error } = await supabase
        .from('evaluation_settings')
        .update({
          min_bonus_level: minB,
          excellent_level: exc,
          cap_level: cap,
          fact_edit_days: days,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all/single row
      if (error) throw error;
    },
    onSuccess: () => {
      success('Baholash sozlamalari saqlandi');
      queryClient.invalidateQueries({ queryKey: ['evaluation-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ssp'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Sozlamalarni saqlashda xatolik yuz berdi');
    },
  });

  // Save Scheme Mutation
  const saveSchemeMutation = useMutation({
    mutationFn: async () => {
      const baseAmt = parseInt(baseAmount.replace(/\D/g, ''), 10);
      if (isNaN(baseAmt) || baseAmt <= 0) {
        throw new Error("Bazaviy bonus summasini to'g'ri kiriting");
      }

      const { error } = await supabase.from('bonus_schemes').upsert(
        {
          role_id: selectedRoleId,
          base_amount: baseAmt,
          department_ids: selectedDeptIds,
        },
        { onConflict: 'role_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      success('Bonus sxemasi muvaffaqiyatli saqlandi');
      setSchemeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bonus-schemes'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  // Live Calculation logic
  const liveResult = React.useMemo(() => {
    const base = parseFloat(calcBase.replace(/\D/g, '')) || 0;
    const score = parseFloat(calcScore) / 100 || 0;
    const minB = parseFloat(minBonus) || 0.9;
    const exc = parseFloat(excellent) || 1.0;
    const cap = parseFloat(capLevel) || 1.2;

    let coeff = 0;
    if (score < minB) {
      coeff = 0;
    } else if (score >= exc) {
      coeff = 1.0;
    } else {
      coeff = score;
    }

    const calculatedBonus = Math.round(base * coeff);
    return {
      coeff,
      bonus: calculatedBonus,
      status: score >= exc ? 'green' : score >= minB ? 'amber' : 'red',
    };
  }, [calcBase, calcScore, minBonus, excellent, capLevel]);

  if (settingsLoading || schemesLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Baholash va Chegaralar</h1>
          <p className="text-body-sm text-on-surface-muted">
            SSP status chegaralari, fakt kiritish muddatlari va bonus sxemalari
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => saveSettingsMutation.mutate()}
            loading={saveSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>Sozlamalarni saqlash</span>
          </Button>
        )}
      </div>

      {/* 1. Evaluation Thresholds & Edit Days Form */}
      <Card className="p-6 space-y-4">
        <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <span>Status va Chegara Sozlamalari</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Minimal bonus (qizil/sariq)"
            type="number"
            step="0.01"
            value={minBonus}
            onChange={(e) => setMinBonus(e.target.value)}
            disabled={!canEdit}
            helperText="Standart: 0.90 (90%)"
          />

          <Input
            label="A'lo daraja (sariq/yashil)"
            type="number"
            step="0.01"
            value={excellent}
            onChange={(e) => setExcellent(e.target.value)}
            disabled={!canEdit}
            helperText="Standart: 1.00 (100%)"
          />

          <Input
            label="Maksimal vizual chegara (cap)"
            type="number"
            step="0.01"
            value={capLevel}
            onChange={(e) => setCapLevel(e.target.value)}
            disabled={!canEdit}
            helperText="Standart: 1.20 (120%)"
          />

          <Input
            label="Fakt tahrirlash muddati (kun)"
            type="number"
            value={editDays}
            onChange={(e) => setEditDays(e.target.value)}
            disabled={!canEdit}
            helperText="Necha kun oldingi sanagacha fakt kiritish mumkin"
          />
        </div>
      </Card>

      {/* 2. Live Bonus Calculator */}
      <Card className="p-6 bg-gradient-to-r from-surface to-secondary-soft/30 border border-secondary/30">
        <h3 className="text-headline-sm font-bold text-on-surface mb-2 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <span>Interaktiv Bonus Kalkulyatori</span>
        </h3>
        <p className="text-body-sm text-on-surface-muted mb-4">
          Joriy chegaralar asosida bonus qanday hisoblanishini jonli hisoblab ko'ring:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <Input
              label="Bazaviy stavka (so'm)"
              value={calcBase}
              onChange={(e) => setCalcBase(e.target.value)}
              placeholder="5 000 000"
            />
            <Input
              label="Bajarilish foizi (%)"
              type="number"
              value={calcScore}
              onChange={(e) => setCalcScore(e.target.value)}
              placeholder="95"
            />
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border text-center shadow-sm space-y-2">
            <span className="text-xs uppercase tracking-wider text-on-surface-muted font-bold block">
              Hisoblangan Bonus Miqdori
            </span>
            <p className="text-4xl font-extrabold text-primary tnum">
              {formatMoney(liveResult.bonus)}
            </p>
            <p className="text-body-sm text-on-surface-muted">
              Koeffitsient: <strong className="text-on-surface tnum">{(liveResult.coeff * 100).toFixed(1)}%</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Bonus Schemes per Role */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <span>Rollar bo'yicha Bonus Sxemalari</span>
            </h3>
            <p className="text-body-sm text-on-surface-muted">
              Har bir xodim roliga biriktirilgan bazaviy stavka va hisob-kitob bo'limlari
            </p>
          </div>

          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedRoleId(roles[0]?.id || '');
                setBaseAmount('5000000');
                setSelectedDeptIds([]);
                setSchemeModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi sxema</span>
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Rol</th>
                <th className="py-3 px-4 font-semibold text-right">Bazaviy stavka</th>
                <th className="py-3 px-4 font-semibold">Hisoblash bo'limlari</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schemes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-on-surface-muted">
                    Bonus sxemalari topilmadi
                  </td>
                </tr>
              ) : (
                schemes.map((s) => {
                  const roleObj = roles.find((r) => r.id === s.role_id);
                  const deptNames = (!s.department_ids || s.department_ids.length === 0)
                    ? 'Barcha bo‘limlar'
                    : departments
                        .filter((d) => s.department_ids?.includes(d.id))
                        .map((d) => d.name)
                        .join(', ');

                  return (
                    <tr key={s.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        {roleObj?.name || 'Noma‘lum rol'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-primary tnum">
                        {formatMoney(s.base_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-muted text-body-sm">
                        {deptNames}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setSchemeToDelete(s);
                              setDeleteSchemeOpen(true);
                            }}
                            className="p-1 rounded text-on-surface-muted hover:text-[#B33636] hover:bg-[#FBE9E9] transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bonus Scheme Modal */}
      <Modal
        isOpen={schemeModalOpen}
        onClose={() => setSchemeModalOpen(false)}
        title="Bonus sxemasini biriktirish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSchemeModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => saveSchemeMutation.mutate()}
              loading={saveSchemeMutation.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Select
            label="Rol"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />

          <Input
            label="Bazaviy stavka (so'm)"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
            placeholder="5 000 000"
            required
          />

          <div>
            <label className="text-label-md font-semibold text-on-surface block mb-2">
              Hisoblash bo'limlari (bo'sh qoldirilsa: barcha bo'limlar)
            </label>
            <div className="space-y-2 border border-border p-3 rounded-lg max-h-48 overflow-y-auto">
              {departments.map((d) => {
                const isSelected = selectedDeptIds.includes(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedDeptIds((prev) =>
                          isSelected ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        );
                      }}
                      className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary"
                    />
                    <span>{d.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Scheme Confirm */}
      <ConfirmDialog
        isOpen={deleteSchemeOpen}
        onClose={() => setDeleteSchemeOpen(false)}
        onConfirm={async () => {
          if (!schemeToDelete) return;
          const { error } = await supabase.from('bonus_schemes').delete().eq('id', schemeToDelete.id);
          if (error) {
            toastError(error.message);
          } else {
            success('Bonus sxemasi o‘chirildi');
            setDeleteSchemeOpen(false);
            queryClient.invalidateQueries({ queryKey: ['bonus-schemes'] });
          }
        }}
        title="Sxemani o'chirish"
        message="Haqiqatan ham ushbu rol uchun bonus sxemasini o'chirib tashlamoqchimisiz?"
      />
    </div>
  );
};
