# TadbirkorAI

O‘zbekiston tadbirkorlari uchun AI moliyaviy va biznes yordamchi.

## Stack

- Next.js 13 App Router + API Routes
- Prisma + SQLite (Postgres: `docker compose up -d` + `DATABASE_URL`)
- Auth: bcrypt + httpOnly JWT + **MFA (TOTP)**
- Coach: lokal murabbiy + ixtiyoriy OpenAI
- Bank V1: **CSV import** (PAN/CVV/OTP saqlanmaydi)
- Payments: local checkout yoki Stripe
- Monitoring: structured JSON logs + `/api/health`
- Backup: `npm run backup`

## Ishga tushirish

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

## Env kalitlar

| Kalit | Majburiy | Vazifa |
|-------|----------|--------|
| `AUTH_SECRET` | ha | JWT imzo |
| `DATABASE_URL` | ha | DB |
| `OPENAI_API_KEY` | yo‘q* | Real LLM coach |
| `SENTRY_DSN` | yo‘q | Monitoring |
| `STRIPE_SECRET_KEY` | yo‘q | Real to‘lov |

\* Kalitsiz lokal murabbiy ishlaydi.
