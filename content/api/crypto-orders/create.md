---
title: Create a crypto order
section: API Reference / Crypto Orders
---
# Create a crypto order

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/orders`

> Required scope: `orders:create` + capability `payments.crypto`.

Creates a crypto payment. Unlike the fiat rail, a duplicate `reference` is
**replayed** rather than refused: the same `reference` for this customer returns
the original order.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/orders \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "CRY-1", "network": "ETH", "asset": "USDT",
        "amount": 100, "currency": "EUR",
        "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com" }'
```

| Field        | Type    | Required | Notes                                                     |
|--------------|---------|----------|-----------------------------------------------------------|
| `reference`  | string  | yes      | Replaying it returns the original order.                  |
| `network`    | string  | yes      | Blockchain, e.g. `ETH`.                                   |
| `asset`      | string  | yes      | Token, e.g. `USDT`.                                       |
| `amount`     | number  | yes      | Fiat amount in major units (e.g. `100` for €100).         |
| `currency`   | string  | yes      | e.g. `EUR`.                                               |
| `firstName`  | string  | yes      | Buyer first name.                                         |
| `lastName`   | string  | yes      | Buyer last name.                                          |
| `email`      | string  | no       | Buyer email.                                              |
| `merchantId` | string  | no       | Override the merchant account if the relationship allows. |

> `Idempotency-Key` is **required**. A retry after a socket timeout has no way
> to know whether the first attempt landed, and this POST mints a deposit
> address — so the key is mandatory, not optional.

## Response `201`

The status is always `201`, on both a fresh create and a replay. A replay is
flagged by `"replayed": true` in the body and returns the **original** order.

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "order": { "id": "ord_1", "reference": "CRY-1", "network": "ETH",
             "asset": "USDT", "amount": "100.00000000", "currency": "EUR",
             "status": "pending", "address": "0xdeadbeef",
             "paymentUri": "ethereum:0xdeadbeef?amount=100",
             "qrUrl": "https://qr.example.com/1",
             "createdAt": "2026-08-21T10:00:00.000Z",
             "expiresAt": "2026-08-21T11:00:00.000Z" },
           "replayed": false } }
```

## Errors

| Status | code                     | Meaning                                                          |
|--------|--------------------------|------------------------------------------------------------------|
| 400    | idempotency_key_required | Missing `Idempotency-Key` header.                                |
| 400    | invalid_request          | Missing/blank `reference`, or a body that is not JSON.           |
| 400    | invalid_request          | Bad `network`/`asset`/`amount`/`currency` (`invalid_payload`).   |
| 409    | capability_unavailable   | Crypto payments not enabled for this customer.                   |
| 409    | reference_conflict       | `reference` already used by a *different* order for this customer. |
| 403    | forbidden                | This order is not permitted for this customer.                   |
| 503    | temporarily_unavailable  | Address pool exhausted or rate unavailable; retry shortly.       |
| 500    | internal_error           | Unknown failure.                                                 |

> A repeated `reference` for **the same customer** is replayed, not conflicted:
> you get the original order back with `"replayed": true`. A `reference_conflict`
> (409) only happens when the reference collides with an order under a
> *different* relationship — it never tells you whose order holds it.
