/** TadbirkorAI — "Noldan Foydaga" journey engine (UI-agnostic). */

export interface JourneyStage {
  id: number;
  name: string;
  goal: string;
}

export const JOURNEY_STAGES: JourneyStage[] = [
  { id: 0, name: "Tanishuv", goal: "Profil va boshlash nuqtasi" },
  { id: 1, name: "G‘oya", goal: "Aniq biznes konsepsiyasi" },
  { id: 2, name: "Bozor", goal: "Talab va raqobat tekshiruvi" },
  { id: 3, name: "Biznes-reja", goal: "Moliyaviy model va breakeven" },
  { id: 4, name: "Yuridik", goal: "YaTT/MChJ va soliq rejimi" },
  { id: 5, name: "Moliyalashtirish", goal: "Kredit / kapital rejasi" },
  { id: 6, name: "Joy", goal: "Makon va infratuzilma" },
  { id: 7, name: "Ishga tushirish", goal: "Ochilish checklisti" },
  { id: 8, name: "Monitoring", goal: "Kundalik moliyaviy nazorat" },
  { id: 9, name: "O‘sish", goal: "Kengayish va barqarorlik" },
];

export interface CoachReply {
  message: string;
  stage: number;
  quickReplies?: string[];
  navigateTo?:
    | "business-plan"
    | "analytics"
    | "credit-matching"
    | "tasks"
    | "home";
  toolResult?: string;
}

const BLOCKED =
  /(karta\s*raqam|cvv|cvc|otp|sms\s*kod|bank\s*parol|pin\s*kod|password)/i;

export function isSensitiveRequest(text: string): boolean {
  return BLOCKED.test(text);
}

export function sensitiveRefusal(): CoachReply {
  return {
    message:
      "Xavfsizlik uchun karta raqami, CVV, OTP yoki bank parolini chatda so‘ramayman va qabul qilmayman. Monitoring faqat rasmiy xavfsiz kanal orqali bo‘ladi. Boshqa qanday yordam kerak?",
    stage: 8,
    quickReplies: ["Haftalik hisobot", "Soliq eslatma", "Kredit topish", "Biznes reja"],
  };
}

function stageLabel(stage: number) {
  const s = JOURNEY_STAGES.find((x) => x.id === stage) ?? JOURNEY_STAGES[0];
  return `${s.id}/9-bosqich: ${s.name}`;
}

export function welcomeReply(): CoachReply {
  return {
    message:
      "Salom! Men TadbirkorAI — biznesingizni noldan foydaga olib chiqishda hamrohingizman.\n\nAvvalo: sizda hali biznes g‘oyasi bormi, yoki hali qidiryapsizmi?",
    stage: 0,
    quickReplies: [
      "G‘oyam bor",
      "Hali qidiryapman",
      "Reja tayyor, kredit kerak",
      "Kredit topish",
      "Biznes reja",
    ],
  };
}

