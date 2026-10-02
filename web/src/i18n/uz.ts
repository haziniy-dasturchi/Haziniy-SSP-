// Uzbek Latin Localization — Single Source of Truth

export const uz = {
  appName: 'Haziniy SSP',
  appTagline: 'Balanced Scorecard tizimi',

  // Navigation
  nav: {
    ssp: 'SSP',
    facts: 'Fakt kiritish',
    plans: 'Rejalar',
    bonus: 'Bonusim',
    ai: 'AI Tahlil',
    branches: 'Filiallar',
    structure: 'Tuzilma',
    roles: 'Rollar',
    users: 'Xodimlar',
    evaluation: 'Baholash',
    import: 'Import',
    audit: 'Audit log',
    profile: 'Profilim',
    logout: 'Chiqish',
    menu: 'Menyu',
  },

  // Auth & Login
  auth: {
    loginTitle: 'Tizimga kirish',
    loginSubtitle: 'Hisobingizga kirish uchun telefon raqam va parolingizni kiriting',
    phoneLabel: 'Telefon raqam',
    phonePlaceholder: '+998 (__) ___-__-__',
    passwordLabel: 'Parol',
    passwordPlaceholder: 'Parolingizni kiriting',
    signInButton: 'Kirish',
    signingIn: 'Kirilmoqda...',
    errorTitle: 'Kirishda xatolik',
    invalidCredentials: 'Telefon raqam yoki parol noto\'g\'ri',
    accountInactive: 'Sizning hisobingiz faol emas. Rahbariyatga murojaat qiling.',
    noPermission: 'Sizda bu sahifani ko\'rish huquqi yo\'q',
    logoutConfirm: 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
  },

  // Scorecard (SSP)
  ssp: {
    title: 'Balanced Scorecard',
    totalScore: 'Umumiy natija',
    effectiveDateNotice: 'Reja {date} gacha bo\'lgan qismi bilan solishtirildi',
    showFullPlan: 'To\'liq davr rejasini ko\'rsatish',
    showToDatePlan: 'Keltirilgan rejani ko\'rsatish',
    weight: 'Vazn',
    plan: 'Reja',
    fact: 'Fakt',
    diff: 'Farq',
    fulfilment: 'Bajarilish',
    status: 'Holat',
    sparkline: 'Dinamika',
    allBranches: 'Barcha filiallar',
    emptyMetrics: 'Ushbu bo\'limda hozircha ko\'rsatkichlar yo\'q',
    noDataPeriod: 'Tanlangan davr uchun ma\'lumotlar mavjud emas',
  },

  // Metric Details
  metric: {
    grainDay: 'Kunlik',
    grainWeek: 'Haftalik',
    grainMonthWeek: 'Oy haftalari',
    grainMonth: 'Oylik',
    cumulative: 'Jamlanuvchi',
    dailyTargetNeeded: 'Kuniga kerak',
    dailyFor100: '100% ga yetish uchun kuniga',
    dailyFor90: '90% ga yetish uchun kuniga',
    remainingDays: 'Qolgan ish kunlari',
    unit: 'Birlik',
    direction: 'Yo\'nalish',
    higherBetter: 'Ko\'p bo\'lgani yaxshi',
    lowerBetter: 'Kam bo\'lgani yaxshi',
    weekTable: 'Haftalik taqsimot',
    monthWeeks: {
      w1: '1–7 kunlar',
      w2: '8–14 kunlar',
      w3: '15–21 kunlar',
      w4: '22–oxiri',
    },
  },

  // Facts Entry
  facts: {
    title: 'Kunlik fakt kiritish',
    today: 'Bugun',
    yesterday: 'Kecha',
    dateLabel: 'Sana',
    todayPlan: 'Bugungi reja',
    lastValue: 'Oxirgi qiymat',
    enteredBy: 'Kiritgan',
    saveAll: 'Saqlash',
    saving: 'Saqlanmoqda...',
    saveSuccess: 'Barcha faktlar muvaffaqiyatli saqlandi',
    unsavedChangesWarn: 'Saqlanmagan o\'zgarishlar bor! Chiqib ketmoqchimisiz?',
    readOnlyNotice: 'Ushbu sana uchun fakt tahrirlash muddati o\'tgan (faqat o\'qish mumkin)',
    noEnterableMetrics: 'Sizda fakt kiritish ruxsati berilgan metrikalar yo\'q',
  },

  // Monthly Plans
  plans: {
    title: 'Oylik rejalar jadvali',
    copyFromPrevious: 'O\'tgan oydan nusxa',
    growthPct: 'O\'sish foizi (%)',
    copySuccess: '{count} ta ko\'rsatkich rejasi ko\'chirildi',
    savePlans: 'Rejalarni saqlash',
    dailyDistributionDrawer: 'Kunlik taqsimot ko\'rinishi',
    monthlyTotal: 'Oylik reja',
    dailySum: 'Kunlar yig\'indisi',
    sumMatches: 'Yig\'indi oylik rejaga teng',
    sumMismatch: 'Diqqat: Kunlar yig\'indisi oylik rejaga teng emas!',
  },

  // Bonus
  bonus: {
    title: 'Mening bonusim',
    managerTitle: 'Xodimlar bonusi',
    selectEmployee: 'Xodimni tanlang',
    baseAmount: 'Asosiy stavka',
    calculatedBonus: 'Hisoblangan bonus',
    score: 'Ko\'rsatkich bali',
    coefficient: 'Koeffitsiyent',
    belowThreshold: 'Minimal bonus chegarasiga (90%) yetmadi',
    gapHints: 'Bonusni oshirish uchun tavsiyalar',
  },

  // AI Analysis
  ai: {
    title: 'AI Operatsion Tahlil',
    analyzeBtn: 'Tahlil qilish',
    analyzing: 'Tahlil qilinmoqda...',
    summary: 'Qisqacha xulosa',
    weakest: 'Eng zaif ko\'rsatkichlar',
    gap: 'Rejadan orqada',
    likelyCauses: 'Ehtimoliy sabablar',
    recommendations: 'Tavsiyalar',
    action: 'Amal',
    ownerRole: 'Mas\'ul rol',
    deadlineDays: 'Muddat',
    expectedEffect: 'Kutilayotgan samara',
    strengths: 'Kuchli tomonlar',
    history: 'Avvalgi tahlillar tarixi',
    dailyLimitReached: 'Kunlik tahlil limiti tugadi (20 ta)',
  },

  // Periods
  periods: {
    today: 'Bugun',
    yesterday: 'Kecha',
    this_week: 'Bu hafta',
    last_week: 'O\'tgan hafta',
    this_month: 'Bu oy',
    last_month: 'O\'tgan oy',
    quarter: 'Chorak',
    year: 'Yil',
    custom: 'Dan – gacha',
  },

  // Months
  months: [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktyabr',
    'Noyabr',
    'Dekabr',
  ],

  // Days of week (Monday first)
  days: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
  daysShort: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],

  // Common UI
  common: {
    loading: 'Yuklanmoqda...',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    delete: 'O\'chirish',
    edit: 'Tahrirlash',
    create: 'Qo\'shish',
    actions: 'Amallar',
    search: 'Qidirish...',
    filter: 'Filtr',
    active: 'Faol',
    inactive: 'Nofaol',
    status: 'Holat',
    confirmDeleteTitle: 'O\'chirishni tasdiqlaysizmi?',
    confirmDeleteMsg: 'Ushbu amalni ortga qaytarib bo\'lmaydi.',
    empty: 'Ma\'lumot topilmadi',
    error: 'Xatolik yuz berdi',
    success: 'Muvaffaqiyatli bajarildi',
  },
};

