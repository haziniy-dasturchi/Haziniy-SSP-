export type MetricUnit = 'count' | 'money' | 'percent';
export type MetricAggregation = 'sum' | 'last' | 'avg';
export type MetricDirection = 'higher_better' | 'lower_better';
export type MetricDistribution = 'equal' | 'no_sunday' | 'none';
export type MetricLevel = 'branch' | 'employee';
export type MetricCalcType = 'input' | 'ratio' | 'difference';
export type BranchScope = 'own' | 'all';
export type SSPStatus = 'red' | 'amber' | 'green';

export type PermissionModule =
  | 'ssp'
  | 'fact_entry'
  | 'monthly_plans'
  | 'ai_analysis'
  | 'bonus'
  | 'branches'
  | 'structure'
  | 'roles'
  | 'users'
  | 'evaluation'
  | 'import'
  | 'audit_log';

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Metric {
  id: string;
  department_id: string;
  code: string;
  name: string;
  unit: MetricUnit;
  aggregation: MetricAggregation;
  direction: MetricDirection;
  distribution: MetricDistribution;
  weight: number;
  level: MetricLevel;
  calc_type: MetricCalcType;
  operand_a_id?: string | null;
  operand_b_id?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BranchDepartmentSetting {
  id: string;
  branch_id: string;
  department_id: string;
  weight_override?: number | null;
}

export interface BranchMetricSetting {
  id: string;
  branch_id: string;
  metric_id: string;
  is_enabled: boolean;
  weight_override?: number | null;
}

export interface Role {
  id: string;
  name: string;
  is_system: boolean;
  branch_scope: BranchScope;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module: PermissionModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface RoleMetricAccess {
  id: string;
  role_id: string;
  metric_id: string;
  can_view: boolean;
  can_enter_fact: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role_id?: string | null;
  branch_id?: string | null;
  is_owner: boolean;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
  role?: Role;
  branch?: Branch;
}

export interface EvaluationSettings {
  id: string;
  min_bonus_level: number; // default 0.90
  excellent_level: number; // default 1.00
  cap_level: number;       // default 1.20
  fact_edit_days: number;  // default 1
}

export interface BonusScheme {
  id: string;
  role_id: string;
  base_amount: number;
  department_ids: string[];
}

export interface MonthlyPlan {
  id: string;
  branch_id: string;
  metric_id: string;
  employee_id?: string | null;
  month: string; // YYYY-MM-01
  value: number;
  updated_by?: string | null;
}

export interface DailyFact {
  id: string;
  branch_id: string;
  metric_id: string;
  employee_id?: string | null;
  fact_date: string; // YYYY-MM-DD
  value: number;
  entered_by?: string | null;
  entered_at?: string;
}

export interface AuditLogItem {
  id: string;
  at: string;
  user_id?: string | null;
  action: 'insert' | 'update' | 'delete';
  entity: string;
  entity_id: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  user_profile?: Profile;
}

// SSP Response Types
export interface SSPMetricItem {
  id: string;
  code: string;
  name: string;
  unit: MetricUnit;
  direction: MetricDirection;
  weight: number;
  plan: number | null;
  full_period_plan: number | null;
  fact: number | null;
  diff: number | null;
  pct: number | null;
  status: SSPStatus | null;
}

export interface SSPDepartmentItem {
  id: string;
  name: string;
  weight: number;
  pct: number | null;
  status: SSPStatus | null;
  metrics: SSPMetricItem[];
}

export type SSPDepartment = SSPDepartmentItem;
export type SSPMetric = SSPMetricItem;

export interface SSPResponse {
  period: { from: string; to: string };
  effective_date: string;
  total: { pct: number | null; status: SSPStatus | null };
  departments: SSPDepartmentItem[];
}

// Metric Series
export interface MetricSeriesItem {
  bucket_start: string;
  bucket_label: string;
  plan: number | null;
  fact: number | null;
  pct: number | null;
}

// Bonus Result
export interface BonusResult {
  profile_id?: string;
  month: string;
  score: number;
  coefficient: number;
  base_amount: number;
  bonus: number;
  gap_analysis: Array<{
    metric_code: string;
    metric_name: string;
    pct: number;
    remaining_days: number;
    daily_for_100: number;
    daily_for_90: number;
  }>;
}

// AI Analysis Result
export interface AIAnalysisResult {
  summary: string;
  weakest: Array<{
    metric_code: string;
    pct: number;
    gap: number;
    likely_causes: string[];
  }>;
  recommendations: Array<{
    action: string;
    owner_role: string;
    deadline_days: number;
    expected_effect: string;
  }>;
  strengths: Array<string | { metric_code: string; pct: number }>;
}

export interface AIAnalysisRecord {
  id: string;
  branch_id?: string | null;
  date_from: string;
  date_to: string;
  created_by: string;
  result: AIAnalysisResult;
  model: string;
  created_at: string;
}