/** One-question coaching reply based on user text + current stage. */
export function coachRespond(
  text: string,
  currentStage: number,
  profile: Record<string, string>,
): CoachReply {
  if (isSensitiveRequest(text)) return sensitiveRefusal();

  const t = text.toLowerCase().trim();

  // Intent shortcuts (original quick replies + master prompt)
  if ((/biznes\s*g[‘']?oya/i.test(t) || t === "biznes g‘oya" || t === "biznes goya") && !/bor|qidir/i.test(t)) {
    return {
      message: `${stageLabel(1)}\n\nBiznes g‘oyangiz haqida qisqacha: qaysi soha, kim uchun, qanday qiymat?`,
      stage: 1,
      quickReplies: ["Savdo", "Xizmat", "Ishlab chiqarish", "Onlayn", "Biznes reja"],
    };
  }

  if (/reklama|marketing/i.test(t)) {
    return {
      message: `${stageLabel(7)}\n\nMarketing uchun: maqsadli auditoriya kim va qaysi kanallar (Telegram, Instagram, mahalla)?`,
      stage: 7,
      quickReplies: ["Telegram", "Instagram", "Mahalla / og‘zaki", "Ochilish checklist"],
    };
  }

  if (/kredit|moliyalashtir|ssuda/i.test(t) || t.includes("reja tayyor, kredit kerak")) {
    return {
      message: `${stageLabel(5)}\n\nAlbatta. Yakuniy qaror bankda — men faqat mos variantlarni taqqoslayman.\n\nBiznesingiz hozir ishlayaptimi?`,
      stage: 5,
      quickReplies: ["Amaldagi biznesim bor", "Yangi boshlayman", "Hali g‘oya bosqichida", "Kredit topish"],
    };
  }

  if (/soliq|qqs|aylanma soliq/i.test(t)) {
    return {
      message: `${stageLabel(4)}\n\nSoliq rejimini aylanma va faoliyat turiga qarab tanlash mumkin. Taxminiy hisob uchun oylik aylanmangiz qancha?`,
      stage: 4,
      quickReplies: ["30 mln gacha", "30–100 mln", "100 mln+", "soliq.uz ga o‘tish"],
    };
  }

  if (/bozor|raqobat|swot|talab/i.test(t)) {
    return {
      message: `${stageLabel(2)}\n\nBozorni tez tekshiramiz. Hududingizda o‘xshash biznes bormi?`,
      stage: 2,
      quickReplies: ["Ha, ko‘p", "Bir-ikkita", "Yo‘q / bilmayman", "Mijoz savollari"],
    };
  }

  if (/biznes\s*reja|breakeven|moliyaviy model/i.test(t) || t === "biznes reja") {
    return {
      message: `${stageLabel(3)}\n\nReja uchun biznes nomi, auditoriya va budjet kerak. Reja sahifasida to‘ldirish mumkin — yoki shu yerda qisqa model chiqaramiz.`,
      stage: 3,
      quickReplies: ["Reja yaratish", "Breakeven hisob", "Kredit bilan bog‘lash"],
      navigateTo: undefined,
    };
  }

  if (/yatt|mchj|ro‘yxat|royxat|litsenziya|my\.gov/i.test(t)) {
    return {
      message: `${stageLabel(4)}\n\nYolg‘iz ishlaysizmi yoki sherik bilanmi? Bu YaTT / MChJ tanloviga ta’sir qiladi.`,
      stage: 4,
      quickReplies: ["Yolg‘iz (YaTT)", "Sherik (MChJ)", "Litsenziya kerakmi?", "Keyingi qadam"],
    };
  }

  if (/joy|ijara|filial|infratuzilma/i.test(t)) {
    return {
      message: `${stageLabel(6)}\n\nFizik joy kerakmi yoki onlayn yetarlimi?`,
      stage: 6,
      quickReplies: ["Fizik joy", "Faqat onlayn", "Ikkalasi", "Ijara mezonlari"],
    };
  }

  if (/ochilish|checklist|ishga tushir/i.test(t)) {
    return {
      message: `${stageLabel(7)}\n\nOchilishdan oldin: 1) jihoz 2) birinchi tovar 3) ijtimoiy sahifa 4) birinchi 10 mijoz rejasi.\n\nQaysi banddan boshlaymiz?`,
      stage: 7,
      quickReplies: ["Jihoz", "Tovar zaxirasi", "Marketing", "Vazifalarga qo‘shish"],
      navigateTo: undefined,
    };
  }

  if (/hisobot|monitoring|haftalik|breakeven progress/i.test(t)) {
    return {
      message: `${stageLabel(8)}\n\n📊 Haftalik hisobot (namuna)\nKirim: 4 200 000 · Chiqim: 3 100 000 · Sof: 1 100 000 so‘m\nEng katta xarajat: tovar-xomashyo\n⏰ Kommunal muddat — 3 kun ichida\nBreakeven sari: ~68%\n\nEslatma: bu demo raqamlar.`,
      stage: 8,
      quickReplies: ["Tahlilni ko‘rish", "Soliq eslatma", "Kredit yukini tekshir"],
    };
  }

  if (/o‘sish|osish|kengay|xodim|filial/i.test(t)) {
    return {
      message: `${stageLabel(9)}\n\nFoyda chiqqach: qayta investitsiya, xodim, yoki o‘sish krediti. Hozir qaysi yo‘nalish yaqinroq?`,
      stage: 9,
      quickReplies: ["Qayta investitsiya", "Xodim yollash", "O‘sish krediti", "Yangi mahsulot"],
    };
  }

  // Stage-specific replies
  if (currentStage === 0 || /g‘oyam bor|hali qidir|tanishuv/i.test(t)) {
    if (/g‘oyam bor|goyam bor/i.test(t)) {
      return {
        message: `${stageLabel(1)}\n\nAjoyib. Qanday mahsulot/xizmat va kim uchun?`,
        stage: 1,
        quickReplies: ["Savdo", "Xizmat", "Ishlab chiqarish", "Onlayn"],
      };
    }
    if (/qidir/i.test(t)) {
      return {
        message: `${stageLabel(0)}\n\nQaysi hududdasiz? Hududga qarab imkoniyatlar farq qiladi.`,
        stage: 0,
        quickReplies: ["Toshkent", "Samarqand", "Qarshi", "Boshqa hudud"],
      };
    }
  }

  if (currentStage === 1 || /savdo|xizmat|ishlab|onlayn/i.test(t)) {
    if (/savdo|xizmat|ishlab|onlayn/i.test(t)) {
      return {
        message: `${stageLabel(1)}\n\nKonsepsiya: “${text}” yo‘nalishi. Bu asosiy ish bo‘ladimi yoki qo‘shimcha daromadmi?`,
        stage: 1,
        quickReplies: ["Asosiy ish", "Qo‘shimcha daromad", "Bozorni tekshirish"],
      };
    }
  }

  if (currentStage === 2) {
    if (/ha|ko‘p|bir-ikkita|yo‘q/i.test(t)) {
      return {
        message: `${stageLabel(2)}\n\nKeyingi qadam: kamida 5 potentsial mijoz bilan gaplashing.\nSavol namunasi: “Hozir shu muammoni qanday yechasiz? Qancha to‘lashga tayyorsiz?”\n\nKeyin biznes-rejaga o‘tamizmi?`,
        stage: 2,
        quickReplies: ["Biznes reja", "Mijoz savollari", "Kredit topish"],
      };
    }
  }

  if (currentStage === 5 || /amaldagi|yangi boshlayman|g‘oya bosqichida|uskuna|tovar|kengaytirish|aylanma/i.test(t)) {
    // Handled partly by credit flow in UI; keep coach helpful
    if (/amaldagi|yangi|g‘oya bosqichida/i.test(t)) {
      return {
        message: `${stageLabel(5)}\n\nKredit nima uchun kerak?`,
        stage: 5,
        quickReplies: ["Uskuna", "Tovar", "Kengaytirish", "Aylanma mablag‘", "Boshqa"],
      };
    }
    if (/uskuna|tovar|kengaytirish|aylanma|boshqa/i.test(t)) {
      return {
        message: `${stageLabel(5)}\n\nTaxminiy summa? (Bu namuna — bank foizlari rasmiy manbada tasdiqlanadi.)`,
        stage: 5,
        quickReplies: ["30 mln", "50 mln", "90 mln", "150 mln", "Kredit variantlari"],
      };
    }
  }

  if (/30 mln gacha|30–100|100 mln\+|soliq\.uz/i.test(t)) {
    const tip =
      /30 mln gacha/i.test(t)
        ? "Kichik aylanmada ko‘pincha soddalashtirilgan / aylanma soliq rejimi muhokama qilinadi."
        : "Aylanma oshganda QQS + foyda solig‘i rejimi ko‘rib chiqiladi.";
    return {
      message: `${stageLabel(4)}\n\n${tip}\nAniq summa uchun soliq.uz yoki buxgalter bilan tasdiqlang. Keyingi qadam?`,
      stage: 4,
      quickReplies: ["Kredit topish", "Biznes reja", "Monitoring"],
    };
  }

  // Default: one clarifying question
  const stage = currentStage;
  return {
    message: `${stageLabel(stage)}\n\nTushundim. Biznesingizda hozir eng katta muammo nima?`,
    stage,
    quickReplies: ["Moliyalashtirish", "Savdo", "Xarajat", "Rivojlanish", "G‘oyani aniqlash"],
    toolResult: profile.name ? undefined : undefined,
  };
}

export function matchPrograms(region: string, purpose: string): string {
  return [
    "Hozirgi umumiy ma’lumotlarga ko‘ra (rasmiy manbada tasdiqlang):",
    "• «Har bir oila — tadbirkor» — oilakredit.uz (Mikrokreditbank, Agrobank, Xalq banki)",
    "• Kichik biznesni qo‘llab-quvvatlash dasturlari (PQ-312 doirasidagi mikrokreditlar)",
    "• Hududiy imtiyozlar — " + (region || "hududingiz") + " uchun alohida shartlar bo‘lishi mumkin",
    "• Raqamli banklar — kichik summalar uchun tezroq ariza",
    "• Qo‘shimcha: finlit.uz — moliyaviy savodxonlik",
    "",
    `Maqsad: ${purpose || "umumiy rivojlantirish"}. Hech bir bankka tarafkashlik qilmayman — faqat taqqoslash.`,
  ].join("\n");
}