// ============================================================================
// Formatters
// ============================================================================

/**
 * Currency formatter: 1 234 567 so'm
 */
export function formatMoney(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const rounded = Math.round(val);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} so'm`;
}

/**
 * Integer count formatter: 1 234
 */
export function formatCount(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const rounded = Math.round(val);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Percentage formatter: 92.5%
 */
export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  // Negative values in this system are differences or percentage changes (e.g. -14.7%), never ratios.
  // Positive values: if val > 2, it is already in percentage format (e.g. 95.4 -> 95.4%);
  // otherwise it represents a ratio between 0 and 2 (e.g. 0.954 -> 95.4%, 1.2 -> 120.0%).
  const pctVal = val < 0 ? val : (val > 2 ? val : val * 100);
  return `${pctVal.toFixed(decimals)}%`;
}

/**
 * Metric value formatter based on unit
 */
export function formatMetricValue(
  val: number | null | undefined,
  unit: 'count' | 'money' | 'percent',
  isDiff = false
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (unit === 'money') return formatMoney(val);
  if (unit === 'percent') {
    if (isDiff) {
      // Differences for percentage metrics are always already in percentage points (e.g. -14.7, +1.5)
      return `${val.toFixed(1)}%`;
    }
    return formatPercent(val);
  }
  return formatCount(val);
}

/**
 * Metric difference formatter (Farq)
 */
export function formatMetricDiff(
  val: number | null | undefined,
  unit: 'count' | 'money' | 'percent'
): string {
  return formatMetricValue(val, unit, true);
}

/**
 * Date formatter: DD.MM.YYYY
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Month name and year: Oktyabr 2026
 */
export function formatMonthYear(monthStr: string | Date): string {
  const d = typeof monthStr === 'string' ? new Date(monthStr) : monthStr;
  const monthIndex = d.getMonth();
  const year = d.getFullYear();
  return `${uz.months[monthIndex]} ${year}`;
}
