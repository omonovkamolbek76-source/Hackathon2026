# BusinessOS AI

**Bitta platforma. Bitta AI. Butun biznesingiz.**

O‘zbekiston tadbirkorlari uchun AI-powered Business Operating System. Bu chatbot emas: foydalanuvchi maqsadini yozadi yoki aytadi, orchestrator agentlarni tanlaydi, tool-calling orqali **real database**dan ma’lumot oladi, hisoblaydi va evidence + confidence bilan tavsiya beradi.

> Tadbirkor tizimni o‘rganmasligi kerak. Tizim tadbirkorni tushunishi kerak.

## Killer MVP

1. Kirish → Command Center
2. “200 mln so‘mlik mahsulot olib kelib sotmoqchiman…”
3. AI hududni so‘raydi (zero-form)
4. Bozor + talab + total-cost + foyda tool’lari ishlaydi
5. 3+ variant, WHY?, manba va yangilanish vaqti
6. Supplier match va tejash

Ikkinchi loop: “Menga kredit kerak” → to‘lov, readiness, biznes-reja.

## Stack

- Web: Next.js + Tailwind (mobile-first, uz/ru/en, voice)
- API: NestJS, JWT, RBAC
- DB: Prisma + SQLite (MVP). Production: PostgreSQL + pgvector (`docker-compose.yml`)
- AI: Orchestrator + real tools. `OPENAI_API_KEY` bo‘lsa matnni silliqlaydi, raqamlarni o‘ylab topmaydi

## Ishga tushirish

```bash
pnpm install
pnpm db:generate
pnpm --filter @businessos/database push
pnpm db:seed
pnpm test
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health

Demo:

- tadbirkor@businessos.uz / Demo1234!
- admin@businessos.uz / ChangeMeAdmin1!

## Monorepo

```text
apps/web          Command Center
apps/api          NestJS + agents + tools
packages/shared   intent, finance, ranking, RBAC
packages/database Prisma schema, seed adapter
docs/             architecture, ERD, API, RBAC, security
```

## Muhim qoidalar

- Hardcoded AI javob yo‘q — har bir tavsiya tool + DB
- Har AI action `ai_decision_logs`ga yoziladi
- “Bu biznes noqonuniy” deyilmaydi — faqat risk signal
- Seed adapter manbasi va vaqti saqlanadi, “bugungi birja” deb ko‘rsatilmaydi
