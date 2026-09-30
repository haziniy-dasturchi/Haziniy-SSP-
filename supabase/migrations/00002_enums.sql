-- Create necessary enum types
CREATE TYPE metric_unit AS ENUM ('count', 'money', 'percent');
CREATE TYPE metric_aggregation AS ENUM ('sum', 'last', 'avg');
CREATE TYPE metric_direction AS ENUM ('higher_better', 'lower_better');
CREATE TYPE metric_distribution AS ENUM ('equal', 'no_sunday', 'none');
CREATE TYPE metric_level AS ENUM ('branch', 'employee');
CREATE TYPE metric_calc_type AS ENUM ('input', 'ratio', 'difference');
CREATE TYPE branch_scope AS ENUM ('own', 'all');
CREATE TYPE ssp_status AS ENUM ('red', 'amber', 'green');
CREATE TYPE audit_action AS ENUM ('insert', 'update', 'delete');
