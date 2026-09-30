import { supabase } from './supabase';
import {
  SSPResponse,
  MetricSeriesItem,
  BonusResult,
  AIAnalysisResult,
  Branch,
  Department,
  Metric,
  Role,
  RolePermission,
  RoleMetricAccess,
  Profile,
  EvaluationSettings,
  BonusScheme,
  DailyFact,
  AuditLogItem,
} from '../types/database';

// ============================================================================
// Auth & RPCs
// ============================================================================

export async function updateLastLogin(): Promise<void> {
  await supabase.rpc('update_last_login');
}

export async function fetchSSP(
  branchId: string | null,
  dateFrom: string,
  dateTo: string
): Promise<SSPResponse> {
  const { data, error } = await supabase.rpc('get_ssp', {
    p_branch: branchId || null,
    p_from: dateFrom,
    p_to: dateTo,
  });
  if (error) throw error;
  return data as SSPResponse;
}

export async function fetchMetricSeries(
  branchId: string | null,
  metricId: string,
  dateFrom: string,
  dateTo: string,
  grain: 'day' | 'week' | 'month_week' | 'month' = 'week'
): Promise<MetricSeriesItem[]> {
  const { data, error } = await supabase.rpc('get_metric_series', {
    p_branch: branchId || null,
    p_metric: metricId,
    p_from: dateFrom,
    p_to: dateTo,
    p_grain: grain,
  });
  if (error) throw error;
  return (data || []) as MetricSeriesItem[];
}

export interface MonthlyPlanGridItem {
  metric_id: string;
  metric_code: string;
  metric_name: string;
  department: string;
  months: Array<{ month: string; value: number | null }>;
}

export async function fetchMonthlyPlanGrid(
  branchId: string,
  yearStart: string
): Promise<MonthlyPlanGridItem[]> {
  const { data, error } = await supabase.rpc('get_monthly_plan_grid', {
    p_branch: branchId,
    p_year_start: yearStart,
  });
  if (error) throw error;
  return (data || []) as MonthlyPlanGridItem[];
}

export interface DailyPlanItem {
  plan_date: string;
  plan_value: number | null;
}

export async function fetchDailyPlan(
  branchId: string,
  metricId: string,
  dateFrom: string,
  dateTo: string,
  employeeId?: string | null
): Promise<DailyPlanItem[]> {
  const { data, error } = await supabase.rpc('daily_plan', {
    p_branch: branchId,
    p_metric: metricId,
    p_from: dateFrom,
    p_to: dateTo,
    p_employee: employeeId || null,
  });
  if (error) throw error;
  return (data || []) as DailyPlanItem[];
}

export async function fetchMyBonus(month: string): Promise<BonusResult> {
  const { data, error } = await supabase.rpc('get_my_bonus', {
    p_month: month,
  });
  if (error) throw error;
  return data as BonusResult;
}

export async function fetchEmployeeBonus(profileId: string, month: string): Promise<BonusResult> {
  const { data, error } = await supabase.rpc('get_bonus', {
    p_profile_id: profileId,
    p_month: month,
  });
  if (error) throw error;
  return data as BonusResult;
}

export async function upsertMonthlyPlans(
  rows: Array<{
    branch_id: string;
    metric_id: string;
    employee_id?: string | null;
    month: string;
    value: number;
  }>
): Promise<{ inserted: number; updated: number; errors: Array<{ row: number; message: string }> }> {
  const { data, error } = await supabase.rpc('upsert_monthly_plans', {
    p_rows: rows,
  });
  if (error) throw error;
  return data;
}

export async function upsertDailyFacts(
  rows: Array<{
    branch_id: string;
    metric_id: string;
    employee_id?: string | null;
    fact_date: string;
    value: number;
  }>
): Promise<{ inserted: number; updated: number; errors: Array<{ row: number; message: string }> }> {
  const { data, error } = await supabase.rpc('upsert_daily_facts', {
    p_rows: rows,
  });
  if (error) throw error;
  return data;
}

export async function copyMonthPlans(
  branchId: string,
  fromMonth: string,
  toMonth: string,
  growthPct = 0
): Promise<number> {
  const { data, error } = await supabase.rpc('copy_month_plans', {
    p_branch: branchId,
    p_from_month: fromMonth,
    p_to_month: toMonth,
    p_growth_pct: growthPct,
  });
  if (error) throw error;
  return Number(data);
}

// ============================================================================
// Edge Functions
// ============================================================================

export async function runAIAnalysis(
  branchId: string | null,
  dateFrom: string,
  dateTo: string
): Promise<AIAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('ai-analyze', {
    body: {
      branch_id: branchId || null,
      date_from: dateFrom,
      date_to: dateTo,
    },
  });
  if (error) throw error;
  return data as AIAnalysisResult;
}

export async function adminUsersAction(
  action: 'create' | 'update' | 'reset_password' | 'set_active' | 'delete',
  payload: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

// ============================================================================
// Direct Table Queries (Protected by RLS)
// ============================================================================

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchMetrics(): Promise<Metric[]> {
  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchRolePermissions(roleId?: string): Promise<RolePermission[]> {
  let query = supabase.from('role_permissions').select('*');
  if (roleId) query = query.eq('role_id', roleId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchRoleMetricAccess(roleId?: string): Promise<RoleMetricAccess[]> {
  let query = supabase.from('role_metric_access').select('*');
  if (roleId) query = query.eq('role_id', roleId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchEvaluationSettings(): Promise<EvaluationSettings> {
  const { data, error } = await supabase
    .from('evaluation_settings')
    .select('*')
    .single();
  if (error) throw error;
  return data as EvaluationSettings;
}

export async function fetchBonusSchemes(): Promise<BonusScheme[]> {
  const { data, error } = await supabase
    .from('bonus_schemes')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, role:roles(*), branch:branches(*)')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function fetchDailyFactsForDate(
  branchId: string,
  factDate: string
): Promise<DailyFact[]> {
  const { data, error } = await supabase
    .from('daily_facts')
    .select('*')
    .eq('branch_id', branchId)
    .eq('fact_date', factDate);
  if (error) throw error;
  return data || [];
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogItem[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
