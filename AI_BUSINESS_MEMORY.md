# AI_BUSINESS_MEMORY.md

> Bu fayl — loyihaning uzoq muddatli xotirasi. Har safar yangi vazifa berilganda avval shu fayl o'qiladi, keyin kodga o'tiladi. Har bosqich oxirida "Bajarildi" va "Keyingi qadamlar" bo'limlari yangilanadi.

---

## 0. Loyiha identifikatsiyasi

- **Nomi**: TadbirkorAI (ilgari BusinessOS)
- **Repo**: `github.com/omonovkamolbek76-source/Hackathon2026`
- **Ishchi branch**: `cursor/production-harden-d440` (base: `main`)
- **Maqsad**: O'zbekiston tadbirkorlari uchun AI biznes/moliya yordamchisi — g'oyadan foydaga qadar hamroh bo'ladigan platforma.

---

## 1. Joriy texnik stack (tahlil, 2026-08-17 holatiga ko'ra)

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 13 App Router, React 18, Tailwind, shadcn/ui. SPA — URL-based screen routing yo'q, `lib/store.tsx` (React Context) orqali client-side `screen` state bilan navigatsiya. |
| Backend | Next.js Route Handlers (`app/api/**`) — alohida backend server yo'q, hammasi bitta ilovada. |
| Database | Prisma ORM + SQLite (`prisma/schema.prisma`, `DATABASE_URL=file:./dev.db`). Postgres'ga o'tish yo'li mavjud (`docker-compose.yml`). |
| Auth | Custom: bcrypt (cost 12) + `jose` JWT + httpOnly cookie (`lib/auth.ts`). `sessionVersion` orqali sessiyalarni bekor qilish (MFA yoqilganda/o'chirilganda). MFA — TOTP (`otplib`, `lib/mfa.ts`). Google/Microsoft OAuth/OIDC (`lib/oauth/**`, Authorization Code + PKCE, hisoblar avtomatik birlashtirilmaydi). |
| AI (eski) | ~~OpenAI (`openai` npm paketi, `gpt-4o-mini`)~~ — **OLIB TASHLANDI**. Endi: **Google Gemini** (`lib/gemini/client.ts`, REST orqali, SDK dependency yo'q). Kalit yo'q bo'lsa — lokal qoida-asosidagi murabbiy (`lib/journey.ts`, AI emas, deterministik shablon). |
| To'lovlar | `lib/payments.ts` — local (demo, manual confirm) yoki Stripe (Checkout Session + webhook imzo tekshiruvi). |
| Middleware | `middleware.ts` — CSP + xavfsizlik headerlari + `/api/*` uchun cookie mavjudligini tekshirish (haqiqiy JWT tekshiruvi har bir route handlerda `requireUser()` orqali). |
| Testlar | Vitest, faqat unit/logic testlar (`tests/*.test.ts`), brauzer/E2E test yo'q. |

### Muhim komponentlar joylashuvi
- `app/api/**` — barcha backend endpointlar
- `lib/auth.ts` — sessiya, JWT, MFA-bridge
- `lib/oauth/**` — Google/Microsoft OIDC
- `lib/coach-server.ts` + `lib/journey.ts` — AI/lokal murabbiy mantiqi (`app/api/coach/route.ts` orqali chaqiriladi)
- `lib/store.tsx` — client-side global state (React Context), barcha ekranlar shu orqali API bilan gaplashadi
- `components/screens/*.tsx` — ekranlar (URL route emas, `screen` state)
- `components/app/{sidebar,bottom-nav}.tsx` — navigatsiya
- `prisma/schema.prisma` — DB sxema; `prisma/seed.ts` — boshlang'ich ma'lumotlar

---

## 2. AI Business Copilot — arxitektura reja (62 qoidaning xaritasi)

### 2.1 Asosiy tamoyil (0-4-bo'lim)
**FAQAT Google Gemini.** Boshqa AI provider (OpenAI, Claude va h.k.) ishlatilmaydi. `openai` npm paketi olib tashlandi. Gemini kaliti **faqat backendda** (`GEMINI_API_KEY` / `GEMINI_API_KEY_1..3`, `GEMINI_MODEL` — env orqali, hech qachon hardcode emas, hech qachon frontendga chiqmaydi).

```
USER → FRONTEND → BACKEND (AI Gateway) → Gemini REST API
```

AI faqat: biznes, tadbirkorlik, moliya, platforma vazifalari doirasida javob beradi (`lib/ai-copilot/scope-guard.ts`). Boshqa mavzu (rasm/video/musiqa/kod/umumiy chatbot) — rad etiladi.

### 2.2 AI Gateway (53-bo'lim)
```
Frontend → app/api/coach (AI Gateway hisoblanadi)
    → requireUser() (Auth)
    → requireAiQuota() (Subscription + Quota check, lib/entitlements.ts)
    → isSensitiveRequest() (karta/CVV/OTP so'ralmasin — mavjud, saqlanadi)
    → checkScope() (off-topic / prompt-injection heuristik filtri)
    → buildCopilotContext() (least-data — faqat kerakli agregatlar, lib/ai-copilot/context-builder.ts)
    → Gemini generateContent() (yoki Gemini yo'q bo'lsa — lokal journey.ts)
    → structured action ajratish + Zod validatsiya (lib/ai-copilot/actions.ts)
    → consumeAiQuota()
    → writeAudit() (faqat metadata, xabar matni emas)
    → Response (+ agar action taklif qilingan bo'lsa — confirm talab qilinadi)
```

Action ijro etish alohida bosqich: `POST /api/coach/actions` — foydalanuvchi aniq tasdiqlagandan keyingina bajariladi (33, 55-bo'lim: AI → Structured Action → Validation → Confirmation → Execute).

### 2.3 Business context (5-bo'lim)
`BusinessProfile` modeli (Prisma) — har user uchun bitta profil: g'oya, soha, hudud, maqsadli mijoz, mahsulot/xizmat, budjet, yetkazib beruvchilar, sotuv/marketing kanallari, bosqich (`stage`), maqsadlar, qiyinchiliklar. AI'ga **butun DB emas**, faqat qisqa agregat (`contextToPromptBlock`) yuboriladi.

### 2.4 Biznes bosqichi aniqlash (44-bo'lim)
`lib/ai-copilot/business-stage.ts` — deterministik heuristika (ML emas, hujjatlashtirilgan qoidalar): IDEA → VALIDATION → STARTING → EARLY_SALES → GROWING → ESTABLISHED.

### 2.5 Priority Engine (45-bo'lim)
`lib/ai-copilot/priority-engine.ts` — Impact/Urgency/Cost/Risk/Difficulty asosida ballash, `today/this_week/later` guruhlash. Sof funksiya, to'liq testlanadi. `GET /api/tasks/today` — mavjud Tasklarni shu orqali kunlik rejaga aylantiradi.

### 2.6 Ovozli AI (6-8-bo'lim) — **KEYINGI BOSQICH (hozircha implement qilinmadi)**
Sabab: joriy vazifada **brauzer/vizual test qat'iy taqiqlangan**, ovozli UI (mikrofon ruxsati, tinglash/gapirish holatlari, tarmoq xatolari) faqat interaktiv brauzer orqali ishonchli tekshirilishi mumkin. Arxitektura qarori (keyingi bosqich uchun): brauzerning **Web Speech API** (`SpeechRecognition` + `speechSynthesis`) orqali matn olinadi/o'qiladi — bu alohida "AI provider" emas, faqat kirish/chiqish modaliteti; AI miya sifatida baribir faqat Gemini (`/api/coach`) ishlatiladi:
```
USER VOICE → Web Speech API (browser) → matn → /api/coach (Gemini) → matn javob → speechSynthesis → USER
```
Bu qoidaga mos: "Agar alohida API talab qilinsa, faqat Google/Gemini ekotizimidagi ruxsat etilgan texnologiyalardan foydalan" — Chrome'da Web Speech API Google infratuzilmasiga tayanadi va boshqa uchinchi tomon AI-chat provideri emas.

### 2.7 Subscription tizimi (20-27, 38-43-bo'lim)
**Narxlar/xususiyatlar hardcode emas** — `SubscriptionPlan` jadvalida (DB, seed orqali boshlang'ich qiymat, keyin admin API orqali o'zgartiriladi):

| Plan key | Narx (namuna, seedda) | AI xabar/kun | Ovoz | Financial | Priority |
|---|---|---|---|---|---|
| `FREE` | $0 | 10 | 0 | ❌ | ❌ |
| `BUSINESS` | $5/oy | 60 | 0 | ❌ | ❌ |
| `BUSINESS_PRO` | $10/oy | 150 | 5 daq | ❌ | ✅ |
| `FINANCIAL` | $15/oy | 300 | 15 daq | ✅ | ✅ |
| `FINANCIAL_PRO` | $30/oy | 1000 | 30 daq | ✅ | ✅ |

Backend-side entitlement (39-bo'lim): `lib/entitlements.ts` — har bir AI/financial so'rovda **backend** tekshiradi (frontend tugmani yashirish YETARLI EMAS). `POST /api/ai/financial` kabi FREE plan bilan chaqirilsa — 403.

To'lov: mavjud `lib/payments.ts` (local/Stripe) abstraktsiyasi qayta ishlatiladi — yangi parallel billing tizimi qurilmaydi. `Payment.purpose = "subscription:{PLAN_KEY}"`; to'lov `paid` bo'lganda (`lib/subscription.ts:activateSubscriptionFromPaidPayment`) `Subscription` yozuvi yaratiladi/yangilanadi. Subscription holatlari: `active | trialing | past_due | cancelled | expired` (v1: `active`/`expired`/`cancelled` to'liq ishlaydi; `trialing`/`past_due` keyingi bosqich — hozircha faqat schema darajasida mavjud).

### 2.8 Moliyaviy boshqaruv (22-31-bo'lim)
Mavjud `Transaction`, analytics (`/api/analytics`) infratuzilmasi qayta ishlatiladi. AI moliyaviy tahlilni **faqat FINANCIAL+ reja** uchun beradi (`requireFinancialEntitlement`). AI hech qachon pul o'tkazmaydi/kredit olmaydi/soliq to'lamaydi — faqat tahlil+tavsiya (25-bo'lim, `lib/journey.ts` va yangi system promptda qat'iy yozilgan).

### 2.9 Xavfsizlik (33-37, 57-bo'lim)
- Prompt injection himoyasi: heuristik pre-filter (`scope-guard.ts`) + system instruction qat'iy qoidalari.
- AI tool chaqirmaydi (arbitrary SQL/shell/filesystem) — faqat oldindan belgilangan 2 ta structured action (`create_task`, `create_transaction`), Zod bilan validatsiya, foydalanuvchi tasdig'idan keyin bajariladi.
- Audit log: faqat metadata (intent, provider, muvaffaqiyat/xato), **xabar matni yoki moliyaviy qiymatlar to'liq holda log qilinmaydi**.
- IDOR: barcha route'lar `requireUser()` orqali `userId` bilan filtrlanadi (mavjud namuna davom ettiriladi).

### 2.10 Kod sifati / test (50, 60-bo'lim)
`tests/ai-copilot.test.ts`, `tests/entitlements.test.ts`, `tests/gemini-client.test.ts` — barchasi Vitest, tarmoqsiz (fetch mock qilinadi), brauzersiz.

---

## 3. Bajarilmagan / keyingi bosqichlar ro'yxati (ochiq)

Quyidagilar **ushbu bosqichda ATAYLAB qurilmadi** (sabab: joriy topshiriqda vizual/brauzer test qat'iy man etilgan, yoki alohida katta modul; keyingi so'rovda davom ettiriladi):

1. **Ovozli AI UI** (mikrofon tugmasi, tinglash indikatori) — arxitektura tayyor (2.6-bo'lim), komponent yozilmadi.
2. **Admin panel UI** — subscription plan/price/limit boshqarish uchun. Hozircha faqat DB darajasida (`SubscriptionPlan` jadvali) va seed orqali sozlanadi; admin uchun API/UI keyingi bosqich.
3. **Billing history UI** (invoice ro'yxati, upgrade/downgrade tugmalari to'liq oqimi) — backend qisman tayyor (`/api/subscription`), UI to'liq emas.
4. **Financial Dashboard** (30-bo'lim vizual paneli), **Forecasting** (31-bo'lim), **Legal assistance moduli** (28-bo'lim), **Tax reserve avtomatik hisoblash** (27-bo'lim) — keyingi bosqich.
5. **Daily notification tizimi** (19-bo'lim: kunlik push/eslatma) — hozircha `GET /api/tasks/today` orqali on-demand ishlaydi, avtomatik push/notification cron yo'q.
6. **Business onboarding wizard UI** (AI orqali profil to'ldirish suhbat oqimi) — backend (`/api/business-profile`) tayyor, chat orqali avtomatik to'ldirish keyingi bosqich.

---

## 4. Bajarildi (ushbu bosqich, 2026-08-17)

- [x] `AI_BUSINESS_MEMORY.md` yaratildi
- [x] Loyiha to'liq fayl-tizim orqali tahlil qilindi (auth, DB, mavjud AI/coach, to'lovlar)
- [x] `openai` npm paketi va barcha OpenAI chaqiruvlari olib tashlandi
- [x] `lib/gemini/client.ts` — Gemini REST client (key rotation, timeout, structured JSON output, xatoларни xavfsiz boshqarish)
- [x] `lib/ai-copilot/scope-guard.ts` — off-topic + prompt-injection heuristik filtri
- [x] `lib/ai-copilot/business-stage.ts` — bosqich aniqlash (deterministik)
- [x] `lib/ai-copilot/priority-engine.ts` — Impact/Urgency/Cost/Risk/Difficulty ballash
- [x] `lib/ai-copilot/context-builder.ts` — least-data kontekst yig'ish
- [x] `lib/ai-copilot/actions.ts` — structured action Zod sxemalari
- [x] Prisma: `BusinessProfile`, `SubscriptionPlan`, `Subscription`, `AiUsageDaily`
- [x] `lib/subscription.ts` — reja/obuna holatini boshqarish, to'lovdan faollashtirish
- [x] `lib/entitlements.ts` — backend-side kvota/entitlement tekshiruvi
- [x] `lib/coach-server.ts` — Gemini'ga o'tkazildi, scope-guard + structured action bilan
- [x] `app/api/coach/route.ts` — entitlement/kvota tekshiruvi + audit qo'shildi
- [x] `app/api/coach/actions/route.ts` — action confirm+execute
- [x] `app/api/business-profile/route.ts`
- [x] `app/api/subscription/route.ts`, `app/api/subscription/plans/route.ts`, `app/api/subscription/checkout/route.ts`
- [x] `app/api/tasks/today/route.ts` — Priority Engine orqali kunlik reja
- [x] To'lov confirm (local) va Stripe webhook — obunani avtomatik faollashtirish bilan yangilandi
- [x] `prisma/seed.ts` — 5 ta reja (FREE/BUSINESS/BUSINESS_PRO/FINANCIAL/FINANCIAL_PRO) seed qilindi
- [x] `components/screens/subscription-screen.tsx` + navigatsiyaga qo'shildi (sidebar + profil ekranidagi havola)
- [x] AI Action Confirmation UI (`ai-screen.tsx`): AI taklif qilgan vazifa/tranzaksiyani "Tasdiqlash/Bekor qilish" kartasi orqali ko'rsatish va `/api/coach/actions`ga yuborish
- [x] `.env.example`, `/api/health` — Gemini holatini ko'rsatadi (OpenAI o'rniga)
- [x] Testlar: scope-guard, business-stage, priority-engine, entitlements (real SQLite DB bilan, isolation tekshiruvi bilan), gemini client (fetch mock), actions — jami **83/83 test o'tdi** (36 tasi yangi)
- [x] `npm run typecheck`, `npm test`, `npm run build` orqali tekshirildi (brauzer ISHLATILMADI, ko'rsatma bo'yicha — faqat fayl o'qish + kompilyatsiya darajasidagi tekshiruv)

## 5. Keyingi qadam (so'ralishi kerak)

Foydalanuvchidan keyingi ustuvorlikni so'rash tavsiya etiladi:
- Ovozli AI UI'ni qurishmi (brauzer testi zarur bo'ladi — alohida ruxsat kerak)?
- Admin panel (subscription/price boshqarish UI)?
- Financial Dashboard / Forecasting?
- Yoki joriy qurilgan qismni real `GEMINI_API_KEY` bilan sinab ko'rish (foydalanuvchi tomonidan, chunki bu muhitda internet orqali Gemini'ga chiqish mumkin bo'lsa ham, haqiqiy foydalanuvchi tasdig'i/monitoring kerak)?
