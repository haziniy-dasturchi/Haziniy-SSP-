import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Save,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Building,
  CheckCircle,
  Network,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import {
  fetchRoles,
  fetchRolePermissions,
  fetchRoleMetricAccess,
  fetchDepartments,
  fetchMetrics,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Skeleton } from '../components/common/Skeleton';
import { Role, RolePermission, RoleMetricAccess, PermissionModule } from '../types/database';

const ALL_MODULES: { id: PermissionModule; label: string }[] = [
  { id: 'ssp', label: 'SSP (Boshqaruv paneli)' },
  { id: 'fact_entry', label: 'Kundalik fakt kiritish' },
  { id: 'monthly_plans', label: 'Oylik rejalar jadvali' },
  { id: 'bonus', label: 'Bonus hisoblash' },
  { id: 'ai_analysis', label: 'Sun\'iy intellekt tahlili' },
  { id: 'branches', label: 'Filiallar' },
  { id: 'structure', label: 'Tuzilma va ko‘rsatkichlar' },
  { id: 'roles', label: 'Rollar va huquqlar' },
  { id: 'users', label: 'Xodimlar boshqaruvi' },
  { id: 'evaluation', label: 'Baholash sozlamalari' },
  { id: 'import', label: 'Import va eksport' },
  { id: 'audit_log', label: 'Audit jurnali' },
];

