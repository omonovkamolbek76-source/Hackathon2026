# BusinessOS AI — Architecture

**Tagline:** Bitta platforma. Bitta AI. Butun biznesingiz.

Platforma alohida “Market App / Credit App / Review App” emas. Bu **AI-powered Business Operating System**: foydalanuvchi maqsadini yozadi yoki aytadi, orchestrator agentlarni tanlaydi, tool-calling orqali real ma’lumotni yig‘adi, hisoblaydi va evidence + confidence bilan tavsiya beradi.

## Stack

| Layer | Choice |
| --- | --- |
| API | NestJS + TypeScript |
| Web | Next.js + React + Tailwind |
| DB (MVP) | SQLite via Prisma (real relational DB) |
| DB (prod) | PostgreSQL + pgvector |
| Cache / jobs | Redis + BullMQ (adapter ready) |
| Auth | JWT + refresh tokens + RBAC |
| AI | Orchestrator + tool-calling; optional LLM |

## Runtime flow

```text
User (web / voice)
        │
 AI Command Center
        │
 AI Orchestrator  ── intent, language, entities, missing slots
        │
   ┌────┼──────────────┬────────────────┐
   │    │              │                │
Market Finance   Business Health   Trust/Risk
 Agent  Agent         Agent          Agent
   │    │              │                │
 Tools → PostgreSQL/SQLite + Provider Adapters
   │
 ai_decision_logs (evidence, confidence, approval)
        │
 Response cards + WHY? + feedback
```

## Killer MVP loops

1. **Market loop:** ask → market search → suppliers → total cost → demand → recommendation → action
2. **Finance loop:** “kredit kerak” → analysis → credit readiness → plan → cash-flow → recommendation

## Provider adapters

Tashqi API bo‘lmasa ham production flow “fake AI”ga aylanmaydi:

```text
MarketDataProvider.fetch() → normalize() → validate() → timestamp() → store()
```

Seed provider — development dataset. Har qator `source`, `collectedAt`, `confidence` saqlaydi. UI hech qachon eskirgan narxni “bugungi” deb ko‘rsatmaydi.

## Security model

- JWT access + hashed refresh tokens
- RBAC: ENTREPRENEUR, CHAMBER_OPERATOR, ANALYST, ADMIN, GOVERNMENT_ANALYST
- Tenant isolation: business_id scoping on every query
- Prompt injection: user text never concatenated into system policy as executable instruction
- AI tools only see authorized tenant data
- Audit log for auth, profile, AI actions
- Approval engine: LOW auto / MEDIUM confirm / HIGH human

## Cost control

- Deterministic classifier for simple intent (no large model)
- Tool results cached by product+region+day
- LLM only when `OPENAI_API_KEY` set and task is extraction/reasoning
