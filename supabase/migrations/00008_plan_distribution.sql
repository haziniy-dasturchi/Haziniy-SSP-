-- Migration 00008: Plan Distribution

SET search_path = public;

CREATE OR REPLACE FUNCTION get_month_week(p_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_day integer := EXTRACT(DAY FROM p_date);
BEGIN
    IF v_day BETWEEN 1 AND 7 THEN RETURN 1;
    ELSIF v_day BETWEEN 8 AND 14 THEN RETURN 2;
    ELSIF v_day BETWEEN 15 AND 21 THEN RETURN 3;
    ELSE RETURN 4;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION daily_plan(
    p_branch uuid,
    p_metric uuid,
    p_from date,
    p_to date,
    p_employee uuid DEFAULT NULL
)
RETURNS TABLE (plan_date date, plan_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metric record;
    v_month_start date;
    v_month_end date;
    v_current_month date;
    v_monthly_plan numeric;
    v_day date;
    v_eligible_days integer;
    v_k integer;
    v_prev_cumulative numeric;
    v_curr_cumulative numeric;
    v_is_eligible boolean;
BEGIN
    SELECT * INTO v_metric FROM metrics WHERE id = p_metric;
    IF v_metric.calc_type != 'input' THEN
        RAISE EXCEPTION 'Hisoblangan metrika uchun kunlik reja mavjud emas';
    END IF;

    v_current_month := date_trunc('month', p_from)::date;

    WHILE v_current_month <= p_to LOOP
        v_month_start := v_current_month;
        v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

        SELECT value INTO v_monthly_plan
        FROM monthly_plans
        WHERE branch_id = p_branch
          AND metric_id = p_metric
          AND month = v_month_start
          AND employee_id IS NOT DISTINCT FROM p_employee;

        IF v_monthly_plan IS NULL THEN
            FOR v_day IN 
                SELECT d::date FROM generate_series(GREATEST(v_month_start, p_from), LEAST(v_month_end, p_to), '1 day'::interval) d
            LOOP
                plan_date := v_day;
                plan_value := NULL;
                RETURN NEXT;
            END LOOP;
        ELSE
            IF v_metric.distribution = 'none' OR v_metric.unit = 'percent' THEN
                FOR v_day IN 
                    SELECT d::date FROM generate_series(GREATEST(v_month_start, p_from), LEAST(v_month_end, p_to), '1 day'::interval) d
                LOOP
                    plan_date := v_day;
                    plan_value := v_monthly_plan;
                    RETURN NEXT;
                END LOOP;
            ELSE
                IF v_metric.distribution = 'no_sunday' THEN
                    SELECT count(*) INTO v_eligible_days
                    FROM generate_series(v_month_start, v_month_end, '1 day'::interval) d
                    WHERE EXTRACT(ISODOW FROM d) != 7;
                ELSE
                    v_eligible_days := (v_month_end - v_month_start) + 1;
                END IF;

                v_k := 0;
                FOR v_day IN 
                    SELECT d::date FROM generate_series(v_month_start, v_month_end, '1 day'::interval) d
                LOOP
                    IF v_metric.distribution = 'no_sunday' AND EXTRACT(ISODOW FROM v_day) = 7 THEN
                        v_is_eligible := false;
                    ELSE
                        v_is_eligible := true;
                    END IF;

                    IF v_is_eligible THEN
                        v_k := v_k + 1;
                        IF v_metric.unit = 'money' THEN
                            v_curr_cumulative := round(v_monthly_plan * v_k / v_eligible_days, -3);
                            v_prev_cumulative := round(v_monthly_plan * (v_k - 1) / v_eligible_days, -3);
                        ELSE
                            v_curr_cumulative := floor(v_monthly_plan * v_k / v_eligible_days);
                            v_prev_cumulative := floor(v_monthly_plan * (v_k - 1) / v_eligible_days);
                        END IF;
                        
                        IF v_day >= p_from AND v_day <= p_to THEN
                            plan_date := v_day;
                            plan_value := v_curr_cumulative - v_prev_cumulative;
                            RETURN NEXT;
                        END IF;
                    ELSE
                        IF v_day >= p_from AND v_day <= p_to THEN
                            plan_date := v_day;
                            plan_value := 0;
                            RETURN NEXT;
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        v_current_month := (v_month_start + interval '1 month')::date;
    END LOOP;
END;
$$;
