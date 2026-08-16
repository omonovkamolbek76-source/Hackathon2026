# Security model

- Passwords hashed with bcrypt
- Access JWT + hashed refresh tokens
- RBAC guards on admin routes
- Tenant isolation: every business query scoped by owner
- User text is treated as data, never as system policy
- Tools only run from the orchestrator allow-list
- AI never emits a legal verdict for informal-economy signals
- HIGH-risk actions require a human; credit recommendations ask for confirmation
- Audit logs for register, login, profile extract
- CORS limited to the web origin