export const Roles: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canEdit = can('roles', 'can_edit');
  const canCreate = can('roles', 'can_create');
  const canDelete = can('roles', 'can_delete');

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Auto-select first role
  const activeRole = useMemo(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
      return roles[0];
    }
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  // Fetch permissions for selected role
  const { data: rawPermissions = [], isLoading: permsLoading } = useQuery<RolePermission[]>({
    queryKey: ['role-permissions', activeRole?.id],
    queryFn: () => fetchRolePermissions(activeRole?.id),
    enabled: !!activeRole?.id,
  });

  // Fetch metric access for selected role
  const { data: rawMetricAccess = [], isLoading: metricAccessLoading } = useQuery<RoleMetricAccess[]>({
    queryKey: ['role-metric-access', activeRole?.id],
    queryFn: () => fetchRoleMetricAccess(activeRole?.id),
    enabled: !!activeRole?.id,
  });

  // Local state for permissions matrix: module -> { can_view, can_create, can_edit, can_delete }
  const [permsState, setPermsState] = useState<Record<string, Record<string, boolean>>>({});
  const [metricAccessState, setMetricAccessState] = useState<Record<string, { can_view: boolean; can_enter_fact: boolean }>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Sync loaded permissions into state
  React.useEffect(() => {
    const pState: Record<string, Record<string, boolean>> = {};
    ALL_MODULES.forEach((m) => {
      const existing = rawPermissions.find((p) => p.module === m.id);
      pState[m.id] = {
        can_view: existing?.can_view ?? false,
        can_create: existing?.can_create ?? false,
        can_edit: existing?.can_edit ?? false,
        can_delete: existing?.can_delete ?? false,
      };
    });
    setPermsState(pState);

    const mState: Record<string, { can_view: boolean; can_enter_fact: boolean }> = {};
    metrics.forEach((metric) => {
      const existing = rawMetricAccess.find((a) => a.metric_id === metric.id);
      mState[metric.id] = {
        can_view: existing?.can_view ?? false,
        can_enter_fact: existing?.can_enter_fact ?? false,
      };
    });
    setMetricAccessState(mState);
    setIsDirty(false);
  }, [rawPermissions, rawMetricAccess, metrics, activeRole?.id]);

  const togglePerm = (module: string, action: string) => {
    setPermsState((prev) => {
      const current = prev[module]?.[action] ?? false;
      setIsDirty(true);
      return {
        ...prev,
        [module]: {
          ...prev[module],
          [action]: !current,
        },
      };
    });
  };

  const toggleRowAll = (module: string) => {
    setPermsState((prev) => {
      const row = prev[module] || {};
      const allTrue = row.can_view && row.can_create && row.can_edit && row.can_delete;
      setIsDirty(true);
      return {
        ...prev,
        [module]: {
          can_view: !allTrue,
          can_create: !allTrue,
          can_edit: !allTrue,
          can_delete: !allTrue,
        },
      };
    });
  };

  const toggleColumnAll = (action: string) => {
    setPermsState((prev) => {
      const allTrue = ALL_MODULES.every((m) => prev[m.id]?.[action]);
      const next: Record<string, Record<string, boolean>> = { ...prev };
      ALL_MODULES.forEach((m) => {
        next[m.id] = {
          ...next[m.id],
          [action]: !allTrue,
        };
      });
      setIsDirty(true);
      return next;
    });
  };

  const toggleMetricAccess = (metricId: string, type: 'can_view' | 'can_enter_fact') => {
    setMetricAccessState((prev) => {
      const cur = prev[metricId] || { can_view: false, can_enter_fact: false };
      setIsDirty(true);
      return {
        ...prev,
        [metricId]: {
          ...cur,
          [type]: !cur[type],
        },
      };
    });
  };

  // Save all permissions mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeRole) return;

      // 1. Save role permissions
      const permRows = ALL_MODULES.map((m) => ({
        role_id: activeRole.id,
        module: m.id,
        can_view: permsState[m.id]?.can_view ?? false,
        can_create: permsState[m.id]?.can_create ?? false,
        can_edit: permsState[m.id]?.can_edit ?? false,
        can_delete: permsState[m.id]?.can_delete ?? false,
      }));

      const { error: permErr } = await supabase
        .from('role_permissions')
        .upsert(permRows, { onConflict: 'role_id,module' });
      if (permErr) throw permErr;

      // 2. Save role metric access
      const accessRows = metrics.map((metric) => ({
        role_id: activeRole.id,
        metric_id: metric.id,
        can_view: metricAccessState[metric.id]?.can_view ?? false,
        can_enter_fact: metricAccessState[metric.id]?.can_enter_fact ?? false,
      }));

      const { error: accessErr } = await supabase
        .from('role_metric_access')
        .upsert(accessRows, { onConflict: 'role_id,metric_id' });
      if (accessErr) throw accessErr;
    },
    onSuccess: () => {
      success('Huquqlar muvaffaqiyatli saqlandi');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-metric-access'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  if (rolesLoading) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Rollar va Huquqlar</h1>
          <p className="text-body-sm text-on-surface-muted">
            Tizim rollari, modul huquqlari va ko'rsatkichlarga kirish ruxsatnomalari
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!isDirty}
            className="flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>Saqlash {isDirty ? '*' : ''}</span>
          </Button>
        )}
      </div>

      {/* Role Picker Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              if (isDirty && !window.confirm("Saqlanmagan o'zgarishlar bor. Rolni o'zgartirmoqchimisiz?")) {
                return;
              }
              setSelectedRoleId(r.id);
            }}
            className={`px-4 py-2 rounded-lg text-label-md font-semibold whitespace-nowrap transition-colors border ${
              activeRole?.id === r.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-on-surface hover:bg-surface-muted border-border'
            }`}
          >
            {r.name}
            {r.is_system && <span className="ml-1.5 opacity-70 text-xs">(tizim)</span>}
          </button>
        ))}
      </div>

      {activeRole && (
        <div className="space-y-6">
          {/* Role Info Header */}
          <Card className="p-4 bg-secondary-soft/50 border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">{activeRole.name}</h3>
                <p className="text-body-sm text-on-surface-muted">
                  Filial qamrovi: <strong>{activeRole.branch_scope === 'all' ? 'Barcha filiallar' : "Faqat o'z filiali"}</strong>
                </p>
              </div>
            </div>
          </Card>

          {/* 1. Module Permission Matrix (12 modules × 4 actions) */}
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-surface">
              <h3 className="text-headline-sm font-bold text-on-surface">Modul huquqlari matritsasi</h3>
              <p className="text-body-sm text-on-surface-muted">
                Har bir bo'lim va amallar bo'yicha ruxsatlarni belgilang
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm border-collapse">
                <thead>
                  <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Modul nomi</th>
                    <th className="py-3 px-4 text-center font-semibold">
                      <button
                        onClick={() => toggleColumnAll('can_view')}
                        className="hover:text-primary transition-colors underline"
                      >
                        Ko'rish
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center font-semibold">
                      <button
                        onClick={() => toggleColumnAll('can_create')}
                        className="hover:text-primary transition-colors underline"
                      >
                        Qo'shish
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center font-semibold">
                      <button
                        onClick={() => toggleColumnAll('can_edit')}
                        className="hover:text-primary transition-colors underline"
                      >
                        Tahrirlash
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center font-semibold">
                      <button
                        onClick={() => toggleColumnAll('can_delete')}
                        className="hover:text-primary transition-colors underline"
                      >
                        O'chirish
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right font-semibold">Barchasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ALL_MODULES.map((mod) => {
                    const row = permsState[mod.id] || {};
                    return (
                      <tr key={mod.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-on-surface">{mod.label}</td>

                        {/* can_view */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!row.can_view}
                            onChange={() => togglePerm(mod.id, 'can_view')}
                            className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary cursor-pointer"
                          />
                        </td>

                        {/* can_create */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!row.can_create}
                            onChange={() => togglePerm(mod.id, 'can_create')}
                            className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary cursor-pointer"
                          />
                        </td>

                        {/* can_edit */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!row.can_edit}
                            onChange={() => togglePerm(mod.id, 'can_edit')}
                            className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary cursor-pointer"
                          />
                        </td>

                        {/* can_delete */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!row.can_delete}
                            onChange={() => togglePerm(mod.id, 'can_delete')}
                            className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary cursor-pointer"
                          />
                        </td>

                        {/* Row all toggle */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleRowAll(mod.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            O'zgartirish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 2. Metric Access Matrix (can_view and can_enter_fact) */}
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-surface">
              <h3 className="text-headline-sm font-bold text-on-surface">
                Ko'rsatkichlarga kirish huquqlari
              </h3>
              <p className="text-body-sm text-on-surface-muted">
                Ushbu rol foydalanuvchilari qaysi ko'rsatkichlarni ko'rishi va qaysilariga fakt kiritishi mumkin
              </p>
            </div>

            <div className="p-4 space-y-4">
              {departments.map((dept) => {
                const deptMetrics = metrics.filter((m) => m.department_id === dept.id);
                if (deptMetrics.length === 0) return null;

                return (
                  <div key={dept.id} className="border border-border rounded-xl p-4 bg-surface">
                    <h4 className="font-bold text-body-lg text-primary mb-3">{dept.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {deptMetrics.map((metric) => {
                        const access = metricAccessState[metric.id] || { can_view: false, can_enter_fact: false };

                        return (
                          <div
                            key={metric.id}
                            className="p-3 rounded-lg border border-border bg-surface-muted/40 flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-surface border border-border mr-2">
                                {metric.code}
                              </span>
                              <span className="font-semibold text-body-sm text-on-surface">
                                {metric.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium">
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={access.can_view}
                                  onChange={() => toggleMetricAccess(metric.id, 'can_view')}
                                  className="w-3.5 h-3.5 text-primary rounded border-border-strong focus:ring-secondary"
                                />
                                <span>Ko'rish</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={access.can_enter_fact}
                                  onChange={() => toggleMetricAccess(metric.id, 'can_enter_fact')}
                                  className="w-3.5 h-3.5 text-primary rounded border-border-strong focus:ring-secondary"
                                />
                                <span>Fakt kiritish</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
