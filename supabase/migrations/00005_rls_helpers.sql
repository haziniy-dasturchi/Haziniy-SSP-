-- Migration 00005_rls_helpers.sql

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_owner = true AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT role_id INTO v_role_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;
  RETURN v_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT branch_id INTO v_branch_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;
  RETURN v_branch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_perm(p_module text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_has boolean;
BEGIN
  IF public.is_owner() THEN
    RETURN true;
  END IF;
  
  v_role_id := public.get_user_role_id();
  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_action = 'view' THEN
    SELECT can_view INTO v_has FROM public.role_permissions WHERE role_id = v_role_id AND module = p_module;
  ELSIF p_action = 'create' THEN
    SELECT can_create INTO v_has FROM public.role_permissions WHERE role_id = v_role_id AND module = p_module;
  ELSIF p_action = 'edit' THEN
    SELECT can_edit INTO v_has FROM public.role_permissions WHERE role_id = v_role_id AND module = p_module;
  ELSIF p_action = 'delete' THEN
    SELECT can_delete INTO v_has FROM public.role_permissions WHERE role_id = v_role_id AND module = p_module;
  ELSE
    RETURN false;
  END IF;

  RETURN COALESCE(v_has, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_metric(p_metric_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_has boolean;
BEGIN
  IF public.is_owner() THEN
    RETURN true;
  END IF;

  v_role_id := public.get_user_role_id();
  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT can_view INTO v_has
  FROM public.role_metric_access
  WHERE role_id = v_role_id AND metric_id = p_metric_id;

  RETURN COALESCE(v_has, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_enter_fact(p_metric_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_has boolean;
BEGIN
  IF public.is_owner() THEN
    RETURN true;
  END IF;

  v_role_id := public.get_user_role_id();
  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT can_enter_fact INTO v_has
  FROM public.role_metric_access
  WHERE role_id = v_role_id AND metric_id = p_metric_id;

  RETURN COALESCE(v_has, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.in_branch_scope(p_branch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_branch_scope text;
  v_user_branch_id uuid;
BEGIN
  IF public.is_owner() THEN
    RETURN true;
  END IF;

  v_role_id := public.get_user_role_id();
  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT branch_scope INTO v_branch_scope FROM public.roles WHERE id = v_role_id;
  IF v_branch_scope = 'all' THEN
    RETURN true;
  END IF;

  v_user_branch_id := public.get_user_branch_id();
  RETURN p_branch_id = v_user_branch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_fact_edit_range()
RETURNS TABLE(min_date date, max_date date)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_days int;
  v_today date;
BEGIN
  v_today := (timezone('Asia/Tashkent', now()))::date;
  
  IF public.is_owner() THEN
    RETURN QUERY SELECT '2026-09-01'::date, v_today;
    RETURN;
  END IF;

  SELECT fact_edit_days INTO v_days FROM public.evaluation_settings LIMIT 1;
  v_days := COALESCE(v_days, 0);

  RETURN QUERY SELECT 
    GREATEST('2026-09-01'::date, v_today - v_days), 
    v_today;
END;
$$;
