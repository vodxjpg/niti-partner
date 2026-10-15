---
title: List an order's refunds
section: API Reference / Fiat Orders
---
# List an order's refunds

<span class="badge get">GET</span> `/api/v1/partner/fiat-orders/{orderKey}/refunds`

> Required scope: `payments:read` (global tier). Requires the
> `payments.fiat_card` capability on the relationship that owns the order —
> **not** `refunds`: reading what you refunded does not grant refunding.

Every refund issued on one order, with what is still refundable. The figures
come from the processor on each call, so a refund issued outside this API — from
the merchant's own dashboard, or by our support — is included.

```bash
curl https://www.niftipay.com/api/v1/partner/fiat-orders/1001/refunds \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "order_key": "1001",
            "refunds": [ { "id": "rf-1", "amount_cents": 400,
                           "status": "refunded",
                           "created_at": "2026-10-02T09:15:00.000Z" } ],
            "service_fee_payer": "customer",
            "max_refundable_cents": 1025,
            "refunded_cents": 400,
            "remaining_refundable_cents": 625 } }
```

| Field                        | Meaning                                                                      |
|------------------------------|------------------------------------------------------------------------------|
| `refunds[].id`               | The processor's own refund id.                                               |
| `refunds[].amount_cents`     | That refund's amount, or `null` when the processor did not state one.         |
| `refunds[].status`           | The processor's word for that refund, passed through. `null` when absent.     |
| `refunds[].created_at`       | When the processor created it, or `null` when it does not say.                |
| `service_fee_payer`          | `customer` or `merchant` — it decides the ceiling.                            |
| `max_refundable_cents`       | The ceiling for the whole order.                                             |
| `refunded_cents`             | Total refunded so far, summed from the list above.                            |
| `remaining_refundable_cents` | What a further refund may still ask for.                                      |

`refunds` is an empty array on an order that has never been refunded. The
ceiling fields are still filled, so this is also the call to make **before**
refunding when you want to know what will be accepted.

## This call or the order?

Both answer "how much came back", and they are not the same answer:

- **[Retrieve a fiat order](/api/fiat-orders/retrieve.html)** carries
  `refunded_cents` from our own records. No processor round trip, so it is fast
  and it works on the [list](/api/fiat-orders/list.html) too. Use it to
  reconcile in bulk.
- **This call** asks the processor, and is the authoritative per-refund
  breakdown. Use it when you need refund ids, or the exact remaining balance
  before issuing one.

## Errors

| Status | code                    | Meaning                                                                      |
|--------|-------------------------|------------------------------------------------------------------------------|
| 400    | invalid_request         | The order has no processor-side payment, so it has no refunds to list        |
| 403    | insufficient_scope      | Token minted without `payments:read`                                         |
| 404    | resource_not_found      | Not there, not yours, or `payments.fiat_card` not granted — one answer for all |
| 500    | internal_error          | Unexpected failure                                                           |
| 502    | provider_error          | The processor failed to list refunds. The order is fine; the upstream call is not |
| 503    | temporarily_unavailable | Transient failure. **Retry** — the only code that means that                  |

The `404` is deliberately indistinguishable, exactly as on
[Retrieve a fiat order](/api/fiat-orders/retrieve.html): `order_key` is a small
consecutive integer from a shared sequence, so a status that told the cases
apart would let you count your way to other partners' live orders.
