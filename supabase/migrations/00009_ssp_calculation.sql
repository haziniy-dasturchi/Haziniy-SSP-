-- Migration 00009: SSP Calculation (complete implementation)

SET search_path = public;

-- =============================================================================
-- get_ssp: Core Balanced Scorecard calculation
-- =============================================================================
CREATE OR REPLACE FUNCTION get_ssp(
    p_branch uuid DEFAULT NULL,
    p_from date DEFAULT CURRENT_DATE,
    p_to date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_settings      record;
    v_dept          record;
    v_metric        record;
    v_calc_metric   record;
    v_departments   jsonb := '[]'::jsonb;
    v_metrics_arr   jsonb;
    v_dept_pct      numeric;
    v_dept_weight_sum numeric;
    v_total_pct     numeric := 0;
    v_total_weight_sum numeric := 0;
    v_total_status  text;
    v_eff_date      date;
    v_fact          numeric;
    v_plan          numeric;
    v_full_plan     numeric;
    v_pct           numeric;
    v_status        text;
    v_metric_weight numeric;
    v_branches      uuid[];
BEGIN
    -- Load evaluation settings
    SELECT * INTO v_settings FROM evaluation_settings LIMIT 1;

    -- Determine branches in scope
    IF p_branch IS NOT NULL THEN
        v_branches := ARRAY[p_branch];
    ELSE
        SELECT array_agg(id) INTO v_branches FROM branches WHERE is_active = true;
    END IF;

    -- Global effective date: latest fact_date across all branches in period
    SELECT MAX(fact_date) INTO v_eff_date
    FROM daily_facts
    WHERE fact_date BETWEEN p_from AND p_to
      AND branch_id = ANY(v_branches);

    IF v_eff_date IS NULL THEN
        v_eff_date := p_from - 1;
    END IF;

    -- Process each active department
    FOR v_dept IN
        SELECT d.id, d.name, d.sort_order,
               dw.effective_weight AS weight
        FROM departments d
        JOIN get_effective_dept_weights(COALESCE(p_branch, v_branches[1])) dw ON dw.department_id = d.id
        WHERE d.is_active = true
        ORDER BY d.sort_order
    LOOP
        v_metrics_arr := '[]'::jsonb;
        v_dept_pct := 0;
        v_dept_weight_sum := 0;

        -- Process input metrics for this department
        FOR v_metric IN
            SELECT m.id, m.code, m.name, m.unit::text, m.aggregation::text,
                   m.direction::text, m.distribution::text, m.calc_type::text,
                   m.operand_a_id, m.operand_b_id,
                   mw.effective_weight AS weight
            FROM metrics m
            JOIN get_effective_metric_weights(COALESCE(p_branch, v_branches[1]), v_dept.id) mw ON mw.metric_id = m.id
            WHERE m.department_id = v_dept.id
              AND m.is_active = true
            ORDER BY m.sort_order
        LOOP
            v_fact := NULL;
            v_plan := NULL;
            v_full_plan := NULL;
            v_pct := NULL;

            IF v_metric.calc_type = 'input' THEN
                -- =============== FACT ===============
                IF v_metric.aggregation = 'sum' THEN
                    SELECT COALESCE(SUM(value), 0) INTO v_fact
                    FROM daily_facts
                    WHERE metric_id = v_metric.id
                      AND branch_id = ANY(v_branches)
                      AND fact_date BETWEEN p_from AND p_to;
                ELSIF v_metric.aggregation = 'last' THEN
                    -- For multi-branch: sum of each branch's latest value
                    SELECT COALESCE(SUM(latest_val), 0) INTO v_fact
                    FROM (
                        SELECT DISTINCT ON (branch_id) value AS latest_val
                        FROM daily_facts
                        WHERE metric_id = v_metric.id
                          AND branch_id = ANY(v_branches)
                          AND fact_date BETWEEN p_from AND p_to
                        ORDER BY branch_id, fact_date DESC
                    ) sub;
                ELSIF v_metric.aggregation = 'avg' THEN
                    SELECT COALESCE(AVG(value), 0) INTO v_fact
                    FROM daily_facts
                    WHERE metric_id = v_metric.id
                      AND branch_id = ANY(v_branches)
                      AND fact_date BETWEEN p_from AND p_to;
                END IF;

                -- =============== PLAN TO DATE ===============
                IF v_eff_date >= p_from THEN
                    IF v_metric.aggregation = 'sum' THEN
                        SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_plan
                        FROM unnest(v_branches) b(bid)
                        CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_from, v_eff_date) dp
                        WHERE dp.plan_value IS NOT NULL;
                        -- Check if ANY plan is null (meaning no monthly plan)
                        IF NOT EXISTS (
                            SELECT 1 FROM unnest(v_branches) b(bid)
                            CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_from, v_eff_date) dp
                            WHERE dp.plan_value IS NOT NULL
                        ) THEN
                            v_plan := NULL;
                        END IF;
                    ELSIF v_metric.aggregation = 'last' THEN
                        SELECT SUM(pv) INTO v_plan
                        FROM (
                            SELECT dp.plan_value AS pv
                            FROM unnest(v_branches) b(bid)
                            CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, v_eff_date, v_eff_date) dp
                        ) sub;
                    ELSIF v_metric.aggregation = 'avg' THEN
                        SELECT AVG(dp.plan_value) INTO v_plan
                        FROM unnest(v_branches) b(bid)
                        CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_from, v_eff_date) dp
                        WHERE dp.plan_value IS NOT NULL;
                    END IF;
                END IF;

                -- =============== FULL PERIOD PLAN ===============
                IF v_metric.aggregation = 'sum' THEN
                    SELECT COALESCE(SUM(dp.plan_value), NULL) INTO v_full_plan
                    FROM unnest(v_branches) b(bid)
                    CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_from, p_to) dp
                    WHERE dp.plan_value IS NOT NULL;
                ELSIF v_metric.aggregation = 'last' THEN
                    SELECT SUM(pv) INTO v_full_plan
                    FROM (
                        SELECT dp.plan_value AS pv
                        FROM unnest(v_branches) b(bid)
                        CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_to, p_to) dp
                    ) sub;
                ELSIF v_metric.aggregation = 'avg' THEN
                    SELECT AVG(dp.plan_value) INTO v_full_plan
                    FROM unnest(v_branches) b(bid)
                    CROSS JOIN LATERAL daily_plan(b.bid, v_metric.id, p_from, p_to) dp
                    WHERE dp.plan_value IS NOT NULL;
                END IF;

            ELSIF v_metric.calc_type IN ('ratio', 'difference') THEN
                -- Calculated metrics: get operand facts and plans
                DECLARE
                    v_fact_a numeric; v_fact_b numeric;
                    v_plan_a numeric; v_plan_b numeric;
                    v_full_a numeric; v_full_b numeric;
                    v_op_a record; v_op_b record;
                BEGIN
                    SELECT * INTO v_op_a FROM metrics WHERE id = v_metric.operand_a_id;
                    SELECT * INTO v_op_b FROM metrics WHERE id = v_metric.operand_b_id;

                    -- Operand A fact
                    IF v_op_a.aggregation = 'sum' THEN
                        SELECT COALESCE(SUM(value), 0) INTO v_fact_a FROM daily_facts
                        WHERE metric_id = v_op_a.id AND branch_id = ANY(v_branches)
                          AND fact_date BETWEEN p_from AND p_to;
                    ELSIF v_op_a.aggregation = 'last' THEN
                        SELECT COALESCE(SUM(lv), 0) INTO v_fact_a FROM (
                            SELECT DISTINCT ON (branch_id) value AS lv FROM daily_facts
                            WHERE metric_id = v_op_a.id AND branch_id = ANY(v_branches)
                              AND fact_date BETWEEN p_from AND p_to
                            ORDER BY branch_id, fact_date DESC
                        ) s;
                    ELSE
                        SELECT COALESCE(AVG(value), 0) INTO v_fact_a FROM daily_facts
                        WHERE metric_id = v_op_a.id AND branch_id = ANY(v_branches)
                          AND fact_date BETWEEN p_from AND p_to;
                    END IF;

                    -- Operand B fact
                    IF v_op_b.aggregation = 'sum' THEN
                        SELECT COALESCE(SUM(value), 0) INTO v_fact_b FROM daily_facts
                        WHERE metric_id = v_op_b.id AND branch_id = ANY(v_branches)
                          AND fact_date BETWEEN p_from AND p_to;
                    ELSIF v_op_b.aggregation = 'last' THEN
                        SELECT COALESCE(SUM(lv), 0) INTO v_fact_b FROM (
                            SELECT DISTINCT ON (branch_id) value AS lv FROM daily_facts
                            WHERE metric_id = v_op_b.id AND branch_id = ANY(v_branches)
                              AND fact_date BETWEEN p_from AND p_to
                            ORDER BY branch_id, fact_date DESC
                        ) s;
                    ELSE
                        SELECT COALESCE(AVG(value), 0) INTO v_fact_b FROM daily_facts
                        WHERE metric_id = v_op_b.id AND branch_id = ANY(v_branches)
                          AND fact_date BETWEEN p_from AND p_to;
                    END IF;

                    -- Operand plans (to date)
                    IF v_eff_date >= p_from THEN
                        SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_plan_a
                        FROM unnest(v_branches) b(bid)
                        CROSS JOIN LATERAL daily_plan(b.bid, v_op_a.id, p_from, v_eff_date) dp
                        WHERE dp.plan_value IS NOT NULL;

                        SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_plan_b
                        FROM unnest(v_branches) b(bid)
                        CROSS JOIN LATERAL daily_plan(b.bid, v_op_b.id, p_from, v_eff_date) dp
                        WHERE dp.plan_value IS NOT NULL;
                    END IF;

                    -- Full period plans
                    SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_full_a
                    FROM unnest(v_branches) b(bid)
                    CROSS JOIN LATERAL daily_plan(b.bid, v_op_a.id, p_from, p_to) dp
                    WHERE dp.plan_value IS NOT NULL;

                    SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_full_b
                    FROM unnest(v_branches) b(bid)
                    CROSS JOIN LATERAL daily_plan(b.bid, v_op_b.id, p_from, p_to) dp
                    WHERE dp.plan_value IS NOT NULL;

                    IF v_metric.calc_type = 'ratio' THEN
                        v_fact := v_fact_a / NULLIF(v_fact_b, 0);
                        v_plan := v_plan_a / NULLIF(v_plan_b, 0);
                        v_full_plan := v_full_a / NULLIF(v_full_b, 0);
                    ELSE -- difference
                        v_fact := v_fact_a - v_fact_b;
                        v_plan := v_plan_a - v_plan_b;
                        v_full_plan := v_full_a - v_full_b;
                    END IF;
                END;
            END IF;

            -- =============== FULFILMENT ===============
            IF v_plan IS NOT NULL AND v_plan != 0 THEN
                IF v_metric.direction = 'higher_better' THEN
                    v_pct := v_fact / v_plan;
                ELSE -- lower_better
                    IF v_fact = 0 AND v_plan > 0 THEN
                        v_pct := v_settings.cap_level;
                    ELSIF v_fact > 0 THEN
                        v_pct := v_plan / v_fact;
                    ELSE
                        v_pct := NULL;
                    END IF;
                END IF;
                -- Cap at cap_level
                IF v_pct IS NOT NULL AND v_pct > v_settings.cap_level THEN
                    v_pct := v_settings.cap_level;
                END IF;
            END IF;

            -- Status
            IF v_pct IS NOT NULL THEN
                IF v_pct < v_settings.min_bonus_level THEN
                    v_status := 'red';
                ELSIF v_pct < v_settings.excellent_level THEN
                    v_status := 'amber';
                ELSE
                    v_status := 'green';
                END IF;
            ELSE
                v_status := NULL;
            END IF;

            -- Add to department weighted average
            v_metric_weight := v_metric.weight;
            IF v_pct IS NOT NULL THEN
                v_dept_pct := v_dept_pct + v_metric_weight * v_pct;
                v_dept_weight_sum := v_dept_weight_sum + v_metric_weight;
            END IF;

            -- Append metric to array
            v_metrics_arr := v_metrics_arr || jsonb_build_object(
                'id', v_metric.id,
                'code', v_metric.code,
                'name', v_metric.name,
                'unit', v_metric.unit,
                'direction', v_metric.direction,
                'weight', v_metric_weight,
                'plan', v_plan,
                'full_period_plan', v_full_plan,
                'fact', v_fact,
                'diff', CASE WHEN v_fact IS NOT NULL AND v_plan IS NOT NULL THEN v_fact - v_plan ELSE NULL END,
                'pct', ROUND(v_pct, 4),
                'status', v_status
            );
        END LOOP; -- metrics

        -- Department aggregate
        IF v_dept_weight_sum > 0 THEN
            v_dept_pct := v_dept_pct / v_dept_weight_sum;
        ELSE
            v_dept_pct := NULL;
        END IF;

        -- Department status
        IF v_dept_pct IS NOT NULL THEN
            IF v_dept_pct < v_settings.min_bonus_level THEN
                v_status := 'red';
            ELSIF v_dept_pct < v_settings.excellent_level THEN
                v_status := 'amber';
            ELSE
                v_status := 'green';
            END IF;
        ELSE
            v_status := NULL;
        END IF;

        -- Add to total weighted average (only departments with weight > 0)
        IF v_dept.weight > 0 AND v_dept_pct IS NOT NULL THEN
            v_total_pct := v_total_pct + v_dept.weight * v_dept_pct;
            v_total_weight_sum := v_total_weight_sum + v_dept.weight;
        END IF;

        v_departments := v_departments || jsonb_build_object(
            'id', v_dept.id,
            'name', v_dept.name,
            'weight', ROUND(v_dept.weight, 4),
            'pct', ROUND(v_dept_pct, 4),
            'status', v_status,
            'metrics', v_metrics_arr
        );
    END LOOP; -- departments

    -- Total
    IF v_total_weight_sum > 0 THEN
        v_total_pct := v_total_pct / v_total_weight_sum;
    ELSE
        v_total_pct := NULL;
    END IF;

    IF v_total_pct IS NOT NULL THEN
        IF v_total_pct < v_settings.min_bonus_level THEN
            v_total_status := 'red';
        ELSIF v_total_pct < v_settings.excellent_level THEN
            v_total_status := 'amber';
        ELSE
            v_total_status := 'green';
        END IF;
    ELSE
        v_total_status := NULL;
    END IF;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('from', p_from, 'to', p_to),
        'effective_date', v_eff_date,
        'total', jsonb_build_object('pct', ROUND(v_total_pct, 4), 'status', v_total_status),
        'departments', v_departments
    );
