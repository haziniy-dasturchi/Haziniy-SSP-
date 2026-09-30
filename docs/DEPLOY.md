# Haziniy SSP — Joylashtirish (Deployment) Qo'llanmasi

Ushbu qo'llanma orqali dasturchi bo'lmagan foydalanuvchi ham **Haziniy SSP** veb-ilovasini bir necha daqiqada global internetga bepul va xavfsiz joylashtirishi (deploy qilishi) mumkin.

---

## 1. Vercel orqali joylashtirish (Tavsiya etiladi)

Vercel — Vite va React ilovalari uchun eng qulay va tezkor global hosting platformasi.

### 1-qadam: Vercel hisobiga kirish
1. Brauzeringizda [vercel.com](https://vercel.com) saytiga kiring.
2. O'z hisobingizga kiring yoki GitHub orqali ro'yxatdan o'ting (**Sign Up with GitHub**).

### 2-qadam: Yangi loyiha qo'shish
1. Boshqaruv panelida (Dashboard) o'ng yuqoridagi **"Add New..."** tugmasini bosing va **"Project"** ni tanlang.
2. Ro'yxatdan **`haziniy-dasturchi/Haziniy-SSP-`** (yoki o'zingizning GitHub repozitoriynigiz)ni toping va **"Import"** tugmasini bosing.

### 3-qadam: Sozlamalarni kiritish
Ochilgan konfiguratsiya oynasida quyidagilarni belgilang:
- **Project Name:** `haziniyssp` (shunda ilovangiz manzili to'g'ridan-to'g'ri `https://haziniyssp.vercel.app` bo'ladi).
- **Framework Preset:** `Vite` (odatda avtomatik aniqlanadi).
- **Root Directory:** Yonidagi **"Edit"** tugmasini bosing va `web` papkasini tanlang (yoki maydonga `web` deb yozing).

### 4-qadam: Muhit o'zgaruvchilari (Environment Variables)
**"Environment Variables"** bo'limini oching va ikkita o'zgaruvchini kiriting:

1. **Birinchi o'zgaruvchi:**
   - **Key (Nomi):** `VITE_SUPABASE_URL`
   - **Value (Qiymati):** `https://wyvaqahmlgwavaupwluw.supabase.co`
   - **"Add"** tugmasini bosing.

2. **Ikkinchi o'zgaruvchi:**
   - **Key (Nomi):** `VITE_SUPABASE_ANON_KEY`
   - **Value (Qiymati):** Sizning yangi yangilangan `anon` publishable kalitingiz (masalan, `.env` faylingizdagi qiymat).
   - **"Add"** tugmasini bosing.

> ⚠️ **Muhim:** Hech qachon `service_role` maxfiy kalitini bu yerga yoki frontendga kiritmang! Faqat `anon` kalit kiritiladi.

### 5-qadam: Deploy tugmasini bosish
1. Pastdagi ko'k **"Deploy"** tugmasini bosing.
2. 1–2 daqiqa kuting. Jarayon tugagach ekranda mushakbozlik (confetti) va sizning jonli manzilingiz ko'rinadi:
   👉 **`https://haziniyssp.vercel.app`**

### 6-qadam: Supabase Auth sozlamalarini yangilash
Ilovangiz muammosiz autentifikatsiya qilishi uchun:
1. [supabase.com/dashboard](https://supabase.com/dashboard) ga kiring.
2. `wyvaqahmlgwavaupwluw` loyihangizni tanlang.
3. Chap menyudan **Authentication** ➔ **URL Configuration** bo'limiga o'ting.
4. **Site URL** maydoniga `https://haziniyssp.vercel.app` manzilini qo'ying.
5. **Redirect URLs** ro'yxatiga `https://haziniyssp.vercel.app/**` manzilini qo'shing va **Save** tugmasini bosing.

---

## 2. Cloudflare Pages orqali joylashtirish (Muqobil variant)

Repozitoriyda Cloudflare Pages uchun kerakli bo'lgan barcha marshrutlash qoidalari (`web/public/_redirects`) allaqachon tayyorlangan.

### 1-qadam: Cloudflare hisobiga kirish
1. [dash.cloudflare.com](https://dash.cloudflare.com) ga kiring.
2. Chap menyudan **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git** tugmasini bosing.

### 2-qadam: Loyihani ulash
1. GitHub hisobingizni ulab, **`Haziniy-SSP-`** repozitoriysini tanlang.
2. **Begin setup** tugmasini bosing.

### 3-qadam: Build sozlamalari
- **Project name:** `haziniyssp`
- **Production branch:** `master`
- **Framework preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `web`

### 4-qadam: Environment Variables
**Environment variables (advanced)** bo'limida Vercel bilan bir xil ikkita o'zgaruvchini qo'shing:
- `VITE_SUPABASE_URL`: `https://wyvaqahmlgwavaupwluw.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `<sizning-anon-kalitingiz>`

### 5-qadam: Deploy
**Save and Deploy** tugmasini bosing. Ilova tayyor bo'ladi va sizga `https://haziniyssp.pages.dev` manzili taqdim etiladi.

---

## 3. PWA (Mobil Ilova Sifatida O'rnatish)

"Haziniy SSP" to'liq Progressive Web App (PWA) sifatida yaratilgan.
1. Telefoningizda (Safari yoki Google Chrome) sayt manziliga kiring (masalan `https://haziniyssp.vercel.app`).
2. **iPhone (Safari):** Pastdagi "Share" (Ulashish) tugmasini bosing ➔ **"Add to Home Screen" (Bosh ekranga qo'shish)** ni tanlang.
3. **Android (Chrome):** Yuqori o'ngdagi uch nuqta ➔ **"Install app" (Ilovani o'rnatish)** yoki **"Add to Home Screen"** ni bosing.
4. Telefoningiz ekranida "Haziniy SSP" logotipi tushirilgan mobil ilova paydo bo'ladi. Xodimlar uni xuddi oddiy mobil ilova kabi ochib, foydalanishlari mumkin!
