-- Migration 00011: Bulk Input RPCs

SET search_path = public;

-- =============================================================================
-- upsert_monthly_plans
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_monthly_plans(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row       record;
    v_inserted  integer := 0;
    v_updated   integer := 0;
    v_errors    jsonb := '[]'::jsonb;
    v_idx       integer;
    v_metric    record;
    v_month     date;
    v_branch_id uuid;
    v_metric_id uuid;
    v_emp_id    uuid;
    v_value     numeric;
    v_existing  uuid;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) WITH ORDINALITY a(elem, nr) LOOP
        v_idx := v_row.nr::integer;

        BEGIN
            -- Parse fields
            v_branch_id := (v_row.elem->>'branch_id')::uuid;
            v_metric_id := (v_row.elem->>'metric_id')::uuid;
            v_emp_id := NULLIF(v_row.elem->>'employee_id', '')::uuid;
            v_month := (v_row.elem->>'month')::date;
            v_value := (v_row.elem->>'value')::numeric;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Noto''g''ri ma''lumot formati');
            CONTINUE;
        END;

        -- Validate month
        IF v_month < '2026-09-01'::date THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sana 2026-09-01 dan katta bo''lishi kerak');
            CONTINUE;
        END IF;
        IF v_month != date_trunc('month', v_month)::date THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sana oyning birinchi kuni bo''lishi kerak');
            CONTINUE;
        END IF;

        -- Branch in scope
        IF NOT EXISTS (SELECT 1 FROM branches WHERE id = v_branch_id AND is_active = true) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Filial topilmadi');
            CONTINUE;
        END IF;
        IF NOT in_branch_scope(v_branch_id) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sizda bu filial uchun ruxsat yo''q');
            CONTINUE;
        END IF;

        -- Metric validation
        SELECT * INTO v_metric FROM metrics WHERE id = v_metric_id;
        IF NOT FOUND THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Metrika topilmadi');
            CONTINUE;
        END IF;
        IF v_metric.calc_type != 'input' THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Faqat kiritiladigan metrikalar uchun reja kiritish mumkin');
            CONTINUE;
        END IF;

        -- Permission check
        IF NOT has_perm('monthly_plans', 'create') THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sizda reja kiritish huquqi yo''q');
            CONTINUE;
        END IF;

        -- Check if existing
        SELECT id INTO v_existing FROM monthly_plans
        WHERE branch_id = v_branch_id AND metric_id = v_metric_id
          AND month = v_month
          AND employee_id IS NOT DISTINCT FROM v_emp_id;

        IF v_existing IS NOT NULL THEN
            UPDATE monthly_plans SET value = v_value, updated_by = auth.uid()
            WHERE id = v_existing;
            v_updated := v_updated + 1;
        ELSE
            INSERT INTO monthly_plans (branch_id, metric_id, employee_id, month, value, updated_by)
            VALUES (v_branch_id, v_metric_id, v_emp_id, v_month, v_value, auth.uid());
            v_inserted := v_inserted + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'errors', v_errors);
END;
$$;

