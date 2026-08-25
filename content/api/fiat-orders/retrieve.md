---
title: Retrieve a fiat order
section: API Reference / Fiat Orders
---
# Retrieve a fiat order

<span class="badge get">GET</span> `/api/v1/partner/fiat-orders/{orderKey}`

```bash
curl https://api.niftipay.com/api/v1/partner/fiat-orders/1001 \
  -H "Authorization: Bearer <partner_api_key>"
```

Partners may only fetch orders they minted; a hit and a miss are
indistinguishable (`404 not_found`) to avoid leaking existence.

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "fiat_order": { "order_key": "1001", "status": "new", "amount_cents": 1000 } } }
```
