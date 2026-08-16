# RBAC + tool permission matrix

## Roles

| Role | Sees |
| --- | --- |
| ENTREPRENEUR | Own business only |
| CHAMBER_OPERATOR | Aggregated chamber ops, no foreign trade secrets |
| ANALYST | Anonymized / aggregated analytics |
| ADMIN | Users, AI cost, system health, errors |
| GOVERNMENT_ANALYST | Aggregated risk *signals* only — no raw competitor secrets |

## Tool permissions

| Tool | Market | Finance | Health | Trust | Admin |
| --- | --- | --- | --- | --- | --- |
| search_market_data | ✓ | | | | |
| search_suppliers | ✓ | | | | |
| compare_prices | ✓ | | | | |
| calculate_logistics | ✓ | ✓ | | | |
| analyze_demand | ✓ | | ✓ | | |
| calculate_profit | | ✓ | | | |
| generate_business_plan | | ✓ | | | |
| calculate_credit | | ✓ | | | |
| calculate_business_health | | | ✓ | | |
| calculate_credit_readiness | | ✓ | ✓ | | |
| recommend_products | ✓ | ✓ | | | |
| analyze_reviews | | | | ✓ | |
| list_ai_costs | | | | | ✓ |

## Approval

| Action | Risk | Gate |
| --- | --- | --- |
| Market search / compare | LOW | Auto |
| Report generation | LOW | Auto |
| Credit recommendation | MEDIUM | User confirm |
| Money movement / legal verdict | HIGH | Human mandatory |

AI never says “this business is illegal”. Only: risk signal + evidence + confidence.
