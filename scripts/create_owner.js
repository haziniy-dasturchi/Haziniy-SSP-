const fs = require('fs');
const path = require('path');
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Xatolik: SUPABASE_URL muhit o\'zgaruvchisi topilmadi! Iltimos, .env faylida SUPABASE_URL ni ko\'rsating.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Xatolik: SUPABASE_SERVICE_ROLE_KEY muhit o\'zgaruvchisi topilmadi! Iltimos, .env faylida SUPABASE_SERVICE_ROLE_KEY ni ko\'rsating.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createOwner(phone, password, fullName = 'Boshqaruvchi') {
  if (!phone || !/^998\d{9}$/.test(phone)) {
    throw new Error("Telefon raqami noto'g'ri (998 bilan boshlanuvchi 12 ta raqam bo'lishi kerak)");
  }
  if (!password || password.length < 8) {
    throw new Error("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
  }

  const syntheticEmail = `${phone}@users.haziniyssp.app`;
  console.log(`Owner yaratilmoqda: ${phone} (${syntheticEmail})...`);

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('phone', phone)
    .maybeSingle();

  if (existingProfile) {
    throw new Error(`Bu telefon raqam (${phone}) bilan profil allaqachon mavjud!`);
  }

  // Create Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    password: password,
    email_confirm: true,
    phone: phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    throw authError;
  }

  const userId = authData.user.id;
  console.log(`Auth user yaratildi. ID: ${userId}`);

  // Insert profile with Boshqaruvchi role and is_owner = true
  const roleId = 'ca000000-0000-0000-0000-000000000001'; // Boshqaruvchi
  const branchId = 'a0000000-0000-0000-0000-000000000001'; // Haziniy (Farg'ona)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName,
      phone: phone,
      role_id: roleId,
      branch_id: branchId,
      is_owner: true,
      is_active: true
    })
    .select()
    .single();

  if (profileError) {
    // Cleanup auth user on failure
    await supabase.auth.admin.deleteUser(userId);
    throw profileError;
  }

  console.log('✅ Owner profili muvaffaqiyatli yaratildi:');
  console.log(JSON.stringify(profile, null, 2));
  return profile;
}

const args = process.argv.slice(2);
const phone = args[0] || process.env.OWNER_PHONE;
const password = args[1] || process.env.OWNER_PASSWORD;
const name = args[2] || process.env.OWNER_NAME || 'Boshqaruvchi';

if (!phone || !password) {
  console.log('Foydalanish: node scripts/create_owner.js <phone> <password> [full_name]');
  console.log('Misol: node scripts/create_owner.js 998901234567 MySecretPass123! "Boshqaruvchi"');
  process.exit(1);
}

createOwner(phone, password, name)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Xatolik:', err.message || err);
    process.exit(1);
  });
