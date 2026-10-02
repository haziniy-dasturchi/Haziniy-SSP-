import { SSPResponse, AIAnalysisResult, SSPMetricItem } from '../types/database';
import { formatPercent } from '../i18n/uz';

/**
 * Domain-specific root causes for education / training centers (Haziniy SSP)
 */
const METRIC_CAUSES: Record<string, string[]> = {
  M1: [
    "Ijtimoiy tarmoqlardagi reklama byudjetining yetarli emasligi yoki targeting noto'g'ri sozlanganligi",
    "Reklama kreativi va vizual kontentning maqsadli auditoriyani yetarlicha jalb qilmayotganligi",
    "Mavsumiy talabning pasayishi yoki reklama kanallarining to'yinganligi",
  ],
  M2: [
    "Reklamadan tashrif buyurgan foydalanuvchilar uchun taklif (offer) yoki sahifaning qiziqarsizligi",
    "Izohlar va to'g'ridan-to'g'ri xabarlarga (Direct/Telegram) javob berish tezligining sekinligi",
  ],
  M3: [
    "Lid magnit yoki bepul ochiq dars takliflarining yetarli darajada jozibador emasligi",
    "Aloqa formalarini to'ldirish bosqichidagi texnik yoki tushunarsiz to'siqlar",
  ],
  S1: [
    "Marketing kanallaridan kiruvchi yangi lidlar oqimining rejalashtirilgandan pastligi",
    "CRM tizimiga lidlarni integratsiya qilishda uzilishlar yoki kechikishlar",
  ],
  S2: [
    "Menejerlarning yangi lidlar bilan dastlabki 15 daqiqa ichida bog'lanmasligi",
    "Mijoz ehtiyojini aniqlash va sinov darsiga qiziqtirish bo'yicha skriptlarning mukammal emasligi",
    "Qo'ng'iroqlarga javob bermagan lidlar bilan qayta aloqa (follow-up) tizimining sustligi",
  ],
  S3: [
    "Sinov darsidan so'ng mijozlar bilan to'lovga olib boruvchi yopish (closing) bosqichining sustligi",
    "Kurslar narxi yoki to'lov shartlari bo'yicha mijozlar e'tirozlari to'liq bartaraf etilmaganligi",
    "O'quv guruhlari vaqtlari yoki kunlarining mijozlarga to'g'ri kelmasligi",
  ],
  S4: [
    "Sotuv menejerlarining e'tirozlar bilan ishlash ko'nikmasining pastligi",
    "Sinov darslariga kelish (show-up rate) ko'rsatkichining pastligi",
    "Menejerlar o'rtasida motivatsiya va KPI nazoratining yetarli emasligi",
  ],
  O1: [
    "Yangi qabul qilingan o'quvchilar soni ketayotganlar sonini qoplay olmayotganligi",
    "Guruhlar sig'imi va to'lalik darajasining pastligi",
  ],
  O2: [
    "O'qitish metodikasi, dars sifati yoki o'qituvchidan o'quvchilarning qoniqmasligi",
    "O'quvchilarning o'zlashtirishini muntazam tekshirish va qiyinchiliklarni erta aniqlash yo'lga qo'yilmaganligi",
    "O'quv markazi ichki sharoitlari yoki dars jadvallarining o'zgarishi",
  ],
  O3: [
    "O'quvchilar davomati bo'yicha ota-onalar bilan kunlik avtomatlashgan aloqaning yo'qligi",
    "Mavsumiy kasalliklar yoki maktab/universitet darslari bilan to'qnashuvlar",
  ],
  O4: [
    "Ustozlar tomonidan faol o'quvchilarni do'stlarini taklif qilishga rag'batlantirish tizimi yo'qligi",
    "Tavsiya (referral/bonus) dasturi bo'yicha targ'ibotning yetarli emasligi",
  ],
  F1: [
    "Oylik o'quv to'lovlarining o'z vaqtida undirilmasligi (debitorlik qarzdorligi)",
    "Yangi ochilgan guruhlarning to'liq to'lmasdan boshlanganligi natijasida tushumning kamayishi",
  ],
  F2: [
    "Rejadan tashqari xo'jalik yoki ma'muriy xarajatlarning ko'payib ketishi",
    "Xarajatlar limitlari va smetasi ustidan moliyaviy nazoratning yetarli emasligi",
  ],
  F3: [
    "Kirim rejasining to'liq bajarilmasligi yoki kutilmagan operatsion xarajatlarning oshishi",
    "Rentabelligi past yoki zararga ishlayotgan alohida guruhlarning mavjudligi",
  ],
  H1: [
    "O'quvchilar va ota-onalar o'rtasida ustozlar faoliyatini baholovchi muntazam so'rovnomalar o'tkazilmasligi",
    "Ustozlar uchun malaka oshirish va pedagogik treninglarning yetishmasligi",
  ],
};

/**
 * Generate intelligent, comprehensive Balanced Scorecard Operational Analysis
 */
