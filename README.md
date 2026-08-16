# TadbirkorAI

O‘zbekiston tadbirkorlari uchun AI moliyaviy va biznes yordamchi.

## Stack

- Next.js 13 (App Router) + API Routes
- Prisma + SQLite (productionda Postgres `DATABASE_URL`)
- Auth: bcrypt + httpOnly JWT cookie
- Coach: lokal 10-bosqichli murabbiy + ixtiyoriy OpenAI
- Kredit moslashtirish: server algoritmi (kafolat emas)

## Ishga tushirish

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Brauzer: http://localhost:3000

## Test

```bash
npm test
npm run typecheck
```

## Muhim

- Kredit foizlari **namuna katalog**; rasmiy manbada tasdiqlang.
- Karta/CVV/OTP chatda so‘ralmaydi.
- `OPENAI_API_KEY` bo‘lsa coach LLM ishlatadi, aks holda lokal murabbiy.
