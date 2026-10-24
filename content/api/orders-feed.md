---
title: Completed orders feed
section: API Reference / Orders Feed
---
# Completed orders feed

<span class="badge get">GET</span> `/api/v1/partner/orders`

> Required scope: `orders:read`.

Every **completed** order across **all** of your active customers, on one
timeline, newest first. This is the reconciliation rail: the per-customer order
lists answer "what did this merchant do", this one answers "what settled across
my book in this window".

Both order types are merged into the same list — fiat card and bank-transfer
orders (`type: "fiat"`, status `completed`) and crypto orders (`type:
"crypto"`, status `paid`). Nothing else is returned: an order that is
pending, expired, cancelled or failed never appears here, and there is no query
parameter to ask for one. A **refunded** order does appear — a refund does not
un-complete the order, so the row stays and its amounts are the amounts
captured. Reconcile refunds from
[the order's refunds](/api/fiat-orders/refunds-list.html), not by expecting a
row to vanish.

```bash
curl "https://www.niftipay.com/api/v1/partner/orders?completed_from=2026-10-01&completed_to=2026-11-01&limit=100" \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "orders": [
      { "order_id": "9f1c7e02-1d4b-4a7e-9c33-5b2a8f0d61aa",
        "type": "fiat",
        "customer_id": "user_abc",
        "external_customer_id": "cust_42",
        "reference": "INV-10231",
        "status": "completed",
        "completed_at": "2026-10-14T09:12:44.000Z",
        "currency": "EUR",
        "amount_cents": 128900,
        "amount": null,
        "amount_eur_cents": 128900 },
      { "order_id": "3ab71d55-0c88-4f10-b2e7-91aa4c6d2f30",
        "type": "crypto",
        "customer_id": "user_def",
        "external_customer_id": null,
        "reference": "order-7781",
        "status": "paid",
        "completed_at": "2026-10-13T22:40:02.000Z",
        "currency": "USDT",
        "amount_cents": null,
        "amount": "250.000000",
        "amount_eur_cents": 23140 }
    ],
    "next_cursor": "MjAyNi0xMC0xM1QyMjo0MDowMi4wMDBafDNhYjcxZDU1LTBjODgtNGYxMC1iMmU3LTkxYWE0YzZkMmYzMA"
  } }
```

An empty window is `200` with `[]`, never `404`.

## Item fields

| Field | Notes |
|---|---|
| `order_id` | The order's own id. Pass a crypto one to [retrieve a crypto order](/api/crypto-orders/retrieve.html), a fiat one to [retrieve a fiat order](/api/fiat-orders/retrieve.html). |
| `type` | `fiat` or `crypto`. It tells you which retrieve endpoint `order_id` belongs to, and which of `amount_cents` / `amount` is populated. |
| `customer_id` | The Niftipay user id of the merchant the order belongs to. |
| `external_customer_id` | Your own id for that merchant, or `null` if the relationship has never been given one. |
| `reference` | The merchant's reference on the order (fiat: the merchant reference; crypto: the order reference). Empty string on a fiat order that carries none. |
| `status` | `completed` for `fiat`, `paid` for `crypto`. Those are the same thing on two rails, kept verbatim rather than flattened. |
| `completed_at` | ISO 8601. The moment the order settled, and the field both the ordering and the window filter use — not the moment it was created. |
| `currency` | The order's own currency. For crypto this is the asset (e.g. `USDT`), not a fiat currency. |
| `amount_cents` | Minor units. **`fiat` only** — `null` on a crypto order. |
| `amount` | Decimal **string**. **`crypto` only** — `null` on a fiat order. A string because a crypto amount does not survive a float. |
| `amount_eur_cents` | EUR minor units, for adding rows of mixed currency together. On a crypto order it comes from the order's recorded EUR value. On a fiat order it is populated **only when `currency` is `EUR`** — for any other fiat currency it is `null` and the conversion is yours, because converting it here would mean picking an FX rate and a date on your behalf. |

## Query parameters

| Parameter | Notes |
|---|---|
| `?status=` | `completed` is the only accepted value, and it is also the default. Any other value — including `paid` — is `400 invalid_request`. It exists so a client can be explicit, not to widen the set. |
| `?completed_from=` | Inclusive lower bound. |
| `?completed_to=` | **Exclusive** upper bound. |
| `?before=` | The `next_cursor` from a previous response. Opaque. |
| `?limit=` | Defaults to **100**, caps at **200**. Out-of-range is clamped, not rejected. |

### The window

`completed_from` and `completed_to` each accept two forms:

- `YYYY-MM-DD` — a calendar day in **Amsterdam** time. A date-only
  `completed_to` means the exclusive next Amsterdam midnight, so
  `completed_from=2026-10-01&completed_to=2026-11-01` is exactly October.
- An ISO 8601 datetime **with a zone** — `2026-10-01T00:00:00Z` or
  `2026-10-01T02:00:00+02:00`.

A datetime without a zone is `400 invalid_request`. It is refused rather than
assumed, because guessing a zone silently shifts a month boundary by two hours
and the rows that fall through the crack are invisible in both months.

Omitting both bounds returns the whole history, newest first.

## Paging

`next_cursor` is issued only on a full page; a short page ends the list and
comes back `null`. The cursor is a keyset over `(completed_at, order_id)`,
base64url-encoded and opaque — a cursor this API did not issue is
`400 invalid_cursor`.

```
while cursor is not null:
    page = GET /api/v1/partner/orders?limit=200&before=<cursor>
    cursor = page.data.next_cursor
```

Because the window is closed on `completed_at` and an order's `completed_at`
never moves once set, a completed window is stable: re-running the same bounds
returns the same rows.

## What you can and cannot see

An order is in your feed when the merchant is **your** customer and the
relationship is **active**, and when the order was either created by the
merchant itself (its own API key or checkout) or created through your
relationship with it. An order another partner created for the same merchant is
never in your feed, and a revoked relationship drops out of it entirely —
including its history.

## Errors

| Status | code | When |
|---|---|---|
| 400 | invalid_request | `status` is not `completed`, or a bound is unparseable or zoneless. |
| 400 | invalid_cursor | `before` is not a cursor this API issued. |
| 401 | unauthorized | Missing, malformed or expired token. |
| 403 | insufficient_scope | The token was minted without `orders:read`. |
| 500 | internal_error | Unexpected server error. Do not retry. |
| 503 | temporarily_unavailable | Transient failure. Retry. |
