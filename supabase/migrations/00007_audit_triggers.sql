-- Migration 00007_audit_triggers.sql

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (action, entity, entity_id, new_value, user_id)
    VALUES ('insert', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_log (action, entity, entity_id, old_value, new_value, user_id)
      VALUES ('update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (action, entity, entity_id, old_value, user_id)
    VALUES ('delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_user_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'branches', 'departments', 'metrics', 'branch_department_settings', 
      'branch_metric_settings', 'roles', 'role_permissions', 'role_metric_access', 
      'profiles', 'evaluation_settings', 'monthly_plans', 'daily_facts', 
      'bonus_schemes', 'ai_analyses'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;
      CREATE TRIGGER trg_audit_%I
      AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
    ', t, t, t, t);
  END LOOP;
END;
$$;
