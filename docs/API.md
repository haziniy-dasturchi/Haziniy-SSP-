# API Reference for Frontend Developers

> Build the Haziniy SSP frontend **only** from this file.
> All RPCs and tables follow the Supabase JavaScript client conventions.

---

## Authentication

Login uses **phone number + password**. The phone is mapped to a synthetic email.

```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: phone + '@users.haziniyssp.app',
  password: password,
});

// After successful login — track last activity
await supabase.rpc('update_last_login');

// Logout
await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

---

## Enums

| Type | Values |
|------|--------|
| `metric_unit` | `count`, `money`, `percent` |
| `metric_aggregation` | `sum`, `last`, `avg` |
| `metric_direction` | `higher_better`, `lower_better` |
| `metric_distribution` | `equal`, `no_sunday`, `none` |
| `metric_level` | `branch`, `employee` |
| `metric_calc_type` | `input`, `ratio`, `difference` |
| `branch_scope` | `own`, `all` |
| `ssp_status` | `red`, `amber`, `green` |

---

## Tables

### branches
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| address | text | |
| phone | text | |
| is_active | boolean | |

**RLS**: Users see only branches in their scope (`own` = their branch, `all` = every branch).

### departments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| weight | numeric(5,4) | 0–1, active depts sum to 1 |
| sort_order | integer | |
| is_active | boolean | |

**RLS**: All authenticated users can read.

### metrics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| department_id | uuid | FK → departments |
| code | text | e.g. `S1`, `F1` |
| name | text | |
| unit | metric_unit | |
| aggregation | metric_aggregation | How daily values roll up |
| direction | metric_direction | |
| distribution | metric_distribution | How monthly plan splits into days |
| weight | numeric(5,4) | Weight within department |
| level | metric_level | `branch` or `employee` |
| calc_type | metric_calc_type | `input` / `ratio` / `difference` |
| operand_a_id | uuid | For calculated metrics |
| operand_b_id | uuid | For calculated metrics |
| sort_order | integer | |
| is_active | boolean | |

**RLS**: Users see only metrics their role has `can_view` access to.

### monthly_plans
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| metric_id | uuid | FK → metrics |
| employee_id | uuid | Nullable. FK → profiles. NULL = branch-level |
| month | date | Always 1st of month, ≥ 2026-09-01 |
| value | numeric | |
| updated_by | uuid | FK → auth.users |

**Unique**: (branch_id, metric_id, employee_id, month) with NULLS NOT DISTINCT.

### daily_facts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| branch_id | uuid | |
| metric_id | uuid | |
| employee_id | uuid | Nullable |
| fact_date | date | ≥ 2026-09-01 |
| value | numeric | |
| entered_by | uuid | |
| entered_at | timestamptz | |

**RLS INSERT/UPDATE**: Must have `fact_entry.can_create`/`can_edit`, metric `can_enter_fact`, and `fact_date` within the allowed edit range (today ± `fact_edit_days`).

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK = auth.users.id |
| full_name | text | |
| phone | text | 12 digits, 998XXXXXXXXX |
| role_id | uuid | FK → roles |
| branch_id | uuid | FK → branches |
| is_owner | boolean | |
| is_active | boolean | |
| last_login_at | timestamptz | |

### roles
| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| is_system | boolean |
| branch_scope | `own` \| `all` |

### role_permissions
| Column | Type |
|--------|------|
| role_id | uuid |
| module | text |
| can_view | boolean |
| can_create | boolean |
| can_edit | boolean |
| can_delete | boolean |

**Modules**: `ssp`, `fact_entry`, `monthly_plans`, `ai_analysis`, `bonus`, `branches`, `structure`, `roles`, `users`, `evaluation`, `import`, `audit_log`.

### evaluation_settings (single row)
| Column | Type | Default |
|--------|------|---------|
| min_bonus_level | numeric | 0.90 |
| excellent_level | numeric | 1.00 |
| cap_level | numeric | 1.20 |
| fact_edit_days | integer | 1 |

### bonus_schemes
| Column | Type | Notes |
|--------|------|-------|
| role_id | uuid | |
| base_amount | integer | UZS so'm |
| department_ids | uuid[] | Empty = all departments |

### ai_analyses
| Column | Type |
|--------|------|
| branch_id | uuid (nullable) |
| date_from | date |
| date_to | date |
| created_by | uuid |
| result | jsonb |
| model | text |

### audit_log
| Column | Type |
|--------|------|
| at | timestamptz |
| user_id | uuid |
| action | `insert` \| `update` \| `delete` |
| entity | text (table name) |
| entity_id | uuid |
| old_value | jsonb |
| new_value | jsonb |

**RLS**: Only users with `audit_log.can_view`.

---

## RPC Functions

### `update_last_login()`
```javascript
await supabase.rpc('update_last_login');
// Returns: void
```

### `keepalive()`
```javascript
await supabase.rpc('keepalive');
// Returns: "ok"
```

### `daily_plan(p_branch, p_metric, p_from, p_to, p_employee?)`
```javascript
const { data } = await supabase.rpc('daily_plan', {
  p_branch: 'branch-uuid',
  p_metric: 'metric-uuid',
  p_from: '2026-09-01',
  p_to: '2026-09-30',
});
// Returns: [{ plan_date: "2026-09-01", plan_value: 3 }, ...]
```

### `get_ssp(p_branch?, p_from, p_to)` ⭐ Core function
```javascript
const { data } = await supabase.rpc('get_ssp', {
  p_branch: 'branch-uuid', // null = all branches in scope
  p_from: '2026-09-01',
  p_to: '2026-09-30',
});
```

**Response:**
```json
{
  "period": { "from": "2026-09-01", "to": "2026-09-30" },
  "effective_date": "2026-09-28",
  "total": { "pct": 0.9500, "status": "amber" },
  "departments": [
    {
      "id": "uuid",
      "name": "Sotuv",
      "weight": 0.3000,
      "pct": 0.9200,
      "status": "amber",
      "metrics": [
        {
          "id": "uuid",
          "code": "S1",
          "name": "Lidlar",
          "unit": "count",
          "direction": "higher_better",
          "weight": 0.2500,
          "plan": 85,
          "full_period_plan": 100,
          "fact": 78,
          "diff": -7,
          "pct": 0.9176,
          "status": "amber"
        }
      ]
    }
  ]
}
```

**Status thresholds**: `red` < 0.90, `amber` 0.90–0.99, `green` ≥ 1.00.

### `get_metric_series(p_branch, p_metric, p_from, p_to, p_grain?)`
```javascript
const { data } = await supabase.rpc('get_metric_series', {
  p_branch: 'branch-uuid',
  p_metric: 'metric-uuid',
  p_from: '2026-09-01',
  p_to: '2026-09-30',
  p_grain: 'week', // 'day' | 'week' | 'month_week' | 'month'
});
```

**Response:**
```json
[
  { "bucket_start": "2026-09-01", "bucket_label": "W36", "plan": 25, "fact": 22, "pct": 0.88 },
  { "bucket_start": "2026-09-08", "bucket_label": "W37", "plan": 25, "fact": 27, "pct": 1.08 }
]
```

### `get_monthly_plan_grid(p_branch, p_year_start)`
```javascript
const { data } = await supabase.rpc('get_monthly_plan_grid', {
  p_branch: 'branch-uuid',
  p_year_start: '2026-09-01',
});
```

**Response:**
```json
[
  {
    "metric_id": "uuid",
    "metric_code": "S1",
    "metric_name": "Lidlar",
    "department": "Sotuv",
    "months": [
      { "month": "2026-09-01", "value": 100 },
      { "month": "2026-10-01", "value": null }
    ]
  }
]
```

### `get_bonus(p_profile_id, p_month)` / `get_my_bonus(p_month)`
```javascript
// For current user
const { data } = await supabase.rpc('get_my_bonus', { p_month: '2026-09-01' });

