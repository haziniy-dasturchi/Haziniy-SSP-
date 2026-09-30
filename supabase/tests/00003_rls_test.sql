-- pgTAP tests for Row Level Security
BEGIN;
SELECT plan(5);

-- ============================================================================
-- Setup: Create test users, roles, and data
-- ============================================================================

-- Use seed data roles and branch
-- Boshqaruvchi: r0000000-...-000000000001 (system, all, all perms)
-- Filial admini: r0000000-...-000000000002 (own, fact entry)
-- O'qituvchi: r0000000-...-000000000003 (own, view O'quv only)

-- Ensure seed data exists
INSERT INTO branches (id, name, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Haziniy (Farg''ona)', true),
  ('a0000000-0000-0000-0000-000000000002', 'Branch 2', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO departments (id, name, weight, sort_order, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000003', 'O''quv', 0.4, 3, true),
  ('d0000000-0000-0000-0000-000000000004', 'Moliya', 0.3, 4, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO roles (id, name, is_system, branch_scope) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'Boshqaruvchi', true, 'all'),
  ('r0000000-0000-0000-0000-000000000003', 'O''qituvchi', false, 'own')
ON CONFLICT (id) DO UPDATE SET branch_scope = EXCLUDED.branch_scope;

-- Insert metrics
INSERT INTO metrics (id, department_id, code, name, unit, aggregation, direction, distribution, calc_type, weight, is_active) VALUES
  ('e3333333-3333-3333-3333-333333333301', 'd0000000-0000-0000-0000-000000000003', 'RO1', 'Test Oquv', 'count', 'sum', 'higher_better', 'none', 'input', 1.0, true),
  ('e3333333-3333-3333-3333-333333333302', 'd0000000-0000-0000-0000-000000000004', 'RF1', 'Test Moliya', 'money', 'sum', 'higher_better', 'none', 'input', 1.0, true)
ON CONFLICT (id) DO NOTHING;

-- Role permissions for O'qituvchi
INSERT INTO role_permissions (role_id, module, can_view) VALUES
  ('r0000000-0000-0000-0000-000000000003', 'ssp', true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Boshqaruvchi perms
INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'ssp', true, true, true, true),
  ('r0000000-0000-0000-0000-000000000001', 'fact_entry', true, true, true, true),
  ('r0000000-0000-0000-0000-000000000001', 'branches', true, true, true, true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Metric access for O'qituvchi: can view O'quv metric, NOT Moliya
INSERT INTO role_metric_access (role_id, metric_id, can_view, can_enter_fact) VALUES
  ('r0000000-0000-0000-0000-000000000003', 'e3333333-3333-3333-3333-333333333301', true, false)
ON CONFLICT (role_id, metric_id) DO NOTHING;
-- Note: no row for RF1/Moliya → can_view defaults to false

-- Metric access for Boshqaruvchi: all
INSERT INTO role_metric_access (role_id, metric_id, can_view, can_enter_fact) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'e3333333-3333-3333-3333-333333333301', true, true),
  ('r0000000-0000-0000-0000-000000000001', 'e3333333-3333-3333-3333-333333333302', true, true)
ON CONFLICT (role_id, metric_id) DO NOTHING;

-- Create test auth users via raw insert (in test env, we simulate auth.uid)
-- We'll use the session-based approach: SET LOCAL request.jwt.claim.sub

-- Create test profiles (simulate auth users)
-- Teacher user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
VALUES (
  'c3333333-3333-3333-3333-333333333301',
  '998111111111@users.haziniyssp.app',
  crypt('password123', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, full_name, phone, role_id, branch_id, is_owner, is_active) VALUES
  ('c3333333-3333-3333-3333-333333333301', 'Test Teacher', '998111111111', 'r0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', false, true)
ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, branch_id = EXCLUDED.branch_id, is_active = true;

-- Owner user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
VALUES (
  'c3333333-3333-3333-3333-333333333302',
  '998222222222@users.haziniyssp.app',
  crypt('password123', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, full_name, phone, role_id, branch_id, is_owner, is_active) VALUES
  ('c3333333-3333-3333-3333-333333333302', 'Test Owner', '998222222222', 'r0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', true, true)
ON CONFLICT (id) DO UPDATE SET is_owner = true, is_active = true;

-- Insert facts for branch 2 (for cross-branch test)
INSERT INTO daily_facts (branch_id, metric_id, fact_date, value, entered_by) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'e3333333-3333-3333-3333-333333333302', '2026-09-15', 1000000, 'c3333333-3333-3333-3333-333333333302')
ON CONFLICT (branch_id, metric_id, employee_id, fact_date) DO NOTHING;

-- Evaluation settings
INSERT INTO evaluation_settings (id, min_bonus_level, excellent_level, cap_level, fact_edit_days, lock_row) VALUES
  ('e0000000-0000-0000-0000-000000000001', 0.90, 1.00, 1.20, 1, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST 1: O'qituvchi cannot see Moliya metrics
-- ============================================================================
-- Switch to teacher user context
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "c3333333-3333-3333-3333-333333333301", "role": "authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM metrics WHERE id = 'e3333333-3333-3333-3333-333333333302')::integer,
  0::integer,
  'TEST 1: O''qituvchi cannot see Moliya metrics'
);

-- ============================================================================
-- TEST 2: O'qituvchi cannot write facts (no fact_entry permission)
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO daily_facts (branch_id, metric_id, fact_date, value, entered_by)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'e3333333-3333-3333-3333-333333333301', CURRENT_DATE, 10, 'c3333333-3333-3333-3333-333333333301')$$,
  NULL,
  NULL,
  'TEST 2: O''qituvchi cannot insert daily_facts'
);

-- ============================================================================
-- TEST 3: Teacher cannot see other branch's facts
-- The teacher is in branch 1, facts for branch 2 should not be visible
-- ============================================================================
SELECT is(
  (SELECT COUNT(*) FROM daily_facts WHERE branch_id = 'a0000000-0000-0000-0000-000000000002')::integer,
  0::integer,
  'TEST 3: Teacher cannot see other branch facts'
);

-- ============================================================================
-- TEST 4: Owner sees everything
-- ============================================================================
RESET role;
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "c3333333-3333-3333-3333-333333333302", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM branches) >= 2,
  'TEST 4: Owner sees all branches'
);

-- ============================================================================
-- TEST 5: Deactivated user sees nothing
-- ============================================================================
RESET role;
-- Deactivate the teacher
UPDATE profiles SET is_active = false WHERE id = 'c3333333-3333-3333-3333-333333333301';

SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "c3333333-3333-3333-3333-333333333301", "role": "authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM branches)::integer,
  0::integer,
  'TEST 5: Deactivated user sees no branches'
);

RESET role;
SELECT * FROM finish();
ROLLBACK;
