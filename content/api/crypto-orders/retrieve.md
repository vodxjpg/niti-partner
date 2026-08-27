---
title: Retrieve a crypto order
section: API Reference / Crypto Orders
---
# Retrieve a crypto order

<span class="badge get">GET</span> `/api/v1/partner/orders/{orderId}`

> Required scope: `orders:read`.

```bash
curl https://www.niftipay.com/api/v1/partner/orders/ord_1 \
  -H "Authorization: Bearer <partner_api_key>"
```

Partners may only fetch orders they can see; a hit and a miss are
indistinguishable (`404 resource_not_found`) to avoid leaking existence.

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "order": { "id": "ord_1", "reference": "CRY-1", "network": "ETH",
             "asset": "USDT", "amount": "100.00000000", "currency": "EUR",
             "status": "pending", "address": "0xdeadbeef",
             "paymentUri": "ethereum:0xdeadbeef?amount=100",
             "qrUrl": "https://qr.example.com/1",
             "createdAt": "2026-08-21T10:00:00.000Z",
             "expiresAt": "2026-08-21T11:00:00.000Z" },
           "partner_customer_id": "pc-1" } }
```

## Errors

| Status | code                     | Meaning                                           |
|--------|--------------------------|---------------------------------------------------|
| 404    | resource_not_found       | No partner-visible order exists for this id.      |
| 503    | temporarily_unavailable  | Read failed transiently; retry shortly.           |
| 500    | internal_error           | Unknown failure.                                  |
