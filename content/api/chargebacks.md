---
title: Chargebacks
section: API Reference
---
# Chargebacks

Two read endpoints, one per question: every dispute against a customer, and the
disputes on one order. Both are **read-only**, and the next section explains why
that is not an oversight.

> Required scope: `payments:read` (global tier), on both endpoints. Both also
> require the `payments.fiat_card` capability on the relationship — the same
> pair the fiat order reads use, because a chargeback is a fact about an order
> you can already see.

## Responding to a chargeback

There is no API for it, and none is coming until a processor offers one. Not one
card processor we route through exposes representment — submitting evidence to
contest a dispute — so an endpoint here could only accept your evidence and sit
on it. We do not publish endpoints that cannot keep their promise.

To contest a dispute, send the evidence to your Niftipay contact by email and we
file it with the processor on the merchant's behalf. Quote the `order_key` and
the chargeback `id` from these endpoints.

## What we know, and what we might not

A chargeback row exists because a processor told us about the dispute. Not every
card rail we route through delivers dispute notifications today, and one
delivers them as a periodic file rather than live. So:

- An empty list is **not** proof that no dispute exists.
- `disputed_at` can lag the real dispute date on the rails that batch.
- Reconcile against the merchant's processor statements for anything financial;
  treat these endpoints as the operational view, not the book of record.

We would rather you knew that than discover it during a reconciliation.

## List a customer's chargebacks

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/chargebacks`

Newest dispute first. Scoped to the relationship: a merchant you share with
another partner never shows you that partner's disputes.

```bash
curl "https://www.niftipay.com/api/v1/partner/customers/pc-1/chargebacks?limit=25" \
  -H "Authorization: Bearer <partner_api_key>"
```

`?limit=` is clamped, never refused: the default is 25 and the maximum is 100, so
asking for 5000 returns 100 rather than an error. There is no cursor on this rail
yet — one page is all it offers.

## List one order's chargebacks

<span class="badge get">GET</span> `/api/v1/partner/fiat-orders/{orderKey}/chargebacks`

The disputes on a single order, newest first, with no customer id in the path —
a partner holding nothing but the `order_key` can ask. An order you cannot see
answers with an empty list rather than a `404`: either way the answer is "no
chargebacks", so there is no second signal worth protecting here.

```bash
curl https://www.niftipay.com/api/v1/partner/fiat-orders/1001/chargebacks \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

Identical shape from both endpoints:

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "chargebacks": [ { "id": "cbe-1",
                               "order_key": "1001",
                               "psp": "niftipayp1",
                               "order_status": "chargeback",
                               "amount_cents": 10000,
                               "currency": "EUR",
                               "fee_cents": 3500,
                               "fee_currency": "EUR",
                               "disputed_at": "2026-09-01T08:00:00.000Z",
                               "created_at": "2026-09-02T10:00:00.000Z" } ] } }
```

| Field           | Meaning                                                                                          |
|-----------------|--------------------------------------------------------------------------------------------------|
| `id`            | The dispute record's id. Quote it when you send evidence by email.                                |
| `order_key`     | The disputed order, as a string.                                                                 |
| `psp`           | Our public name for the processing rail. It is a stable label, not the processor's own name.      |
| `order_status`  | The **order's** status, which a dispute turns to `chargeback`. See below.                          |
| `amount_cents`  | The disputed order amount as the processor stated it, or `null` when it did not.                   |
| `currency`      | Currency of `amount_cents`, or `null`.                                                            |
| `fee_cents`     | What the processor charged for the dispute itself.                                                |
| `fee_currency`  | Currency of `fee_cents` — the merchant's settlement currency, which need not be the order's.       |
| `disputed_at`   | When the processor opened the dispute. Falls back to `created_at` when it does not say.            |
| `created_at`    | When we recorded it.                                                                             |

### Why `order_status` and not `status`

Because the order's status is the only status we have. A dispute here carries no
lifecycle of its own — no `open`, `under_review`, `won` or `lost` — for the same
reason there is no endpoint to respond: the processors do not report one. A field
called `status` next to a chargeback would have read as that lifecycle, and
branching on it would have been branching on a promise we never made.

## The order's own figures

An order carries its own dispute total. On
[Retrieve a fiat order](/api/fiat-orders/retrieve.html), `chargeback_cents` is
what has been charged back and `refunded_cents` is what was refunded — and a
chargeback reverses the **whole** order, so a disputed order reports its full
amount in `chargeback_cents` and `0` in `refunded_cents`, even if a partial
refund came first. The cents are never counted as both.

## Errors

| Status | code                    | Meaning                                                             |
|--------|-------------------------|---------------------------------------------------------------------|
| 403    | insufficient_scope      | Token minted without `payments:read`                                |
| 403    | capability_not_enabled  | `payments.fiat_card` not granted (customer-scoped endpoint only)    |
| 404    | resource_not_found      | The customer id is not one of your relationships                    |
| 500    | internal_error          | Unexpected failure                                                  |
| 503    | temporarily_unavailable | Transient failure. **Retry** — the only code that means that         |

## The event

`payment.chargeback` fires when a dispute lands. It carries the order's
identifiers, not the dispute's figures — read these endpoints for those. See
[Webhooks](/api/webhooks.html).
