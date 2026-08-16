# API specification (MVP)

Base: `http://localhost:4000`  
Auth: `Authorization: Bearer <accessToken>`

## Auth

- `POST /auth/register` `{ email, password, fullName, language? }`
- `POST /auth/login` `{ email, password }`
- `POST /auth/refresh` `{ refreshToken }`
- `GET /auth/me`

## Business

- `GET /businesses/me`
- `POST /businesses/profile/extract` `{ text }` — zero-form extraction
- `PATCH /businesses/me` profile fields
- `GET /businesses/me/health`
- `GET /businesses/me/briefing`

## AI Copilot

- `POST /ai/chat` `{ message, conversationId? }`
- `GET /ai/conversations`
- `GET /ai/conversations/:id`
- `POST /ai/feedback` `{ decisionId, helpful, comment? }`
- `GET /ai/tasks`

Response shape:

```json
{
  "conversationId": "...",
  "message": "…",
  "language": "uz",
  "intent": "PROFITABILITY",
  "cards": [],
  "decision": {
    "id": "...",
    "confidence": 0.87,
    "evidence": [],
    "why": [],
    "approval": "NONE"
  }
}
```

## Market / Finance (also used as tools)

- `GET /market/search?q=&region=`
- `GET /market/suppliers?product=&region=`
- `GET /market/demand?product=&region=`
- `POST /finance/model`
- `POST /finance/credit`
- `POST /finance/plan`

## Admin

- `GET /admin/overview`
- `GET /admin/users`
- `GET /admin/decisions`
- `GET /admin/health`
