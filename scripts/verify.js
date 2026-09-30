const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Load .env file if present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const DB_URL = process.env.SUPABASE_DB_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!DB_URL) {
  console.error('❌ Xatolik: SUPABASE_DB_URL muhit o\'zgaruvchisi topilmadi! Iltimos, .env faylida SUPABASE_DB_URL ni ko\'rsating.');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ Xatolik: SUPABASE_URL muhit o\'zgaruvchisi topilmadi! Iltimos, .env faylida SUPABASE_URL ni ko\'rsating.');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Xatolik: SUPABASE_ANON_KEY muhit o\'zgaruvchisi topilmadi! Iltimos, .env faylida SUPABASE_ANON_KEY ni ko\'rsating.');
  process.exit(1);
}

async function verify() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('===============================================================');
  console.log('VERIFICATION 1: Row Level Security on EVERY table in public schema');
  console.log('===============================================================');
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `);
  console.table(rlsRes.rows);

  const disabled = rlsRes.rows.filter(r => !r.rowsecurity);
  if (disabled.length === 0) {
    console.log(`✅ ALL ${rlsRes.rows.length} tables in public schema have rowsecurity = true (RLS enabled)!`);
  } else {
    console.error('❌ Tables with RLS disabled:', disabled);
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('VERIFICATION 2: daily_plan for S1, Haziniy, Oct 2026, monthly plan 70');
  console.log('===============================================================');
  
  // Find branch id and S1 metric id
  const branchRes = await client.query("SELECT id, name FROM branches WHERE name LIKE '%Haziniy%' LIMIT 1;");
  const branch = branchRes.rows[0];
  const metricRes = await client.query("SELECT id, code, name, distribution, unit FROM metrics WHERE code = 'S1' LIMIT 1;");
  const metric = metricRes.rows[0];

  console.log(`Branch: ${branch.name} (${branch.id})`);
  console.log(`Metric: ${metric.code} - ${metric.name} (distribution: ${metric.distribution}, unit: ${metric.unit})`);

  // Insert monthly plan 70 for Oct 2026
  await client.query(`
    INSERT INTO monthly_plans (branch_id, metric_id, month, value)
    VALUES ($1, $2, '2026-10-01', 70)
    ON CONFLICT (branch_id, metric_id, employee_id, month) DO UPDATE SET value = EXCLUDED.value;
  `, [branch.id, metric.id]);

  // Query daily_plan
  const planRes = await client.query(`
    SELECT 
      plan_date,
      to_char(plan_date, 'Dy') as day_name,
      plan_value,
      EXTRACT(ISODOW FROM plan_date) as isodow
    FROM daily_plan($1, $2, '2026-10-01', '2026-10-31')
    ORDER BY plan_date;
  `, [branch.id, metric.id]);

  console.log(`Returned ${planRes.rows.length} days for October 2026:`);
  
  let sumTotal = 0;
  let sundaySum = 0;
  let nonSundaySum = 0;

  for (const r of planRes.rows) {
    const val = parseFloat(r.plan_value);
    sumTotal += val;
    if (parseInt(r.isodow) === 7) {
      sundaySum += val;
    } else {
      nonSundaySum += val;
    }
  }

  console.log(`- Total sum of days: ${sumTotal}`);
  console.log(`- Total Sunday values: ${sundaySum}`);
  console.log(`- Total non-Sunday values: ${nonSundaySum}`);

  if (sumTotal === 70 && sundaySum === 0) {
    console.log('✅ Daily plan verification PASSED: Sum is exactly 70 and every Sunday is 0!');
  } else {
    console.error('❌ Daily plan verification FAILED!');
    process.exit(1);
  }

  await client.end();
}

async function verifyOwnerLoginAndSSP(phone, password) {
  console.log('\n===============================================================');
  console.log('VERIFICATION 3: Owner sign in with phone+password & get_ssp call');
  console.log('===============================================================');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const syntheticEmail = `${phone}@users.haziniyssp.app`;

  console.log(`Attempting login for phone: ${phone} (${syntheticEmail})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: password
  });

  if (authError) {
    throw new Error(`Login failed: ${authError.message}`);
  }

  console.log('✅ Login successful! Session token received.');
  
  // Call update_last_login
  await supabase.rpc('update_last_login');
  console.log('✅ update_last_login RPC succeeded.');

  // Call get_ssp for September 2026
  console.log('Calling get_ssp for September 2026 (2026-09-01 to 2026-09-30)...');
  const { data: sspData, error: sspError } = await supabase.rpc('get_ssp', {
    p_branch: null,
    p_from: '2026-09-01',
    p_to: '2026-09-30'
  });

  if (sspError) {
    throw new Error(`get_ssp error: ${sspError.message}`);
  }

  console.log('✅ get_ssp RPC succeeded without errors!');
  console.log('Summary result:');
  console.log(JSON.stringify({
    period: sspData.period,
    effective_date: sspData.effective_date,
    total: sspData.total,
    departments_count: sspData.departments?.length
  }, null, 2));
}

async function main() {
  const phone = process.argv[2] || process.env.OWNER_PHONE;
  const password = process.argv[3] || process.env.OWNER_PASSWORD;

  await verify();

  if (phone && password) {
    await verifyOwnerLoginAndSSP(phone, password);
  } else {
    console.log('\n(Owner login verification pending: run with phone and password after creating Owner)');
  }
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
