-- Migration 00013: Weight Normalization

SET search_path = public;

CREATE OR REPLACE FUNCTION get_effective_dept_weights(p_branch uuid)
RETURNS TABLE (department_id uuid, effective_weight numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_weight numeric;
BEGIN
    -- First, calculate total weight of all active departments with weight > 0
    SELECT sum(COALESCE(bds.weight_override, d.weight)) INTO v_total_weight
    FROM departments d
    LEFT JOIN branch_department_settings bds ON bds.department_id = d.id AND bds.branch_id = p_branch
    WHERE d.is_active = true AND COALESCE(bds.weight_override, d.weight) > 0;

    -- Return normalized weights
    RETURN QUERY
    SELECT 
        d.id, 
        CASE 
            WHEN v_total_weight > 0 THEN COALESCE(bds.weight_override, d.weight) / v_total_weight 
            ELSE 0 
        END
    FROM departments d
    LEFT JOIN branch_department_settings bds ON bds.department_id = d.id AND bds.branch_id = p_branch
    WHERE d.is_active = true AND COALESCE(bds.weight_override, d.weight) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION get_effective_metric_weights(p_branch uuid, p_department_id uuid)
RETURNS TABLE (metric_id uuid, effective_weight numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_weight numeric;
BEGIN
    -- Calculate total weight of active metrics in this department
    SELECT sum(COALESCE(bms.weight_override, m.weight)) INTO v_total_weight
    FROM metrics m
    LEFT JOIN branch_metric_settings bms ON bms.metric_id = m.id AND bms.branch_id = p_branch
    WHERE m.department_id = p_department_id 
      AND m.is_active = true 
      AND COALESCE(bms.is_enabled, true) = true
      AND COALESCE(bms.weight_override, m.weight) > 0;

    -- Return normalized weights
    RETURN QUERY
    SELECT 
        m.id, 
        CASE 
            WHEN v_total_weight > 0 THEN COALESCE(bms.weight_override, m.weight) / v_total_weight 
            ELSE 0 
        END
    FROM metrics m
    LEFT JOIN branch_metric_settings bms ON bms.metric_id = m.id AND bms.branch_id = p_branch
    WHERE m.department_id = p_department_id 
      AND m.is_active = true 
      AND COALESCE(bms.is_enabled, true) = true
      AND COALESCE(bms.weight_override, m.weight) > 0;
END;
$$;
