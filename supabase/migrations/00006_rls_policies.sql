-- Migration 00006_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_department_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_metric_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_metric_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- branches
CREATE POLICY branches_select_policy ON public.branches FOR SELECT TO authenticated USING (public.in_branch_scope(id));
CREATE POLICY branches_insert_policy ON public.branches FOR INSERT TO authenticated WITH CHECK (public.has_perm('branches', 'create'));
CREATE POLICY branches_update_policy ON public.branches FOR UPDATE TO authenticated USING (public.has_perm('branches', 'edit'));
CREATE POLICY branches_delete_policy ON public.branches FOR DELETE TO authenticated USING (public.has_perm('branches', 'delete'));

-- departments
CREATE POLICY departments_select_policy ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY departments_insert_policy ON public.departments FOR INSERT TO authenticated WITH CHECK (public.has_perm('structure', 'create'));
CREATE POLICY departments_update_policy ON public.departments FOR UPDATE TO authenticated USING (public.has_perm('structure', 'edit'));
CREATE POLICY departments_delete_policy ON public.departments FOR DELETE TO authenticated USING (public.has_perm('structure', 'delete'));

-- metrics
CREATE POLICY metrics_select_policy ON public.metrics FOR SELECT TO authenticated USING (public.can_view_metric(id));
CREATE POLICY metrics_insert_policy ON public.metrics FOR INSERT TO authenticated WITH CHECK (public.has_perm('structure', 'create'));
CREATE POLICY metrics_update_policy ON public.metrics FOR UPDATE TO authenticated USING (public.has_perm('structure', 'edit'));
CREATE POLICY metrics_delete_policy ON public.metrics FOR DELETE TO authenticated USING (public.has_perm('structure', 'delete'));

-- branch_department_settings
CREATE POLICY branch_department_settings_select_policy ON public.branch_department_settings FOR SELECT TO authenticated USING (public.in_branch_scope(branch_id));
CREATE POLICY branch_department_settings_insert_policy ON public.branch_department_settings FOR INSERT TO authenticated WITH CHECK (public.has_perm('structure', 'create'));
CREATE POLICY branch_department_settings_update_policy ON public.branch_department_settings FOR UPDATE TO authenticated USING (public.has_perm('structure', 'edit'));
CREATE POLICY branch_department_settings_delete_policy ON public.branch_department_settings FOR DELETE TO authenticated USING (public.has_perm('structure', 'delete'));

-- branch_metric_settings
CREATE POLICY branch_metric_settings_select_policy ON public.branch_metric_settings FOR SELECT TO authenticated USING (public.in_branch_scope(branch_id));
CREATE POLICY branch_metric_settings_insert_policy ON public.branch_metric_settings FOR INSERT TO authenticated WITH CHECK (public.has_perm('structure', 'create'));
CREATE POLICY branch_metric_settings_update_policy ON public.branch_metric_settings FOR UPDATE TO authenticated USING (public.has_perm('structure', 'edit'));
CREATE POLICY branch_metric_settings_delete_policy ON public.branch_metric_settings FOR DELETE TO authenticated USING (public.has_perm('structure', 'delete'));

-- roles
CREATE POLICY roles_select_policy ON public.roles FOR SELECT TO authenticated USING (public.has_perm('roles', 'view'));
CREATE POLICY roles_insert_policy ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_perm('roles', 'create') AND is_system = false);
CREATE POLICY roles_update_policy ON public.roles FOR UPDATE TO authenticated USING (public.has_perm('roles', 'edit') AND is_system = false);
CREATE POLICY roles_delete_policy ON public.roles FOR DELETE TO authenticated USING (public.has_perm('roles', 'delete') AND is_system = false);

-- role_permissions
CREATE POLICY role_permissions_select_policy ON public.role_permissions FOR SELECT TO authenticated USING (public.has_perm('roles', 'view'));
CREATE POLICY role_permissions_insert_policy ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_perm('roles', 'edit'));
CREATE POLICY role_permissions_update_policy ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_perm('roles', 'edit'));
CREATE POLICY role_permissions_delete_policy ON public.role_permissions FOR DELETE TO authenticated USING (public.has_perm('roles', 'edit'));