export function generateBSCAnalysis(
  sspData: SSPResponse,
  branchName?: string
): AIAnalysisResult {
  const allMetrics: Array<SSPMetricItem & { departmentName: string }> = [];

  sspData.departments?.forEach((dept) => {
    dept.metrics?.forEach((m) => {
      allMetrics.push({
        ...m,
        departmentName: dept.name,
      });
    });
  });

  // Calculate metrics with actual facts/plans
  const evaluatedMetrics = allMetrics.filter(
    (m) => m.pct !== null && m.pct !== undefined && !isNaN(m.pct)
  );

  // Sort by lowest percentage first
  evaluatedMetrics.sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  const weakestList: AIAnalysisResult['weakest'] = [];
  const strengthsList: string[] = [];
  const recommendations: AIAnalysisResult['recommendations'] = [];

  if (evaluatedMetrics.length > 0) {
    // 1. Weakest metrics (up to 4 lowest, with pct < 0.95 or bottom half)
    const weakCandidates = evaluatedMetrics.filter((m) => (m.pct ?? 0) < 0.95);
    const targetWeak = weakCandidates.length > 0 ? weakCandidates.slice(0, 4) : evaluatedMetrics.slice(0, 2);

    targetWeak.forEach((m) => {
      const pctVal = m.pct ?? 0;
      const gap = Math.max(1, Math.round((1 - pctVal) * 100));
      const causes = METRIC_CAUSES[m.code] || [
        `${m.name} bo'yicha operatsion jarayonlarning tizimli nazorat qilinmaganligi`,
        `Maqsadli rejaga nisbatan kunlik monitoring va tezkor choralar yetishmasligi`,
      ];

      weakestList.push({
        metric_code: `${m.code} (${m.name})`,
        pct: pctVal,
        gap,
        likely_causes: causes,
      });

      // Generate actionable recommendation for each weak metric
      if (m.code.startsWith('S') || m.departmentName.toLowerCase().includes('sotuv')) {
        recommendations.push({
          action: `${m.name} (${m.code}) ko'rsatkichini oshirish uchun lidlar bilan 15 daqiqalik tezkor aloqa SLA standartini va yangi skriptlarni joriy qilish`,
          owner_role: "Sotuv bo'limi boshlig'i",
          deadline_days: 7,
          expected_effect: `Konversiyani oshirish va ${m.code} bo'yicha orqada qolishni (${gap}%) qisqartirish`,
        });
      } else if (m.code.startsWith('O') || m.departmentName.toLowerCase().includes('o\'quv')) {
        recommendations.push({
          action: `${m.name} bo'yicha xavf ostidagi o'quvchilar ro'yxatini shakllantirish, ota-onalar bilan individual muloqot va dars sifati auditini o'tkazish`,
          owner_role: "O'quv ishlari mudiri",
          deadline_days: 10,
          expected_effect: `O'quvchilar saqlab qolish darajasini 95% ga yetkazish va ${m.code} ni normaga keltirish`,
        });
      } else if (m.code.startsWith('F') || m.departmentName.toLowerCase().includes('moliya')) {
        recommendations.push({
          action: `Oylik abonent to'lovlarini muddatidan oldin undirish uchun avtomatlashtirilgan eslatmalar va chegirma rag'batlarini ishga tushirish`,
          owner_role: "Moliya bo'limi",
          deadline_days: 14,
          expected_effect: `Debitorlikni bartaraf etish va Kirim/Foyda rejasini to'liq 100% ga yetkazish`,
        });
      } else if (m.code.startsWith('M') || m.departmentName.toLowerCase().includes('marketing')) {
        recommendations.push({
          action: `Reklama kanallarining samaradorligini tahlil qilib, byudjetni yuqori konversiyali kreativlarga yo'naltirish`,
          owner_role: "Marketing menejeri",
          deadline_days: 5,
          expected_effect: `Sifatli lidlar oqimini 25% ga ko'paytirish`,
        });
      } else {
        recommendations.push({
          action: `${m.name} bo'yicha kunlik monitoring tartibini joriy etish va mas'ul xodimlarga aniq vazifalar biriktirish`,
          owner_role: "Boshqaruvchi / Direktor",
          deadline_days: 10,
          expected_effect: `Ko'rsatkichni reja darajasiga ko'tarish`,
        });
      }
    });

    // 2. Strengths (metrics with pct >= 1.0 or top performers)
    const strongCandidates = evaluatedMetrics.filter((m) => (m.pct ?? 0) >= 0.95);
    const targetStrong = strongCandidates.length > 0 ? strongCandidates : evaluatedMetrics.slice(-2);

    targetStrong.forEach((m) => {
      const pctStr = formatPercent(m.pct ?? 0);
      strengthsList.push(
        `${m.code} (${m.name}) — reja ${pctStr} darajasida muvaffaqiyatli bajarilmoqda. Ushbu yo'nalishdagi tizimli tajribani boshqa bo'limlarga ham tatbiq etish tavsiya etiladi.`
      );
    });
  } else {
    // If no fact/plan data entered yet for selected period
    weakestList.push({
      metric_code: "Faktlar kiritilmagan",
      pct: 0,
      gap: 100,
      likely_causes: [
        "Tanlangan davr uchun kundalik faktlar yoki oylik rejalar hali to'liq kiritilmagan",
        "Filial ma'murlari tomonidan kunlik hisobotlar to'ldirilishi kechikmoqda",
      ],
    });

    strengthsList.push(
      "Balanced Scorecard tuzilmasi, bo'limlar vaznlari va ko'rsatkichlar mezonlari tizimda to'g'ri shakllantirilgan."
    );

    recommendations.push(
      {
        action: "Barcha filial adminlariga 'Fakt kiritish' sahifasi orqali har kunlik operatsion ko'rsatkichlarni kiritishni topshirish",
        owner_role: "Filial admini",
        deadline_days: 2,
        expected_effect: "Aniq va haqqoniy tahlil uchun birlamchi ma'lumotlar bazasini yaratish",
      },
      {
        action: "Oylik Rejalar jadvalida joriy oy uchun maqsadli ko'rsatkichlar tasdiqlanganligini tekshirish",
        owner_role: "Boshqaruvchi",
        deadline_days: 3,
        expected_effect: "Bajarilish monitoringi uchun asos yaratish",
      }
    );
  }

  // Ensure recommendations has at least 3 items
  if (recommendations.length < 3) {
    recommendations.push({
      action: "Haftalik operatsion yig'ilishda barcha bo'lim rahbarlari bilan ko'rsatkichlar dinamikasini ko'rib chiqish",
      owner_role: "Boshqaruvchi / Direktor",
      deadline_days: 7,
      expected_effect: "Bo'limlar o'rtasida muvofiqlashtirishni kuchaytirish va xatolarni tezkor bartaraf etish",
    });
  }

  // Build Executive Summary
  const branchLabel = branchName || "Barcha filiallar";
  const totalPct = sspData.total?.pct !== null && sspData.total?.pct !== undefined
    ? formatPercent(sspData.total.pct)
    : "reja kutilmoqda";

  const totalStatusText =
    sspData.total?.status === 'green'
      ? "a'lo va barqaror darajada"
      : sspData.total?.status === 'amber'
      ? "o'rtacha (diqqat talab) holatda"
      : sspData.total?.status === 'red'
      ? "xavfli (kechiktirib bo'lmas choralar talab etuvchi) holatda"
      : "shakllantirilish bosqichida";

  const summary =
    `📌 ${branchLabel} bo'yicha Balanced Scorecard tahlili (${sspData.period.from} — ${sspData.period.to}):\n\n` +
    `Umumiy samaradorlik ko'rsatkichi ${totalPct} ni tashkil qilmoqda va faoliyat ${totalStatusText}.\n` +
    (evaluatedMetrics.length > 0
      ? `Tahlil qilingan ${evaluatedMetrics.length} ta ko'rsatkichdan ${strengthsList.length} tasida ijobiy o'sish tendensiyasi kuzatilgan, biroq ${weakestList.length} ta ko'rsatkich rejadagi marradan orqada qolmoqda. ` +
        `Asosiy e'tiborni eng katta tafovutga ega bo'lgan yo'nalishlarga qaratish va quyida ko'rsatilgan amaliy chora-tadbirlarni zudlik bilan ijroga qaratish tavsiya etiladi.`
      : `Tanlangan davr uchun birlamchi operatsion faktlar to'liq kiritilmagan. To'liq va chuqur tahlilga ega bo'lish uchun avval faktik ko'rsatkichlarni kiritish zarur.`);

  return {
    summary,
    weakest: weakestList,
    recommendations,
    strengths: strengthsList,
  };
}

