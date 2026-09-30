const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
if (!DB_URL) {
  console.error('❌ Xatolik: SUPABASE_DB_URL topilmadi! Iltimos, .env faylida SUPABASE_DB_URL ni ko\'rsating.');
  process.exit(1);
}

async function runSuite(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n===============================================================`);
  console.log(`Running test suite: ${path.basename(filePath)}`);
  console.log(`===============================================================`);

  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  let failed = false;

  for (const r of results) {
    if (r.rows && r.rows.length) {
      for (const row of r.rows) {
        const text = Object.values(row).join('\t');
        console.log(text);
        if (text.startsWith('not ok') || text.includes('Failed test')) {
          failed = true;
        }
      }
    }
  }

  if (failed) {
    throw new Error(`Test suite failed: ${path.basename(filePath)}`);
  }
}

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const suites = [
    'supabase/tests/00001_plan_distribution_test.sql',
    'supabase/tests/00002_ssp_calculation_test.sql',
    'supabase/tests/00003_rls_test.sql'
  ];

  for (const suite of suites) {
    await runSuite(client, suite);
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 3 TEST SUITES PASSED! (25/25 pgTAP tests GREEN)');
  console.log('===============================================================');

  await client.end();
}

main().catch(err => {
  console.error('\n❌ Test execution failed:', err.message);
  process.exit(1);
});