END;
$$;

-- =============================================================================
-- get_metric_series: time-series data for a single metric
-- =============================================================================
CREATE OR REPLACE FUNCTION get_metric_series(
    p_branch uuid,
    p_metric uuid,
    p_from date,
    p_to date,
    p_grain text DEFAULT 'day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_metric    record;
    v_result    jsonb := '[]'::jsonb;
    v_bucket    record;
    v_fact      numeric;
    v_plan      numeric;
    v_pct       numeric;
    v_settings  record;
BEGIN
    SELECT * INTO v_metric FROM metrics WHERE id = p_metric;
    SELECT * INTO v_settings FROM evaluation_settings LIMIT 1;

    IF v_metric.calc_type != 'input' THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Generate buckets
    FOR v_bucket IN
        SELECT
            bucket_start,
            bucket_end,
            bucket_label
        FROM (
            SELECT
                d::date AS bucket_start,
                d::date AS bucket_end,
                to_char(d, 'YYYY-MM-DD') AS bucket_label
            FROM generate_series(p_from, p_to, '1 day'::interval) d
            WHERE p_grain = 'day'

            UNION ALL

            SELECT
                gs::date AS bucket_start,
                LEAST(gs::date + 6, p_to) AS bucket_end,
                'W' || to_char(gs, 'IW') AS bucket_label
            FROM generate_series(
                p_from - ((EXTRACT(ISODOW FROM p_from)::int - 1) || ' days')::interval,
                p_to,
                '7 days'::interval
            ) gs
            WHERE p_grain = 'week'
              AND gs::date <= p_to
              AND GREATEST(gs::date, p_from) <= LEAST(gs::date + 6, p_to)

            UNION ALL

            SELECT
                make_date(EXTRACT(YEAR FROM m)::int, EXTRACT(MONTH FROM m)::int, d_start) AS bucket_start,
                LEAST(
                    make_date(EXTRACT(YEAR FROM m)::int, EXTRACT(MONTH FROM m)::int,
                        CASE WHEN d_start = 22
                             THEN EXTRACT(DAY FROM (m + interval '1 month' - interval '1 day'))::int
                             ELSE d_start + 6
                        END),
                    p_to
                ) AS bucket_end,
                to_char(m, 'YYYY-MM') || '-W' || w::text AS bucket_label
            FROM generate_series(
                date_trunc('month', p_from)::date,
                date_trunc('month', p_to)::date,
                '1 month'::interval
            ) m,
            LATERAL (VALUES (1,1),(2,8),(3,15),(4,22)) AS weeks(w, d_start)
            WHERE p_grain = 'month_week'
              AND make_date(EXTRACT(YEAR FROM m)::int, EXTRACT(MONTH FROM m)::int, d_start) <= p_to

            UNION ALL

            SELECT
                gs::date AS bucket_start,
                (gs + interval '1 month' - interval '1 day')::date AS bucket_end,
                to_char(gs, 'YYYY-MM') AS bucket_label
            FROM generate_series(
                date_trunc('month', p_from),
                date_trunc('month', p_to),
                '1 month'::interval
            ) gs
            WHERE p_grain = 'month'
        ) buckets
        ORDER BY bucket_start
    LOOP
        -- Fact
        IF v_metric.aggregation = 'sum' THEN
            SELECT COALESCE(SUM(value), 0) INTO v_fact FROM daily_facts
            WHERE metric_id = p_metric AND branch_id = p_branch
              AND fact_date BETWEEN GREATEST(v_bucket.bucket_start, p_from) AND LEAST(v_bucket.bucket_end, p_to);
        ELSIF v_metric.aggregation = 'last' THEN
            SELECT value INTO v_fact FROM daily_facts
            WHERE metric_id = p_metric AND branch_id = p_branch
              AND fact_date BETWEEN GREATEST(v_bucket.bucket_start, p_from) AND LEAST(v_bucket.bucket_end, p_to)
            ORDER BY fact_date DESC LIMIT 1;
            v_fact := COALESCE(v_fact, 0);
        ELSE -- avg
            SELECT COALESCE(AVG(value), 0) INTO v_fact FROM daily_facts
            WHERE metric_id = p_metric AND branch_id = p_branch
              AND fact_date BETWEEN GREATEST(v_bucket.bucket_start, p_from) AND LEAST(v_bucket.bucket_end, p_to);
        END IF;

        -- Plan
        IF v_metric.aggregation = 'sum' THEN
            SELECT COALESCE(SUM(dp.plan_value), 0) INTO v_plan
            FROM daily_plan(p_branch, p_metric, GREATEST(v_bucket.bucket_start, p_from), LEAST(v_bucket.bucket_end, p_to)) dp
            WHERE dp.plan_value IS NOT NULL;
        ELSIF v_metric.aggregation = 'last' THEN
            SELECT dp.plan_value INTO v_plan
            FROM daily_plan(p_branch, p_metric, GREATEST(v_bucket.bucket_start, p_from), LEAST(v_bucket.bucket_end, p_to)) dp
            WHERE dp.plan_value IS NOT NULL
            ORDER BY dp.plan_date DESC LIMIT 1;
            v_plan := COALESCE(v_plan, 0);
        ELSE
            SELECT COALESCE(AVG(dp.plan_value), 0) INTO v_plan
            FROM daily_plan(p_branch, p_metric, GREATEST(v_bucket.bucket_start, p_from), LEAST(v_bucket.bucket_end, p_to)) dp
            WHERE dp.plan_value IS NOT NULL;
        END IF;

        -- Pct
        v_pct := NULL;
        IF v_plan IS NOT NULL AND v_plan != 0 THEN
            IF v_metric.direction = 'higher_better' THEN
                v_pct := v_fact / v_plan;
            ELSE
                IF v_fact = 0 AND v_plan > 0 THEN
                    v_pct := v_settings.cap_level;
                ELSIF v_fact > 0 THEN
                    v_pct := v_plan / v_fact;
                END IF;
            END IF;
            IF v_pct IS NOT NULL AND v_pct > v_settings.cap_level THEN
                v_pct := v_settings.cap_level;
            END IF;
        END IF;

        v_result := v_result || jsonb_build_object(
            'bucket_start', v_bucket.bucket_start,
            'bucket_label', v_bucket.bucket_label,
            'plan', v_plan,
            'fact', v_fact,
            'pct', ROUND(v_pct, 4)
        );
    END LOOP;

    RETURN v_result;
END;
$$;

-- =============================================================================
-- get_monthly_plan_grid: 12-month plan editor grid
-- =============================================================================
CREATE OR REPLACE FUNCTION get_monthly_plan_grid(p_branch uuid, p_year_start date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    v_metric record;
    v_months jsonb;
    v_month date;
    v_val numeric;
BEGIN
    FOR v_metric IN
        SELECT m.id, m.code, m.name, d.name AS department_name
        FROM metrics m
        JOIN departments d ON d.id = m.department_id
        WHERE m.is_active = true AND m.calc_type = 'input'
        ORDER BY d.sort_order, m.sort_order
    LOOP
        v_months := '[]'::jsonb;
        FOR i IN 0..11 LOOP
            v_month := p_year_start + (i || ' months')::interval;
            SELECT mp.value INTO v_val
            FROM monthly_plans mp
            WHERE mp.branch_id = p_branch
              AND mp.metric_id = v_metric.id
              AND mp.employee_id IS NULL
              AND mp.month = v_month;

            v_months := v_months || jsonb_build_object(
                'month', v_month,
                'value', v_val
            );
        END LOOP;

        v_result := v_result || jsonb_build_object(
            'metric_id', v_metric.id,
            'metric_code', v_metric.code,
            'metric_name', v_metric.name,
            'department', v_metric.department_name,
            'months', v_months
        );
    END LOOP;

    RETURN v_result;
END;
$$;