/**
 * Direct Google Gemini API call with client API Key
 */
export async function callGeminiDirectly(
  apiKey: string,
  inputData: Record<string, unknown>,
  model = 'gemini-1.5-flash'
): Promise<AIAnalysisResult> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction =
    "Siz ta'lim markazi uchun operatsion maslahatchi (consultant) sifatida ishlaysiz. " +
    "Faqat taqdim etilgan raqamlarga asoslanib javob bering. " +
    "Agar ma'lumot yetarli bo'lmasa, 'ma'lumot yetarli emas' deb yozing. " +
    "Barcha javoblarni o'zbek tilida (lotin alifbosida) yozing.";

  const userPrompt =
    "Quyidagi Balanced Scorecard ma'lumotlarini tahlil qiling va STRICT JSON formatida javob bering: " +
    '{"summary": string, "weakest": [{"metric_code": string, "pct": number, "gap": number, "likely_causes": string[]}], ' +
    '"recommendations": [{"action": string, "owner_role": string, "deadline_days": number, "expected_effect": string}], "strengths": string[]}\n\n' +
    "Ma'lumotlar:\n" +
    JSON.stringify(inputData);

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API xatosi (${res.status}): ${errorText.slice(0, 150)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(rawText) as AIAnalysisResult;
  } catch {
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as AIAnalysisResult;
    }
    throw new Error("Gemini javobini JSON formatida o'qib bo'lmadi");
  }
}
