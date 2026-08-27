---
title: List a customer's fiat orders
section: API Reference / Fiat Orders
---
# List a customer's fiat orders

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/fiat-orders`

> Required scope: `payments:read`.

Returns only orders minted by **this** partner relationship. A partner can
never see another partner's orders (they share the merchant's `userId`).

```bash
curl https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-orders \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "fiat_orders": [ { "order_key": "1001", "status": "new", "amount_cents": 1000 } ] } }
```