// For any user (requires permission)
const { data } = await supabase.rpc('get_bonus', {
  p_profile_id: 'profile-uuid',
  p_month: '2026-09-01',
});
```

**Response:**
```json
{
  "profile_id": "uuid",
  "month": "2026-09-01",
  "score": 0.9500,
  "coefficient": 0.9500,
  "base_amount": 5000000,
  "bonus": 4750000,
  "gap_analysis": [
    {
      "metric_code": "S1",
      "metric_name": "Lidlar",
      "pct": 0.85,
      "remaining_days": 10,
      "daily_for_100": 5,
      "daily_for_90": 3
    }
  ]
}
```

### `upsert_monthly_plans(p_rows)` / `upsert_daily_facts(p_rows)`
```javascript
// Monthly plans
const { data } = await supabase.rpc('upsert_monthly_plans', {
  p_rows: [
    { branch_id: 'uuid', metric_id: 'uuid', employee_id: null, month: '2026-09-01', value: 100 },
    { branch_id: 'uuid', metric_id: 'uuid', employee_id: null, month: '2026-10-01', value: 120 }
  ]
});

// Daily facts
const { data } = await supabase.rpc('upsert_daily_facts', {
  p_rows: [
    { branch_id: 'uuid', metric_id: 'uuid', employee_id: null, fact_date: '2026-09-15', value: 25 }
  ]
});
```

**Response:**
```json
{
  "inserted": 1,
  "updated": 1,
  "errors": [
    { "row": 3, "message": "Bu sana uchun fakt kiritish mumkin emas" }
  ]
}
```

**Error messages (Uzbek):**
| Message | Meaning |
|---------|---------|
| `Filial topilmadi` | Branch not found |
| `Metrika topilmadi` | Metric not found |
| `Bu sana uchun fakt kiritish mumkin emas` | Date outside allowed range |
| `Sizda bu metrika uchun fakt kiritish huquqi yo'q` | No fact entry permission |
| `Sizda reja kiritish huquqi yo'q` | No plan entry permission |
| `Sana 2026-09-01 dan katta bo'lishi kerak` | Date before system start |
| `Sana oyning birinchi kuni bo'lishi kerak` | Month must be 1st of month |

