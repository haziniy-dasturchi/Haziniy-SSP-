CREATE TABLE branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    weight numeric(5,4) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 1),
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id uuid NOT NULL REFERENCES departments(id),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    unit metric_unit NOT NULL,
    aggregation metric_aggregation NOT NULL DEFAULT 'sum',
    direction metric_direction NOT NULL DEFAULT 'higher_better',
    distribution metric_distribution NOT NULL DEFAULT 'equal',
    weight numeric(5,4) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 1),
    level metric_level NOT NULL DEFAULT 'branch',
    calc_type metric_calc_type NOT NULL DEFAULT 'input',
    operand_a_id uuid REFERENCES metrics(id),
    operand_b_id uuid REFERENCES metrics(id),
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CHECK (
        (calc_type != 'input' AND operand_a_id IS NOT NULL AND operand_b_id IS NOT NULL) OR
        (calc_type = 'input' AND operand_a_id IS NULL AND operand_b_id IS NULL)
    )
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON metrics FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE branch_department_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id),
    department_id uuid NOT NULL REFERENCES departments(id),
    weight_override numeric(5,4) CHECK (weight_override >= 0 AND weight_override <= 1),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(branch_id, department_id)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON branch_department_settings FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE branch_metric_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id),
    metric_id uuid NOT NULL REFERENCES metrics(id),
    is_enabled boolean NOT NULL DEFAULT true,
    weight_override numeric(5,4) CHECK (weight_override IS NULL OR (weight_override >= 0 AND weight_override <= 1)),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(branch_id, metric_id)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON branch_metric_settings FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_system boolean NOT NULL DEFAULT false,
    branch_scope branch_scope NOT NULL DEFAULT 'own',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module text NOT NULL,
    can_view boolean NOT NULL DEFAULT false,
    can_create boolean NOT NULL DEFAULT false,
    can_edit boolean NOT NULL DEFAULT false,
    can_delete boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(role_id, module),
    CHECK (module IN ('ssp', 'fact_entry', 'monthly_plans', 'ai_analysis', 'bonus', 'branches', 'structure', 'roles', 'users', 'evaluation', 'import', 'audit_log'))
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE role_metric_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    metric_id uuid NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    can_view boolean NOT NULL DEFAULT true,
    can_enter_fact boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(role_id, metric_id)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON role_metric_access FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text NOT NULL UNIQUE CHECK (phone ~ '^998\d{9}$'),
    role_id uuid NOT NULL REFERENCES roles(id),
    branch_id uuid REFERENCES branches(id),
    is_owner boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE evaluation_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    min_bonus_level numeric NOT NULL DEFAULT 0.90,
    excellent_level numeric NOT NULL DEFAULT 1.00,
    cap_level numeric NOT NULL DEFAULT 1.20,
    fact_edit_days integer NOT NULL DEFAULT 1,
    lock_row boolean DEFAULT true UNIQUE CHECK (lock_row = true),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON evaluation_settings FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE monthly_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id),
    metric_id uuid NOT NULL REFERENCES metrics(id),
    employee_id uuid REFERENCES profiles(id),
    month date NOT NULL CHECK (month = date_trunc('month', month)::date AND month >= '2026-09-01'),
    value numeric NOT NULL,
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (branch_id, metric_id, employee_id, month)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON monthly_plans FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE daily_facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id),
    metric_id uuid NOT NULL REFERENCES metrics(id),
    employee_id uuid REFERENCES profiles(id),
    fact_date date NOT NULL CHECK (fact_date >= '2026-09-01'),
    value numeric NOT NULL,
    entered_by uuid REFERENCES auth.users(id),
    entered_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (branch_id, metric_id, employee_id, fact_date)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON daily_facts FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE bonus_schemes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES roles(id),
    base_amount integer NOT NULL DEFAULT 0,
    department_ids uuid[] NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON bonus_schemes FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE ai_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES branches(id),
    date_from date NOT NULL,
    date_to date NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    input_snapshot jsonb,
    result jsonb,
    model text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON ai_analyses FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    at timestamptz NOT NULL DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    action audit_action NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb
);
