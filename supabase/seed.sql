-- supabase/seed.sql
-- Haziniy SSP — Balanced Scorecard System Seed Data

-- 1. Branch
INSERT INTO branches (id, name, address, phone, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Haziniy (Farg''ona)', 'Farg''ona shahar', NULL, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, is_active = EXCLUDED.is_active;

-- 2. Departments
INSERT INTO departments (id, name, weight, sort_order, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Marketing', 0.0000, 1, true),
  ('d0000000-0000-0000-0000-000000000002', 'Sotuv',     0.3000, 2, true),
  ('d0000000-0000-0000-0000-000000000003', 'O''quv',    0.4000, 3, true),
  ('d0000000-0000-0000-0000-000000000004', 'Moliya',    0.3000, 4, true),
  ('d0000000-0000-0000-0000-000000000005', 'HR',        0.0000, 5, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, weight = EXCLUDED.weight, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 3. Metrics
-- Marketing (weight 0 dept, 3 metrics: 0.3333 + 0.3333 + 0.3334 = 1.0000)
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, weight, level, calc_type, sort_order, is_active) VALUES
  ('ba000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'M1', 'Ko''rganlar',              'count', 'sum', 'higher_better', 'equal',     0.3333, 'branch', 'input', 1, true),
  ('ba000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'M2', 'Qiziqqanlar',              'count', 'sum', 'higher_better', 'equal',     0.3333, 'branch', 'input', 2, true),
  ('ba000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'M3', 'Tushirilgan yangi lidlar', 'count', 'sum', 'higher_better', 'equal',     0.3334, 'branch', 'input', 3, true),
-- Sotuv (4 metrics: 3 input + 1 ratio, each 0.2500)
  ('ba000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'S1', 'Lidlar',                   'count', 'sum', 'higher_better', 'no_sunday', 0.2500, 'branch', 'input', 1, true),
  ('ba000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'S2', 'Sinovga yozilganlar',      'count', 'sum', 'higher_better', 'no_sunday', 0.2500, 'branch', 'input', 2, true),
  ('ba000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 'S3', 'Yangi o''quvchilar',       'count', 'sum', 'higher_better', 'no_sunday', 0.2500, 'branch', 'input', 3, true),
-- O'quv (4 metrics, each 0.2500)
  ('ba000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003', 'O1', 'O''quvchilar soni',                'count',   'last', 'higher_better', 'none',      0.2500, 'branch', 'input', 1, true),
  ('ba000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000003', 'O2', 'Ketgan o''quvchilar',               'count',   'sum',  'lower_better',  'no_sunday', 0.2500, 'branch', 'input', 2, true),
  ('ba000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000003', 'O3', 'Davomat',                           'percent', 'avg',  'higher_better', 'none',      0.2500, 'branch', 'input', 3, true),
  ('ba000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003', 'O4', 'Ustoz tavsiyasi bilan kelganlar',   'count',   'sum',  'higher_better', 'no_sunday', 0.2500, 'branch', 'input', 4, true),
-- Moliya (2 input + 1 difference: 0.3333 + 0.3333 + 0.3334 = 1.0000)
  ('ba000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000004', 'F1', 'Kirim',  'money', 'sum', 'higher_better', 'no_sunday', 0.3333, 'branch', 'input', 1, true),
  ('ba000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000004', 'F2', 'Chiqim', 'money', 'sum', 'lower_better',  'no_sunday', 0.3333, 'branch', 'input', 2, true),
-- HR (1 metric, weight 1.0000)
  ('ba000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000005', 'H1', 'O''qituvchilar reytingi', 'percent', 'avg', 'higher_better', 'none', 1.0000, 'branch', 'input', 1, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, unit = EXCLUDED.unit, aggregation = EXCLUDED.aggregation,
  direction = EXCLUDED.direction, distribution = EXCLUDED.distribution, calc_type = EXCLUDED.calc_type,
  weight = EXCLUDED.weight, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Calculated metrics (inserted separately because they reference other metrics via FKs)
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, weight, level, calc_type, operand_a_id, operand_b_id, sort_order, is_active) VALUES
  ('ba000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000002', 'S4', 'Konversiya', 'percent', 'avg', 'higher_better', 'none', 0.2500, 'branch', 'ratio',
    'ba000000-0000-0000-0000-000000000006', -- S3 (Yangi o'quvchilar)
    'ba000000-0000-0000-0000-000000000004', -- S1 (Lidlar)
    4, true),
  ('ba000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000004', 'F3', 'Foyda', 'money', 'sum', 'higher_better', 'none', 0.3334, 'branch', 'difference',
    'ba000000-0000-0000-0000-000000000012', -- F1 (Kirim)
    'ba000000-0000-0000-0000-000000000013', -- F2 (Chiqim)
    3, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, unit = EXCLUDED.unit, aggregation = EXCLUDED.aggregation,
  direction = EXCLUDED.direction, distribution = EXCLUDED.distribution, calc_type = EXCLUDED.calc_type,
  operand_a_id = EXCLUDED.operand_a_id, operand_b_id = EXCLUDED.operand_b_id,
  weight = EXCLUDED.weight, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 4. Roles
INSERT INTO roles (id, name, is_system, branch_scope) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'Boshqaruvchi',  true,  'all'),
  ('ca000000-0000-0000-0000-000000000002', 'Filial admini', false, 'own'),
  ('ca000000-0000-0000-0000-000000000003', 'O''qituvchi',   false, 'own')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, is_system = EXCLUDED.is_system, branch_scope = EXCLUDED.branch_scope;

-- 5. Role Permissions
-- Clear existing to re-seed cleanly
DELETE FROM role_permissions;

INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
  -- Boshqaruvchi: ALL modules, ALL permissions
  ('ca000000-0000-0000-0000-000000000001', 'ssp',           true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'fact_entry',    true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'monthly_plans', true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'ai_analysis',   true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'bonus',         true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'branches',      true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'structure',     true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'roles',         true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'users',         true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'evaluation',    true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'import',        true, true, true, true),
  ('ca000000-0000-0000-0000-000000000001', 'audit_log',     true, true, true, true),
  -- Filial admini
  ('ca000000-0000-0000-0000-000000000002', 'ssp',           true, false, false, false),
  ('ca000000-0000-0000-0000-000000000002', 'fact_entry',    true, true,  true,  false),
  ('ca000000-0000-0000-0000-000000000002', 'monthly_plans', true, false, false, false),
  ('ca000000-0000-0000-0000-000000000002', 'bonus',         true, false, false, false),
  ('ca000000-0000-0000-0000-000000000002', 'import',        true, true,  false, false),
  -- O'qituvchi
  ('ca000000-0000-0000-0000-000000000003', 'ssp',           true, false, false, false);

-- 6. Role Metric Access
DELETE FROM role_metric_access;

DO $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN SELECT id, department_id FROM metrics LOOP
    -- Boshqaruvchi: view + enter all
    INSERT INTO role_metric_access (role_id, metric_id, can_view, can_enter_fact)
    VALUES ('ca000000-0000-0000-0000-000000000001', m.id, true, true);

    -- Filial admini: view + enter all
    INSERT INTO role_metric_access (role_id, metric_id, can_view, can_enter_fact)
    VALUES ('ca000000-0000-0000-0000-000000000002', m.id, true, true);

    -- O'qituvchi: only O'quv department (d0000000-...-000000000003), view only
    IF m.department_id = 'd0000000-0000-0000-0000-000000000003' THEN
      INSERT INTO role_metric_access (role_id, metric_id, can_view, can_enter_fact)
      VALUES ('ca000000-0000-0000-0000-000000000003', m.id, true, false);
    END IF;
  END LOOP;
END $$;

-- 7. Evaluation Settings
INSERT INTO evaluation_settings (id, min_bonus_level, excellent_level, cap_level, fact_edit_days, lock_row) VALUES
  ('e0000000-0000-0000-0000-000000000001', 0.90, 1.00, 1.20, 1, true)
ON CONFLICT (id) DO UPDATE SET
  min_bonus_level = EXCLUDED.min_bonus_level,
  excellent_level = EXCLUDED.excellent_level,
  cap_level = EXCLUDED.cap_level,
  fact_edit_days = EXCLUDED.fact_edit_days;

-- 8. Bonus Schemes
DELETE FROM bonus_schemes;
INSERT INTO bonus_schemes (role_id, base_amount, department_ids) VALUES
  ('ca000000-0000-0000-0000-000000000001', 5000000, '{}'),
  ('ca000000-0000-0000-0000-000000000002', 3000000, '{}');
