---
title: Refund a fiat order
section: API Reference / Fiat Orders
---
# Refund a fiat order

<span class="badge post">POST</span> `/api/v1/partner/fiat-orders/{orderKey}/refunds`

> Required scope: `refunds:write`. Also requires the `refunds` capability on the
> relationship that owns the order.

Sends money back to the buyer who paid the order — fully, or partially, as many
times as the remaining balance allows. The identifier is `order_key`, the short
integer returned on the order, and there is no customer id in the path: a
partner that stored nothing but the key can refund.

Refunds are issued against the processor that took the payment, on the merchant
account that holds the order. You never name a destination — it is the order's
own original payer, which is why this call needs no signed second factor,
unlike a withdrawal or a payout-wallet change.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/fiat-orders/1001/refunds \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "amount_cents": 400, "description": "Item returned" }'
```

| Field          | Type    | Required | Notes                                                          |
|----------------|---------|----------|----------------------------------------------------------------|
| `amount_cents` | integer | yes      | Positive integer, in cents. Must not exceed `remaining_refundable_cents`. |
| `description`  | string  | no       | Memo forwarded to the processor. `null` is accepted.           |
| `order_lines`  | array   | no       | Line-level refund, for processors that support it. `null` is accepted. |
| `order_lines[].merchant_order_line_id` | string  | yes (in a line) | Non-empty.                     |
| `order_lines[].quantity`               | integer | yes (in a line) | Positive integer.              |

An `order_lines` array may not be empty — send `null` or omit the field when you
have no lines to name.

`Idempotency-Key` is **required**: money moves on this call, and a caller that
retried after a socket timeout cannot know whether the first attempt landed.
On a retry, **reuse the same key**; a fresh key is a second refund.

## Response `201`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "order_key": "1001",
            "currency": "EUR",
            "refund": { "amount_cents": 400, "status": "partially_refunded" },
            "service_fee_payer": "customer",
            "max_refundable_cents": 1025,
            "refunded_cents": 400,
            "remaining_refundable_cents": 625 } }
```

| Field                        | Meaning                                                                 |
|------------------------------|-------------------------------------------------------------------------|
| `refund.amount_cents`        | Exactly the amount you asked for. This rail never substitutes a different figure. |
| `refund.status`              | `refunded` when nothing is left to refund, otherwise `partially_refunded`. |
| `service_fee_payer`          | `customer` or `merchant` — it decides the ceiling, see below.            |
| `max_refundable_cents`       | The ceiling for the whole order.                                        |
| `refunded_cents`             | Total refunded on this order so far, this refund included.               |
| `remaining_refundable_cents` | What a further refund may still ask for.                                 |

The order's own `status` becomes `refunded` once `remaining_refundable_cents`
reaches `0`; a partial refund leaves it unchanged.

## How much can be refunded

The ceiling depends on who paid the service fee, which is on the order itself:

| `service_fee_payer` | `max_refundable_cents` is          | Because                                       |
|---------------------|------------------------------------|-----------------------------------------------|
| `customer`          | the order's `total_cents`          | the buyer paid the fee on top, so the buyer gets it back |
| `merchant`          | the order's `amount_cents` (subtotal) | the buyer never paid the fee, so there is nothing of it to return |

`refunded_cents` is read from the processor on every call, not from our own
records, so a refund issued outside this API still counts against the ceiling.

## Preconditions

- The order must be a real order — a **payment link** cannot be refunded
  (`409 not_refundable`).
- Its status must be `paid` or `completed` (`409 order_not_paid`).
- It must have reached the processor at all; an order with no processor-side
  payment answers `409 not_refundable`.

## Some processors refund full value only

One processor exposes no partial-refund API. On such an order, an
`amount_cents` that is not exactly `remaining_refundable_cents` is **refused**
with `409 refund_full_value_only`, and `details[0].remaining_refundable_cents`
carries the one amount that would be accepted:

```json
{ "error": { "code": "refund_full_value_only",
             "message": "This provider only supports a full refund of the remaining balance. See details for the amount that would be accepted.",
             "request_id": "req-1",
             "details": [ { "remaining_refundable_cents": 1025 } ] } }
```

Retry with that figure. Nothing is substituted silently — a machine caller
sees only the number it sent, so refunding a different amount without saying so
would be worse than a refusal.

## Every miss is the same `404`

Four different situations answer identically: the order key does not exist, it
belongs to another partner on the same merchant, it belongs to a merchant you
never onboarded, or **the `refunds` capability is not granted** on the
relationship that owns it.

```json
{ "error": { "code": "resource_not_found",
             "message": "No partner-visible fiat order exists for this order key.",
             "request_id": "req-1" } }
```

Note the last case: unlike every other rail, a missing grant here is a `404`,
not `403 capability_not_enabled`. `order_key` is a small consecutive integer
from a shared sequence, so anything that told the cases apart would not require
guessing ids — you could count. Read
[capabilities](/api/capabilities.html) to find out whether `refunds` is granted;
do not infer it from this endpoint.

A capability that is granted but not currently usable is a separate
`409 capability_unavailable` — reaching that check already proves the order is
yours, so the distinction reveals nothing.

## Errors

| Status | code                     | Meaning                                                                 | Key released |
|--------|--------------------------|-------------------------------------------------------------------------|--------------|
| 400    | invalid_request          | Body is not a JSON object, `amount_cents` is not a positive integer, `description` is not a string, `order_lines` is malformed or empty | yes |
| 400    | idempotency_key_required | No `Idempotency-Key` header                                             | n/a          |
| 403    | insufficient_scope       | Token minted without `refunds:write`                                    | n/a          |
| 404    | resource_not_found       | Not there, not yours, or `refunds` not granted — see above              | n/a          |
| 409    | not_refundable           | `payment_link`, or no processor-side payment to refund                   | yes          |
| 409    | order_not_paid           | Status is not `paid` or `completed`                                     | yes          |
| 409    | nothing_to_refund        | `remaining_refundable_cents` is already `0`                             | no           |
| 409    | amount_exceeds_remaining | Over the remaining balance; `details[0].remaining_refundable_cents`      | no           |
| 409    | refund_full_value_only   | Full-value-only processor; `details[0].remaining_refundable_cents`       | no           |
| 409    | capability_unavailable   | `refunds` granted, merchant not currently eligible; `details[0].reason`   | n/a          |
| 500    | internal_error           | Unexpected failure — the outcome is **unknown**, do not blind-retry      | no           |
| 502    | provider_error           | The processor refused or failed                                         | no           |
| 503    | temporarily_unavailable  | Transient failure. **Retry** — the only code that means that             | n/a          |

"Key released" means the `Idempotency-Key` can be reused after fixing the
request: it is released only for refusals decided **before** anything was sent
to the processor. Once the processor has been contacted the key is consumed,
because the outcome of the first attempt is no longer certain — replay the same
key to read what happened rather than sending a second refund. Refusals marked
`n/a` are decided before the key is recorded at all.

## The event

A successful refund emits two webhook events: `refund.completed`, keyed on the
refund, and `payment.refunded`, the order's status twin. Both carry the order's
identifiers and status, not the refunded amount — re-read the order, or use this
call's own response. See [Webhooks](/api/webhooks.html).
