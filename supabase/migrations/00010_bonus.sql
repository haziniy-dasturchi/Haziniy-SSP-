-- Migration 00010: Bonus Calculation (complete implementation)

SET search_path = public;

CREATE OR REPLACE FUNCTION get_bonus(p_profile_id uuid, p_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_profile       record;
    v_scheme        record;
    v_settings      record;
    v_ssp           jsonb;
    v_month_start   date;
    v_month_end     date;
    v_today         date;
    v_eff_end       date;
    v_score         numeric := 0;
    v_weight_sum    numeric := 0;
    v_coefficient   numeric;
    v_bonus         integer;
    v_gap           jsonb := '[]'::jsonb;
    v_dept          record;
    v_met           record;
    v_remaining     integer;
    v_daily_100     numeric;
    v_daily_90      numeric;
    v_dept_ids      uuid[];
BEGIN
    -- Validate month
    v_month_start := date_trunc('month', p_month)::date;
    v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
    v_today := (timezone('Asia/Tashkent', now()))::date;
    v_eff_end := LEAST(v_today, v_month_end);

    -- Get profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Profil topilmadi');
    END IF;

    -- Get bonus scheme
    SELECT * INTO v_scheme FROM bonus_schemes WHERE role_id = v_profile.role_id LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'profile_id', p_profile_id,
            'month', v_month_start,
            'score', 0,
            'coefficient', 0,
            'base_amount', 0,
            'bonus', 0,
            'gap_analysis', '[]'::jsonb
        );
    END IF;

    -- Get settings
    SELECT * INTO v_settings FROM evaluation_settings LIMIT 1;

    -- Get SSP for the branch and month
    v_ssp := get_ssp(v_profile.branch_id, v_month_start, v_eff_end);

    -- Extract department filter
    v_dept_ids := v_scheme.department_ids;

    -- Calculate score from relevant departments
    FOR v_dept IN
        SELECT * FROM jsonb_array_elements(v_ssp->'departments') d
    LOOP
        -- Skip departments not in the scheme (if filter is non-empty)
        IF array_length(v_dept_ids, 1) IS NOT NULL AND array_length(v_dept_ids, 1) > 0 THEN
            IF NOT (v_dept.value->>'id')::uuid = ANY(v_dept_ids) THEN
                CONTINUE;
            END IF;
        END IF;

        -- Only departments with weight > 0
        IF (v_dept.value->>'weight')::numeric > 0 AND v_dept.value->>'pct' IS NOT NULL THEN
            v_score := v_score + (v_dept.value->>'weight')::numeric * (v_dept.value->>'pct')::numeric;
            v_weight_sum := v_weight_sum + (v_dept.value->>'weight')::numeric;
        END IF;

        -- Gap analysis for each metric
        FOR v_met IN
            SELECT * FROM jsonb_array_elements(v_dept.value->'metrics') m
        LOOP
            IF v_met.value->>'pct' IS NOT NULL AND (v_met.value->>'pct')::numeric < 1.0 THEN
                -- Count remaining eligible days
                SELECT count(*) INTO v_remaining
                FROM generate_series(v_today + 1, v_month_end, '1 day'::interval) d
                WHERE CASE
                    WHEN EXISTS (
                        SELECT 1 FROM metrics
                        WHERE id = (v_met.value->>'id')::uuid
                          AND distribution = 'no_sunday'
                    ) THEN EXTRACT(ISODOW FROM d) != 7
                    ELSE true
                END;

                IF v_remaining > 0 THEN
                    -- full_period_plan - fact = gap for 100%
                    IF v_met.value->>'full_period_plan' IS NOT NULL AND v_met.value->>'fact' IS NOT NULL THEN
                        v_daily_100 := GREATEST(0,
                            ((v_met.value->>'full_period_plan')::numeric - (v_met.value->>'fact')::numeric)
                            / v_remaining
                        );
                        v_daily_90 := GREATEST(0,
                            ((v_met.value->>'full_period_plan')::numeric * 0.9 - (v_met.value->>'fact')::numeric)
                            / v_remaining
                        );
                    ELSE
                        v_daily_100 := NULL;
                        v_daily_90 := NULL;
                    END IF;
                ELSE
                    v_daily_100 := NULL;
                    v_daily_90 := NULL;
                END IF;

                v_gap := v_gap || jsonb_build_object(
                    'metric_code', v_met.value->>'code',
                    'metric_name', v_met.value->>'name',
                    'pct', (v_met.value->>'pct')::numeric,
                    'remaining_days', v_remaining,
                    'daily_for_100', ROUND(v_daily_100, 2),
                    'daily_for_90', ROUND(v_daily_90, 2)
                );
            END IF;
        END LOOP;
    END LOOP;

    -- Normalize score
    IF v_weight_sum > 0 THEN
        v_score := v_score / v_weight_sum;
    ELSE
        v_score := 0;
    END IF;

    -- Coefficient
    IF v_score < v_settings.min_bonus_level THEN
        v_coefficient := 0;
    ELSE
        v_coefficient := LEAST(v_score, v_settings.cap_level);
    END IF;

    -- Bonus
    v_bonus := (v_scheme.base_amount * v_coefficient)::integer;

    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'month', v_month_start,
        'score', ROUND(v_score, 4),
        'coefficient', ROUND(v_coefficient, 4),
        'base_amount', v_scheme.base_amount,
        'bonus', v_bonus,
        'gap_analysis', v_gap
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_my_bonus(p_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN get_bonus(auth.uid(), p_month);
END;
$$;