-- role_metric_access
CREATE POLICY role_metric_access_select_policy ON public.role_metric_access FOR SELECT TO authenticated USING (public.has_perm('roles', 'view'));
CREATE POLICY role_metric_access_insert_policy ON public.role_metric_access FOR INSERT TO authenticated WITH CHECK (public.has_perm('roles', 'edit'));
CREATE POLICY role_metric_access_update_policy ON public.role_metric_access FOR UPDATE TO authenticated USING (public.has_perm('roles', 'edit'));
CREATE POLICY role_metric_access_delete_policy ON public.role_metric_access FOR DELETE TO authenticated USING (public.has_perm('roles', 'edit'));

-- profiles
CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR (public.has_perm('users', 'view') AND public.in_branch_scope(branch_id)));
CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_perm('users', 'create'));
CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR (public.has_perm('users', 'edit') AND public.in_branch_scope(branch_id)));
CREATE POLICY profiles_delete_policy ON public.profiles FOR DELETE TO authenticated USING (public.has_perm('users', 'delete'));

-- evaluation_settings
CREATE POLICY evaluation_settings_select_policy ON public.evaluation_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY evaluation_settings_update_policy ON public.evaluation_settings FOR UPDATE TO authenticated USING (public.has_perm('evaluation', 'edit'));

-- monthly_plans
CREATE POLICY monthly_plans_select_policy ON public.monthly_plans FOR SELECT TO authenticated USING (public.in_branch_scope(branch_id) AND public.can_view_metric(metric_id));
CREATE POLICY monthly_plans_insert_policy ON public.monthly_plans FOR INSERT TO authenticated WITH CHECK (public.in_branch_scope(branch_id) AND public.has_perm('monthly_plans', 'create'));
CREATE POLICY monthly_plans_update_policy ON public.monthly_plans FOR UPDATE TO authenticated USING (public.in_branch_scope(branch_id) AND public.has_perm('monthly_plans', 'edit'));
CREATE POLICY monthly_plans_delete_policy ON public.monthly_plans FOR DELETE TO authenticated USING (public.has_perm('monthly_plans', 'delete'));

-- daily_facts
CREATE POLICY daily_facts_select_policy ON public.daily_facts FOR SELECT TO authenticated USING (public.in_branch_scope(branch_id) AND public.can_view_metric(metric_id));
CREATE POLICY daily_facts_insert_policy ON public.daily_facts FOR INSERT TO authenticated WITH CHECK (
  public.in_branch_scope(branch_id) 
  AND public.can_enter_fact(metric_id) 
  AND public.has_perm('fact_entry', 'create') 
  AND fact_date >= (SELECT min_date FROM public.get_fact_edit_range())
  AND fact_date <= (SELECT max_date FROM public.get_fact_edit_range())
);
CREATE POLICY daily_facts_update_policy ON public.daily_facts FOR UPDATE TO authenticated USING (
  public.in_branch_scope(branch_id) 
  AND public.can_enter_fact(metric_id) 
  AND public.has_perm('fact_entry', 'edit') 
  AND fact_date >= (SELECT min_date FROM public.get_fact_edit_range())
  AND fact_date <= (SELECT max_date FROM public.get_fact_edit_range())
);
CREATE POLICY daily_facts_delete_policy ON public.daily_facts FOR DELETE TO authenticated USING (public.has_perm('fact_entry', 'delete'));

-- bonus_schemes
CREATE POLICY bonus_schemes_select_policy ON public.bonus_schemes FOR SELECT TO authenticated USING (public.has_perm('bonus', 'view'));
CREATE POLICY bonus_schemes_insert_policy ON public.bonus_schemes FOR INSERT TO authenticated WITH CHECK (public.has_perm('bonus', 'edit'));
CREATE POLICY bonus_schemes_update_policy ON public.bonus_schemes FOR UPDATE TO authenticated USING (public.has_perm('bonus', 'edit'));
CREATE POLICY bonus_schemes_delete_policy ON public.bonus_schemes FOR DELETE TO authenticated USING (public.has_perm('bonus', 'edit'));

-- ai_analyses
-- Assumes created_by column exists based on the requirement, or auth.uid() is used
CREATE POLICY ai_analyses_select_policy ON public.ai_analyses FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_perm('ai_analysis', 'view'));
CREATE POLICY ai_analyses_insert_policy ON public.ai_analyses FOR INSERT TO authenticated WITH CHECK (public.has_perm('ai_analysis', 'create'));
CREATE POLICY ai_analyses_delete_policy ON public.ai_analyses FOR DELETE TO authenticated USING (public.has_perm('ai_analysis', 'delete'));

-- audit_log
CREATE POLICY audit_log_select_policy ON public.audit_log FOR SELECT TO authenticated USING (public.has_perm('audit_log', 'view'));
