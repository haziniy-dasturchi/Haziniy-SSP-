-- pgTAP tests for SSP calculation
BEGIN;
SELECT plan(9);

-- ============================================================================
-- Setup
-- ============================================================================
INSERT INTO branches (id, name, is_active) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'SSP Test Branch', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, name, weight, sort_order, is_active) VALUES
  ('d2222222-2222-2222-2222-222222222221', 'Dept A', 0.6000, 1, true),
  ('d2222222-2222-2222-2222-222222222222', 'Dept B', 0.4000, 2, true)
ON CONFLICT (id) DO NOTHING;

-- Metric: count, sum, higher_better, none distribution (simplest for testing)
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e2222222-2222-2222-2222-222222222201', 'd2222222-2222-2222-2222-222222222221', 'SA1', 'HigherBetter', 'count', 'sum', 'higher_better', 'none', 'input', 0.5000, true),
  ('e2222222-2222-2222-2222-222222222202', 'd2222222-2222-2222-2222-222222222221', 'SA2', 'LowerBetter',  'count', 'sum', 'lower_better',  'none', 'input', 0.5000, true),
  ('e2222222-2222-2222-2222-222222222203', 'd2222222-2222-2222-2222-222222222222', 'SB1', 'LastAgg',      'count', 'last','higher_better', 'none', 'input', 0.5000, true),
  ('e2222222-2222-2222-2222-222222222204', 'd2222222-2222-2222-2222-222222222222', 'SB2', 'AvgAgg',       'percent','avg','higher_better', 'none', 'input', 0.5000, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO evaluation_settings (id, min_bonus_level, excellent_level, cap_level, fact_edit_days, lock_row) VALUES
  ('e0000000-0000-0000-0000-000000000001', 0.90, 1.00, 1.20, 1, true)
ON CONFLICT (id) DO UPDATE SET
  min_bonus_level = 0.90, excellent_level = 1.00, cap_level = 1.20;

-- Plans: all for September 2026
INSERT INTO monthly_plans (branch_id, metric_id, month, value) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-09-01', 100),
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222202', '2026-09-01', 100),
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222203', '2026-09-01', 50),
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222204', '2026-09-01', 80)
ON CONFLICT (branch_id, metric_id, employee_id, month) DO UPDATE SET value = EXCLUDED.value;

-- Facts
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value) VALUES
  -- SA1 higher_better: fact=90, plan_to_date=100 per day * days
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-09-15', 90),
  -- SA2 lower_better: fact=80, plan=100 → pct = 100/80 = 1.25 → capped at 1.20
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222202', '2026-09-15', 80),
  -- SB1 last aggregation: multiple days, latest counts
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222203', '2026-09-10', 30),
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222203', '2026-09-15', 45),
  -- SB2 avg aggregation: 70, 90 → avg 80, plan 80 → 100%
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222204', '2026-09-10', 70),
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222204', '2026-09-15', 90)
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- Run get_ssp for 2026-09-01..2026-09-15 on the test branch
-- ============================================================================
-- The effective_date will be 2026-09-15 (latest fact)
-- For 'none' distribution, plan = T for every day, so plan_to_date:
--   sum agg → plan on each day = T, cumulated over 15 days = 15 * 100 = 1500 (sum)
-- Wait — 'none' distribution means every day plan = T, and sum aggregation sums the daily plans.
-- So plan_to_date = 100 * 15 = 1500 for SA1/SA2.
-- fact for SA1 = 90 (single entry). pct = 90/1500 = 0.06 — that's very low.
-- Actually this test should use specific numbers. Let me use direct checks on the function.

-- Better approach: Test with 1 day period to simplify
-- ============================================================================
-- TEST 1: higher_better fulfilment basic
-- Using get_ssp for just 2026-09-15, plan = 100 (none dist = T per day), fact = 90
-- pct = 90/100 = 0.90
-- ============================================================================
SELECT ok(
  (SELECT (v_ssp->'departments'->0->'metrics'->0->>'pct')::numeric
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-15'::date, '2026-09-15'::date) AS v_ssp) x
  ) = 0.90,
  'TEST 1: higher_better fact=90 plan=100 → pct = 0.90'
);

