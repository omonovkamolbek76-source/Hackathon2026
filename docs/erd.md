# Database ERD

```text
users 1──* businesses 1──1 business_profiles
                │
                ├──* business_documents
                ├──* financial_records
                ├──* transactions
                ├──* credit_profiles
                ├──* business_plans
                ├──* business_health_scores
                ├──* risk_signals
                ├──* ai_conversations 1──* ai_messages
                ├──* ai_tasks
                ├──* ai_decision_logs
                ├──* notifications
                └──* embeddings

products 1──* market_prices
         1──* market_demand
         1──* suppliers (via supplier_products)
         1──* reviews

users 1──* refresh_tokens
users 1──* audit_logs
```

## Core tables

- `users` — identity, role, language
- `businesses` / `business_profiles` — enter-once profile
- `products`, `suppliers`, `market_prices`, `market_demand` — market intelligence
- `financial_records`, `credit_profiles`, `business_plans` — finance
- `business_health_scores`, `risk_signals` — health + shadow-economy *signals* (never legal verdicts)
- `reviews`, `review_analyses` — trust
- `ai_conversations`, `ai_messages`, `ai_tasks`, `ai_decision_logs` — copilot memory + observability
- `embeddings` — tenant-aware RAG chunks
- `audit_logs`, `notifications`

`ai_decision_logs` har bir AI action uchun: agent, tools, input ref, output JSON, confidence, evidence, approval flags.
