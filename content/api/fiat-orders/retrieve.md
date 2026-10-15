---
title: Retrieve a fiat order
section: API Reference / Fiat Orders
---
# Retrieve a fiat order

<span class="badge get">GET</span> `/api/v1/partner/fiat-orders/{orderKey}`

> Required scope: `payments:read` (global tier).

The identifier is `order_key` — the short integer returned on the order — **not**
the order's uuid. There is no customer id in the path, so an order can be read
back by a partner that stored nothing but the key.

```bash
curl https://www.niftipay.com/api/v1/partner/fiat-orders/1001 \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "fiat_order": { "order_key": "1001", "status": "new",
                            "currency": "EUR", "amount_cents": 1000,
                            "service_fee_cents": 25, "total_cents": 1025,
                            "merchant_reference": "INV-1",
                            "refunded_cents": 0,
                            "chargeback_cents": 0,
                            "created_at": "2026-08-24T10:00:00.000Z",
                            "updated_at": null },
            "partner_customer_id": "pc-1" } }
```

`partner_customer_id` tells you which of your relationships the order belongs
to — the path did not name one.

## What came back: `refunded_cents` and `chargeback_cents`

Both are integers in the order's own currency, never `null`, and both are `0` on
an order nothing has reversed.

| Field              | Meaning                                                       |
|--------------------|---------------------------------------------------------------|
| `refunded_cents`   | Cents refunded to the buyer on this order so far.             |
| `chargeback_cents` | Cents taken back by a dispute.                                |

They are read from our own records, so this call stays a plain read: no
processor round trip, which is also why the same two fields appear on the
[list](/api/fiat-orders/list.html) and cost nothing there.

**A chargeback reverses the whole order.** So a disputed order reports its full
amount in `chargeback_cents` and `0` in `refunded_cents` — even when a partial
refund happened first. The same cents are never reported as both a refund and a
dispute, which means `refunded_cents` dropping to `0` is itself a signal: look at
`chargeback_cents`. To reconcile, read the pair together; `refunded_cents +
chargeback_cents` never exceeds `total_cents`.

For the per-refund breakdown, with the processor's own refund ids and the exact
remaining balance, use
[List an order's refunds](/api/fiat-orders/refunds-list.html). For the dispute
records, use [Chargebacks](/api/chargebacks.html).

## Every miss is the same `404`

You may only read orders your own relationships minted. An order that does not
exist, one belonging to another partner on the same merchant, and one on a
merchant you have never onboarded all answer identically:

```json
{ "error": { "code": "resource_not_found",
             "message": "No partner-visible fiat order exists for this order key.",
             "request_id": "req-1" } }
```

That matters more here than elsewhere. `order_key` is a **small consecutive
integer from a shared sequence**, so anything that distinguished the cases would
not require guessing ids — you could count. A `403` on someone else's order would
confirm a live order on a merchant you have no relationship with.