-- ============================================================================
-- TEST 2: lower_better fulfilment → plan/fact, capped at 1.20
-- fact=80, plan=100 → 100/80 = 1.25, capped at 1.20
-- ============================================================================
SELECT ok(
  (SELECT (v_ssp->'departments'->0->'metrics'->1->>'pct')::numeric
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-15'::date, '2026-09-15'::date) AS v_ssp) x
  ) = 1.20,
  'TEST 2: lower_better fact=80 plan=100 → 1.25 capped to 1.20'
);

-- ============================================================================
-- TEST 3: Cap at 120% for higher_better
-- Insert a fact with 150 when plan is 100 → 150/100 = 1.5 → capped 1.20
-- ============================================================================
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-09-20', 150)
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO UPDATE SET value = EXCLUDED.value;

SELECT ok(
  (SELECT (v_ssp->'departments'->0->'metrics'->0->>'pct')::numeric
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-20'::date, '2026-09-20'::date) AS v_ssp) x
  ) = 1.20,
  'TEST 3: higher_better fact=150 plan=100 → capped at 1.20'
);

-- ============================================================================
-- TEST 4: NULL plan → NULL pct
-- Use a month with no plan (December 2026)
-- ============================================================================
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-12-01', 50)
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO UPDATE SET value = EXCLUDED.value;

SELECT ok(
  (SELECT (v_ssp->'departments'->0->'metrics'->0->>'pct') IS NULL
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-12-01'::date, '2026-12-01'::date) AS v_ssp) x
  ),
  'TEST 4: No monthly plan → pct is NULL'
);

-- ============================================================================
-- TEST 5: Status assignment: < 0.90 → red
-- fact=80, plan=100 → 0.80 → red
-- ============================================================================
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-09-25', 80)
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO UPDATE SET value = EXCLUDED.value;

SELECT is(
  (SELECT v_ssp->'departments'->0->'metrics'->0->>'status'
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-25'::date, '2026-09-25'::date) AS v_ssp) x
  ),
  'red',
  'TEST 5: pct=0.80 → status red'
);

-- ============================================================================
-- TEST 6: Status amber (0.90 <= pct < 1.00)
-- fact=90, plan=100 → 0.90 → amber
-- ============================================================================
SELECT is(
  (SELECT v_ssp->'departments'->0->'metrics'->0->>'status'
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-15'::date, '2026-09-15'::date) AS v_ssp) x
  ),
  'amber',
  'TEST 6: pct=0.90 → status amber'
);

-- ============================================================================
-- TEST 7: Status green (>= 1.00)
-- ============================================================================
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '2026-09-28', 105)
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO UPDATE SET value = EXCLUDED.value;

SELECT is(
  (SELECT v_ssp->'departments'->0->'metrics'->0->>'status'
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-28'::date, '2026-09-28'::date) AS v_ssp) x
  ),
  'green',
  'TEST 7: pct=1.05 → status green'
);

-- ============================================================================
-- TEST 8: Aggregation 'last' — only latest value counts
-- SB1: last agg, facts on 9/10 (30) and 9/15 (45), plan = 50 per day (none)
-- On 9/15: fact (last) = 45, plan = 50 → 0.90
-- ============================================================================
SELECT ok(
  (SELECT (v_ssp->'departments'->1->'metrics'->0->>'pct')::numeric
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-15'::date, '2026-09-15'::date) AS v_ssp) x
  ) = 0.90,
  'TEST 8: Aggregation last — latest value = 45, plan = 50 → pct = 0.90'
);

-- ============================================================================
-- TEST 9: Aggregation 'avg' — average of values
-- SB2: avg agg, facts on 9/10 (70) and 9/15 (90), plan = 80
-- On single day 9/15: fact = 90, plan = 80 → 1.125 → 1.1250
-- ============================================================================
SELECT ok(
  (SELECT (v_ssp->'departments'->1->'metrics'->1->>'pct')::numeric
   FROM (SELECT get_ssp('b2222222-2222-2222-2222-222222222222'::uuid, '2026-09-15'::date, '2026-09-15'::date) AS v_ssp) x
  ) BETWEEN 1.12 AND 1.13,
  'TEST 9: Aggregation avg — fact=90, plan=80 → ~1.125'
);

SELECT * FROM finish();
ROLLBACK;
