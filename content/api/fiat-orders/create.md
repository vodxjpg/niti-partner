---
title: Create a fiat card order
section: API Reference / Fiat Orders
---
# Create a fiat card order

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/fiat-orders`

> Required scope: `payments:create` (granted only after the partner migration is applied).

Creates a card payment on behalf of the customer.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-orders \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "integration_id": "int-1", "amount_cents": 1000, "currency": "EUR",
        "reference": "INV-1", "return_url": "https://shop.test/done",
        "failure_url": "https://shop.test/oops" }'
```

| Field            | Type    | Required | Notes                                                |
|------------------|---------|----------|------------------------------------------------------|
| `integration_id` | string  | yes      | Which integration processes the payment. Get one from [List fiat integrations](/api/fiat-integrations/list.html). |
| `amount_cents`   | integer | yes      | Major units are **not** accepted; send cents.        |
| `currency`       | string  | yes      | ISO 4217, e.g. `EUR`.                                |
| `reference`      | string  | yes      | Your id for this order (unique per merchant).        |
| `return_url`     | string  | **yes**  | https only. Where the buyer goes after success.      |
| `failure_url`    | string  | **yes**  | https only. Where the buyer goes after a decline.    |
| `description`    | string  | no       | Optional memo.                                       |
| `email`          | string  | no       | Buyer email.                                         |

> Both `return_url` and `failure_url` are **required and https-only**. Omitting
> either sends the buyer to the merchant's own page on that screen — so the API
> refuses it with `400 invalid_request`.

## Response `201`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "fiat_order": { "order_key": "1001", "status": "new",
            "currency": "EUR", "amount_cents": 1000, "service_fee_cents": 25,
            "total_cents": 1025, "merchant_reference": "INV-1",
            "created_at": "2026-08-24T10:00:00.000Z", "updated_at": null },
          "pay_url": "https://psp.test/pay/1001" } }
```

## Errors

| Status | code               | Meaning                                            |
|--------|--------------------|----------------------------------------------------|
| 400    | invalid_request    | Missing/!https `return_url`/`failure_url`, wrong-typed field |
| 409    | reference_conflict | `reference` already used (generic, ownerless)       |
| 409    | integration_missing | `integration_id` does not belong to this customer  |
| 409    | capability_unavailable | Card payments granted but not currently usable  |

> A repeated `reference` returns a generic `reference_conflict` — it never
> tells you whose order holds it.
