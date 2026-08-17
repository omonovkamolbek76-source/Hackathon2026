# TadbirkorAI

O‘zbekiston tadbirkorlari uchun AI moliyaviy va biznes yordamchi.

## Stack

- Next.js 13 App Router + API Routes
- Prisma + SQLite (Postgres: `docker compose up -d` + `DATABASE_URL`)
- Auth: bcrypt + httpOnly JWT + **MFA (TOTP)** + **Google/Microsoft OAuth/OIDC** (ixtiyoriy)
- AI: **AI Business Copilot — faqat Google Gemini** (boshqa provider yo'q). Kalitsiz — lokal (AI bo'lmagan) qoida-asosidagi murabbiy.
- Subscription: 5 reja (Free/Business/Business Pro/Financial/Financial Pro) — narx/limit DB'da (hardcode emas), backend-side entitlement + kunlik AI kvota
- Bank V1: **CSV import** (PAN/CVV/OTP saqlanmaydi)
- Payments: local checkout yoki Stripe (shu orqali subscription ham faollashadi)
- Monitoring: structured JSON logs + `/api/health`
- Backup: `npm run backup`

## Ishga tushirish (bitta buyruq bilan)

Backend ham, frontend ham bitta Next.js ilovada (API route'lar shu ichida), shuning uchun hammasi bitta skript orqali ishga tushadi:

```bash
./start.sh
# yoki: npm run start:all
```

Bu skript avtomatik ravishda: `.env` yaratadi/tekshiradi, paketlarni o'rnatadi,
`AUTH_SECRET` kabi qiymatlarni generatsiya qiladi, Prisma client yasaydi,
bazani sozlaydi (`db push`), boshlang'ich ma'lumotlarni yuklaydi (seed) va
serverni http://localhost:3000 da ishga tushiradi. Hech qanday API kalitisiz
ham ishlaydi (lokal murabbiy, lokal to'lov, SQLite).

Qo'shimcha rejimlar:

```bash
./start.sh prod       # production build + start (npm run start:all:prod)
./start.sh postgres   # Postgres'ni Docker orqali ko'taradi (npm run start:all:postgres)
```

### Qo'lda, bosqichma-bosqich (ixtiyoriy)

```bash
cp .env.example .env
# OPENAI_API_KEY=sk-...  (ixtiyoriy, lekin tavsiya)
npm install
npm run db:setup
npm run dev
```

Postgres:

```bash
docker compose up -d
# .env: DATABASE_URL=postgresql://tadbirkor:tadbirkor@localhost:5432/tadbirkorai?schema=public
# prisma/schema.prisma ichida provider = "postgresql" qiling
npx prisma db push && npm run db:seed
```

## Test / backup

```bash
npm test
npm run typecheck
npm run build
npm run backup
```

## Google / Microsoft orqali kirish

Ixtiyoriy — `.env`da kalitlar bo'sh bo'lsa, tugmalar bosilganda tushunarli xabar bilan login ekraniga qaytariladi (email+parol bilan kirish har doim ishlaydi).

1. **Google**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client ID (Web application) → Authorized redirect URI: `{APP_URL}/api/auth/google/callback` → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`ni `.env`ga yozing.
2. **Microsoft**: [Azure Portal](https://portal.azure.com) → App registrations → New registration → Supported account types: *"Accounts in any organizational directory and personal Microsoft accounts"* → Redirect URI (Web): `{APP_URL}/api/auth/microsoft/callback` → `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`ni yozing. Faqat bitta tashkilotga cheklash uchun `MICROSOFT_TENANT_ID` ni to'ldiring (bo'sh bo'lsa `common` ishlatiladi).
3. Server qayta ishga tushirilgach, login ekranida "Google/Microsoft orqali davom etish" tugmalari real ishlaydi.

Xavfsizlik: Authorization Code + PKCE (S256), `state`/`nonce` tekshiruvi, ID token imzosi+issuer+audience+muddat tekshiruvi, faqat ichki redirectlarga ruxsat (open-redirect himoyasi), rol har doim serverda `user` sifatida belgilanadi, email bir xilligi asosida hisoblar avtomatik birlashtirilmaydi — faqat profildan aniq "ulash" amali orqali.

## AI Business Copilot (Gemini only)

`.env`da `GEMINI_API_KEY` bo'sh bo'lsa, `/api/coach` avtomatik lokal (AI bo'lmagan) qoida-asosidagi murabbiyga tushadi — ilova hech qachon buzilmaydi. Kalit qo'yilgach:

1. Kalit oling: https://aistudio.google.com/apikey → `.env`ga `GEMINI_API_KEY` sifatida yozing.
2. Ixtiyoriy: bir nechta kalit — `GEMINI_API_KEY_1/2/3` (round-robin).
3. Model nomi hardcode emas — `GEMINI_MODEL` orqali boshqariladi (default: `gemini-2.0-flash`).

Xavfsizlik: AI faqat biznes/moliya/tadbirkorlik mavzusida javob beradi (`lib/ai-copilot/scope-guard.ts`), tizim ko'rsatmalarini oshkor qilmaydi, hech qachon pul o'tkazmaydi/kredit olmaydi, va faqat oldindan belgilangan 2 ta amalni (vazifa/tranzaksiya qo'shish) — foydalanuvchi aniq tasdiqlagandan keyingina — bajaradi.

## Telegram push notifications

Ixtiyoriy modul — mavjud platforma ma'lumotlaridan (vazifalar, tranzaksiyalar, biznes reja, kredit arizasi, obuna, mavjud in-app bildirishnomalar) foydalanuvchiga Telegram orqali eslatma yuboradi. **AI ishlatilmaydi**, tashqi ma'lumot yo'q — faqat DB + tayyor shablon.

1. [@BotFather](https://t.me/BotFather) orqali bot yarating → `TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME`ni `.env`ga yozing.
2. Webhookni sozlang: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook` (ixtiyoriy `secret_token=<TELEGRAM_WEBHOOK_SECRET>` bilan).
3. Profil ekranidagi "Telegramni ulash" tugmasi orqali foydalanuvchi o'z Telegram hisobini xavfsiz (bir martalik, 10 daqiqalik token) bog'laydi.
4. Tekshiruv oralig'i `NOTIFICATION_INTERVAL_SECONDS` (default 30) — ichki jarayon (`instrumentation.ts`) orqali avtomatik ishlaydi; serverless muhitlar uchun `POST /api/telegram/check` (himoyalangan `TELEGRAM_CRON_SECRET` bilan) tashqi cron orqali ham chaqirilishi mumkin.

Kalitsiz — modul to'liq passiv, boshqa hech narsaga ta'sir qilmaydi. Batafsil: `AI_BUSINESS_MEMORY.md` 6-bo'lim.

## Subscription

5 reja: Free ($0), Business ($5), Business Pro ($10), Financial ($15), Financial Pro ($30) — narx/limit/xususiyatlar `SubscriptionPlan` jadvalida (seed orqali, admin API bilan o'zgartiriladigan). Har bir AI/financial so'rov **backend**da tekshiriladi (`lib/entitlements.ts`) — frontend tugmani yashirish yetarli emas. To'lov mavjud `lib/payments.ts` (local/Stripe) orqali — muvaffaqiyatli to'lov obunani avtomatik faollashtiradi.

## Env kalitlar

| Kalit | Majburiy | Vazifa |
|-------|----------|--------|
| `AUTH_SECRET` | ha | JWT imzo |
| `DATABASE_URL` | ha | DB |
| `GEMINI_API_KEY` | yo‘q* | AI Business Copilot (Gemini) |
| `SENTRY_DSN` | yo‘q | Monitoring |
| `STRIPE_SECRET_KEY` | yo‘q | Real to‘lov / subscription |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yo‘q | Google orqali kirish |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID` | yo‘q | Microsoft orqali kirish |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | yo‘q | Telegram push notification |
| `TELEGRAM_WEBHOOK_SECRET` / `TELEGRAM_CRON_SECRET` | yo‘q | Telegram webhook/cron himoyasi |
| `NOTIFICATION_INTERVAL_SECONDS` | yo‘q | Telegram checker oralig'i (default 30) |

\* Kalitsiz lokal murabbiy ishlaydi.

## Uzoq muddatli xotira

Loyihaning to'liq arxitektura rejasi, qabul qilingan qarorlar va "keyingi qadamlar" ro'yxati — [`AI_BUSINESS_MEMORY.md`](./AI_BUSINESS_MEMORY.md).