### `copy_month_plans(p_branch, p_from_month, p_to_month, p_growth_pct?)`
```javascript
const { data } = await supabase.rpc('copy_month_plans', {
  p_branch: 'uuid',
  p_from_month: '2026-09-01',
  p_to_month: '2026-10-01',
  p_growth_pct: 10, // +10% growth
});
// Returns: integer (number of plans copied)
```

### `get_effective_dept_weights(p_branch)` / `get_effective_metric_weights(p_branch, p_department_id)`
```javascript
const { data } = await supabase.rpc('get_effective_dept_weights', { p_branch: 'uuid' });
// Returns: [{ department_id: "uuid", effective_weight: 0.3333 }]

const { data } = await supabase.rpc('get_effective_metric_weights', {
  p_branch: 'uuid',
  p_department_id: 'uuid',
});
// Returns: [{ metric_id: "uuid", effective_weight: 0.2500 }]
```

---

## Edge Functions

### `admin-users` — `POST /functions/v1/admin-users`

**Headers:**
```
Authorization: Bearer <user-jwt>
Content-Type: application/json
```

#### Create user
```json
{
  "action": "create",
  "full_name": "Alisher Karimov",
  "phone": "998901234567",
  "password": "securepass123",
  "role_id": "role-uuid",
  "branch_id": "branch-uuid",
  "is_active": true
}
```
→ `201` with profile object.

#### Update user
```json
{ "action": "update", "user_id": "uuid", "full_name": "Yangi Ism", "role_id": "uuid" }
```
→ `200` with updated profile.

#### Reset password
```json
{ "action": "reset_password", "user_id": "uuid", "new_password": "newpass123" }
```
→ `200` with `{ "success": true }`.

#### Set active / deactivate
```json
{ "action": "set_active", "user_id": "uuid", "is_active": false }
```
→ `200` with `{ "success": true }`.

#### Delete user
```json
{ "action": "delete", "user_id": "uuid" }
```
→ `200` with `{ "success": true }`.

**Error examples:**
| Status | Body |
|--------|------|
| 400 | `{ "error": "Bu telefon raqam allaqachon mavjud" }` |
| 400 | `{ "error": "Parol kamida 8 ta belgidan iborat bo'lishi kerak" }` |
| 401 | `{ "error": "Avtorizatsiya talab qilinadi" }` |
| 403 | `{ "error": "Sizda bu amalni bajarish huquqi yo'q" }` |

---

### `ai-analyze` — `POST /functions/v1/ai-analyze`

```json
{
  "branch_id": "uuid-or-null",
  "date_from": "2026-09-01",
  "date_to": "2026-09-30"
}
```

**Response:**
```json
{
  "summary": "Umumiy natijalar yaxshi...",
  "weakest": [
    {
      "metric_code": "S1",
      "pct": 0.72,
      "gap": 28,
      "likely_causes": ["Lid generatsiya kanallari kam ishlagan"]
    }
  ],
  "recommendations": [
    {
      "action": "Instagram reklamani kuchaytirish",
      "owner_role": "Marketing menejer",
      "deadline_days": 7,
      "expected_effect": "Lidlar sonini 20% ga oshirish"
    }
  ],
  "strengths": ["Davomat darajasi yuqori (98%)"]
}
```

**Rate limit**: 20 per user per day. Returns `429` with `{ "error": "Kunlik tahlil limiti tugadi (20 ta)" }`.

---

## Important Notes

- **Money**: All amounts in UZS (so'm), stored as integers.
- **Timezone**: All "today" logic uses `Asia/Tashkent`.
- **Week start**: Monday (ISO).
- **Month-weeks**: 1–7, 8–14, 15–21, 22–end.
- **System epoch**: 2026-09-01. No data before this date.
- **Service role key**: **NEVER** expose to the browser.
- **Phone format**: `998XXXXXXXXX` (12 digits).