-- =============================================================================
-- upsert_daily_facts
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_daily_facts(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row       record;
    v_inserted  integer := 0;
    v_updated   integer := 0;
    v_errors    jsonb := '[]'::jsonb;
    v_idx       integer;
    v_metric    record;
    v_branch_id uuid;
    v_metric_id uuid;
    v_emp_id    uuid;
    v_fact_date date;
    v_value     numeric;
    v_min_date  date;
    v_max_date  date;
    v_existing  uuid;
BEGIN
    -- Get allowed date range for the caller
    SELECT fer.min_date, fer.max_date INTO v_min_date, v_max_date FROM get_fact_edit_range() fer;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) WITH ORDINALITY a(elem, nr) LOOP
        v_idx := v_row.nr::integer;

        BEGIN
            v_branch_id := (v_row.elem->>'branch_id')::uuid;
            v_metric_id := (v_row.elem->>'metric_id')::uuid;
            v_emp_id := NULLIF(v_row.elem->>'employee_id', '')::uuid;
            v_fact_date := (v_row.elem->>'fact_date')::date;
            v_value := (v_row.elem->>'value')::numeric;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Noto''g''ri ma''lumot formati');
            CONTINUE;
        END;

        -- Validate date
        IF v_fact_date < '2026-09-01'::date THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sana 2026-09-01 dan katta bo''lishi kerak');
            CONTINUE;
        END IF;
        IF v_fact_date NOT BETWEEN v_min_date AND v_max_date THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Bu sana uchun fakt kiritish mumkin emas');
            CONTINUE;
        END IF;

        -- Branch
        IF NOT EXISTS (SELECT 1 FROM branches WHERE id = v_branch_id AND is_active = true) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Filial topilmadi');
            CONTINUE;
        END IF;
        IF NOT in_branch_scope(v_branch_id) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sizda bu filial uchun ruxsat yo''q');
            CONTINUE;
        END IF;

        -- Metric
        SELECT * INTO v_metric FROM metrics WHERE id = v_metric_id;
        IF NOT FOUND THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Metrika topilmadi');
            CONTINUE;
        END IF;
        IF v_metric.calc_type != 'input' THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Faqat kiritiladigan metrikalar uchun fakt kiritish mumkin');
            CONTINUE;
        END IF;
        IF NOT can_enter_fact(v_metric_id) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'message', 'Sizda bu metrika uchun fakt kiritish huquqi yo''q');
            CONTINUE;
        END IF;

        -- Upsert
        SELECT id INTO v_existing FROM daily_facts
        WHERE branch_id = v_branch_id AND metric_id = v_metric_id
          AND fact_date = v_fact_date
          AND employee_id IS NOT DISTINCT FROM v_emp_id;

        IF v_existing IS NOT NULL THEN
            UPDATE daily_facts SET value = v_value, entered_by = auth.uid(), entered_at = now()
            WHERE id = v_existing;
            v_updated := v_updated + 1;
        ELSE
            INSERT INTO daily_facts (branch_id, metric_id, employee_id, fact_date, value, entered_by, entered_at)
            VALUES (v_branch_id, v_metric_id, v_emp_id, v_fact_date, v_value, auth.uid(), now());
            v_inserted := v_inserted + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'errors', v_errors);
END;
$$;

-- =============================================================================
-- copy_month_plans
-- =============================================================================
CREATE OR REPLACE FUNCTION copy_month_plans(
    p_branch uuid,
    p_from_month date,
    p_to_month date,
    p_growth_pct numeric DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer := 0;
    v_plan record;
    v_existing uuid;
BEGIN
    -- Validate
    IF NOT in_branch_scope(p_branch) THEN
        RAISE EXCEPTION 'Sizda bu filial uchun ruxsat yo''q';
    END IF;
    IF NOT has_perm('monthly_plans', 'create') THEN
        RAISE EXCEPTION 'Sizda reja kiritish huquqi yo''q';
    END IF;
    IF p_to_month < '2026-09-01' THEN
        RAISE EXCEPTION 'Sana 2026-09-01 dan katta bo''lishi kerak';
    END IF;

    FOR v_plan IN
        SELECT branch_id, metric_id, employee_id, value
        FROM monthly_plans
        WHERE branch_id = p_branch AND month = p_from_month
    LOOP
        SELECT id INTO v_existing FROM monthly_plans
        WHERE branch_id = v_plan.branch_id
          AND metric_id = v_plan.metric_id
          AND month = p_to_month
          AND employee_id IS NOT DISTINCT FROM v_plan.employee_id;

        IF v_existing IS NOT NULL THEN
            UPDATE monthly_plans
            SET value = v_plan.value * (1 + p_growth_pct / 100.0),
                updated_by = auth.uid()
            WHERE id = v_existing;
        ELSE
            INSERT INTO monthly_plans (branch_id, metric_id, employee_id, month, value, updated_by)
            VALUES (v_plan.branch_id, v_plan.metric_id, v_plan.employee_id, p_to_month,
                    v_plan.value * (1 + p_growth_pct / 100.0), auth.uid());
        END IF;
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
