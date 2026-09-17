---
title: List a customer's payouts
section: API Reference / Payouts
---
# List a customer's payouts

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/payouts`

> Required scope: `payouts:read`. Capability: `payouts`.

Newest first. Merges two legs onto one timeline: **forecast** rows (`status:
"upcoming"`, not yet run) and **history** rows (every payout that has already
been executed). A read of this endpoint is exempt from the merchant-eligibility
gate — a lapsed KYB grace does not take a merchant's own settlement history
offline for the partner that most needs it to reconcile.

```bash
curl "https://www.niftipay.com/api/v1/partner/customers/pc-1/payouts?limit=25" \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "payouts": [
      { "id": "upcoming_usr_a1b2c3d4_2026-10-15_EUR",
        "status": "upcoming",
        "currency": "EUR",
        "net_cents": 128900,
        "net_eur_cents": 128900,
        "payout_due_at": "2026-10-15T00:00:00.000Z",
        "paid_at": null,
        "created_at": "2026-10-01T00:00:03.000Z",
        "orders_count": 14 },
      { "id": "7d1dcdd4-9f3a-4c21-8f0e-2b1c9a5d4e10",
        "status": "paid",
        "currency": "EUR",
        "net_cents": 483210,
        "net_eur_cents": 483210,
        "payout_due_at": "2026-09-30T00:00:00.000Z",
        "paid_at": "2026-09-30T08:12:44.000Z",
        "created_at": "2026-09-23T00:00:05.000Z",
        "orders_count": 0 }
    ],
    "next_cursor": "MjAyNi0xMC0xNVQwMDowMDowMC4wMDBafHVwY29taW5nX3Vzcl9hMWIyYzNkNF8yMDI2LTEwLTE1X0VVUg"
  } }
```

An empty list is `200` with `[]`, never `404`. The customer exists — "no
payouts yet" is a fact about the collection, not a missing resource.

## Query parameters

| Parameter | Notes |
|---|---|
| `?limit=` | Defaults to **25**, caps at **100**. Out-of-range is **clamped, not rejected** — an oversized page size has one obvious correct reading, so it should not fail a partner merely tuning it. |
| `?before=` | The `next_cursor` from a previous response. Opaque — treat it as a token, not a value to construct. |
| `?status=` | One of `upcoming`, `pending`, `paid`, `failed`, `cancelled`, `processing`. Unlike `limit`, an out-of-range value is **rejected with `400 invalid_request`**, not clamped or ignored: a typo'd status has no obvious correct reading, and silently answering with the unfiltered list would let a partner reconcile against a set it believes is narrower than it actually is. |

## Paging

**`next_cursor` is issued only on a full page.** A short page is the end of the
list, so it comes back `null`. A full page that happens to be the last one gets
a cursor whose next fetch is an empty page — that is the loop's ordinary
termination.

The cursor is a keyset over `(payout_due_at, id)`, base64url-encoded and opaque.
Do not construct one yourself — a hand-built cursor that isn't exactly what this
API issued comes back `400 invalid_cursor`.

```
while cursor is not null:
    page = GET /customers/{id}/payouts?limit=100&before=<cursor>
    cursor = page.data.next_cursor
```

**`orders_count` is `0` on every settled (non-`upcoming`) row.** The underlying
payout record has no such column — the real count lives inside the payout's
`calculation` JSON, and parsing that JSON per row on a list is exactly the cost
this endpoint exists to avoid. Fetch [the payout by id](/api/payouts/retrieve)
to get the real `orders_count` and the per-order array. Forecast (`upcoming`)
rows are unaffected and always carry their real count.

## What a payout covers

**A payout is the merchant's entire settlement for the period — not just the
business this partner originated.** A payout is computed against the merchant's
whole account: their direct sales, orders placed through this partner, and
orders placed through any other partner the merchant also works with, all
summed against one retention hold and one fee total for that period.

So the amounts on this list (and the full breakdown on the [detail
read](/api/payouts/retrieve)) can be, and often will be, larger than the sum of
orders this partner itself created for that merchant. There is no way to filter
a payout down to "this partner's share" — the money was never split that way in
the first place. If a specific merchant should not be readable this way, the
partner's `payouts` capability on that relationship can be revoked; the payout
itself cannot be narrowed.

## Errors

| Status | code                    | Meaning                                                    |
|--------|-------------------------|-------------------------------------------------------------|
| 400    | invalid_cursor          | `before` is not a cursor this API issued.                    |
| 400    | invalid_request         | `status` is not one of the recognised values.                |
| 403    | insufficient_scope      | Token was not minted with `payouts:read`.                    |
| 403    | capability_not_enabled  | `payouts` is off for this customer.                           |
| 404    | resource_not_found      | Not your customer, or the relationship was revoked.          |
| 503    | temporarily_unavailable | Read failed transiently; retry shortly.                      |
| 500    | internal_error          | Unknown failure. **Not** an invitation to retry.             |
