-- pgTAP tests for plan distribution
BEGIN;
SELECT plan(11);

-- ============================================================================
-- Setup: insert test data directly (runs as postgres, bypasses RLS)
-- ============================================================================
INSERT INTO branches (id, name, is_active) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Test Branch', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, name, weight, sort_order, is_active) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Test Dept', 1.0000, 1, true)
ON CONFLICT (id) DO NOTHING;

-- count/equal metric
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e1111111-1111-1111-1111-111111111101', 'd1111111-1111-1111-1111-111111111111', 'TE1', 'Count Equal', 'count', 'sum', 'higher_better', 'equal', 'input', 0.2500, true)
ON CONFLICT (id) DO NOTHING;

-- count/no_sunday metric
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e1111111-1111-1111-1111-111111111102', 'd1111111-1111-1111-1111-111111111111', 'TE2', 'Count NoSunday', 'count', 'sum', 'higher_better', 'no_sunday', 'input', 0.2500, true)
ON CONFLICT (id) DO NOTHING;

-- count/none metric
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e1111111-1111-1111-1111-111111111103', 'd1111111-1111-1111-1111-111111111111', 'TE3', 'Count None', 'count', 'sum', 'higher_better', 'none', 'input', 0.2500, true)
ON CONFLICT (id) DO NOTHING;

-- money/no_sunday metric
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e1111111-1111-1111-1111-111111111104', 'd1111111-1111-1111-1111-111111111111', 'TE4', 'Money NoSunday', 'money', 'sum', 'higher_better', 'no_sunday', 'input', 0.2500, true)
ON CONFLICT (id) DO NOTHING;

-- percent/equal metric (should be treated as 'none')
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e1111111-1111-1111-1111-111111111105', 'd1111111-1111-1111-1111-111111111111', 'TE5', 'Pct Equal', 'percent', 'avg', 'higher_better', 'equal', 'input', 0.2500, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Monthly plans for October 2026 (31 days)
-- ============================================================================
INSERT INTO monthly_plans (branch_id, metric_id, month, value, updated_by) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111101', '2026-10-01', 70, NULL),
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111102', '2026-10-01', 70, NULL),
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111103', '2026-10-01', 70, NULL),
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111104', '2026-10-01', 5000000, NULL),
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111105', '2026-10-01', 50, NULL)
ON CONFLICT (branch_id, metric_id, employee_id, month) DO UPDATE SET value = EXCLUDED.value;

-- November 2026 (30 days) plan for equal count
INSERT INTO monthly_plans (branch_id, metric_id, month, value, updated_by) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111101', '2026-11-01', 100, NULL)
ON CONFLICT (branch_id, metric_id, employee_id, month) DO UPDATE SET value = EXCLUDED.value;

-- T=1 plan for Oct 2026
INSERT INTO monthly_plans (branch_id, metric_id, month, value, updated_by) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111102', '2026-11-01', 1, NULL)
ON CONFLICT (branch_id, metric_id, employee_id, month) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- TEST 1: Equal distribution, count, T=70, October 2026 (31 days)
-- Sum of daily plans must equal 70 exactly
-- ============================================================================
SELECT is(
  (SELECT SUM(plan_value) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111101',
    '2026-10-01', '2026-10-31'))::numeric,
  70::numeric,
  'TEST 1: Equal dist count T=70, 31 days → sum = 70'
);

-- ============================================================================
-- TEST 2: Equal distribution, count, T=100, November 2026 (30 days)
-- ============================================================================
SELECT is(
  (SELECT SUM(plan_value) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111101',
    '2026-11-01', '2026-11-30'))::numeric,
  100::numeric,
  'TEST 2: Equal dist count T=100, 30 days → sum = 100'
);

-- ============================================================================
-- TEST 3: no_sunday, count, T=70 — sum of non-Sunday = 70, Sundays = 0
-- ============================================================================
SELECT is(
  (SELECT SUM(plan_value)
   FROM daily_plan(
     'b1111111-1111-1111-1111-111111111111',
     'e1111111-1111-1111-1111-111111111102',
     '2026-10-01', '2026-10-31')
   WHERE EXTRACT(ISODOW FROM plan_date) != 7)::numeric,
  70::numeric,
  'TEST 3: no_sunday non-Sunday days sum = 70'
);

-- ============================================================================
-- TEST 4: no_sunday — Sunday values are 0
-- ============================================================================
SELECT is(
  (SELECT COALESCE(SUM(plan_value), 0)
   FROM daily_plan(
     'b1111111-1111-1111-1111-111111111111',
     'e1111111-1111-1111-1111-111111111102',
     '2026-10-01', '2026-10-31')
   WHERE EXTRACT(ISODOW FROM plan_date) = 7)::numeric,
  0::numeric,
  'TEST 4: no_sunday Sunday values = 0'
);

-- ============================================================================
-- TEST 5: no_sunday, count, T=1 — sum = 1
-- ============================================================================
SELECT is(
  (SELECT SUM(plan_value) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111102',
    '2026-11-01', '2026-11-30'))::numeric,
  1::numeric,
  'TEST 5: no_sunday count T=1 → sum = 1'
);

-- ============================================================================
-- TEST 6: none distribution — every day = T
-- ============================================================================
SELECT is(
  (SELECT COUNT(*) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111103',
    '2026-10-01', '2026-10-31')
   WHERE plan_value = 70)::integer,
  31::integer,
  'TEST 6: none dist → every day = 70'
);

-- ============================================================================
-- TEST 7: Money dist, T=5000000 — values are multiples of 1000
-- ============================================================================
SELECT is(
  (SELECT COUNT(*) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111104',
    '2026-10-01', '2026-10-31')
   WHERE plan_value % 1000 != 0 AND plan_value != 0)::integer,
  0::integer,
  'TEST 7: Money dist values are multiples of 1000'
);

-- ============================================================================
-- TEST 8: Percent with equal distribution → treated as none (every day = T)
-- ============================================================================
SELECT is(
  (SELECT COUNT(*) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111105',
    '2026-10-01', '2026-10-31')
   WHERE plan_value = 50)::integer,
  31::integer,
  'TEST 8: Percent+equal → treated as none, every day = 50'
);

-- ============================================================================
-- TEST 9: Date range filtering — only requested dates returned
-- ============================================================================
SELECT ok(
  (SELECT MIN(plan_date) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111101',
    '2026-10-05', '2026-10-10')) = '2026-10-05'::date,
  'TEST 9a: Date range start is respected'
);
SELECT ok(
  (SELECT MAX(plan_date) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111101',
    '2026-10-05', '2026-10-10')) = '2026-10-10'::date,
  'TEST 9b: Date range end is respected'
);

-- ============================================================================
-- TEST 10: No monthly plan → NULL values (not 0)
-- No plan for metric TE3 in November, so all values should be NULL
-- ============================================================================
SELECT is(
  (SELECT COUNT(plan_value) FROM daily_plan(
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111103',
    '2026-11-01', '2026-11-30'))::integer,
  0::integer,
  'TEST 10: No monthly plan → all plan_values are NULL'
);

SELECT * FROM finish();
ROLLBACK;
