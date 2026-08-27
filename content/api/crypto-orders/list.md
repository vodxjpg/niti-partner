---
title: List a customer's crypto orders
section: API Reference / Crypto Orders
---
# List a customer's crypto orders

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/orders`

> Required scope: `orders:read`. Capability: `payments.crypto`.

Newest first. Returns only orders minted by **this** partner relationship — a
partner never sees another partner's orders, even though both share the
merchant's underlying account.

```bash
curl "https://www.niftipay.com/api/v1/partner/customers/pc-1/orders?limit=25" \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "orders": [
      { "id": "7d1dcdd4-9f3a-4c21-8f0e-2b1c9a5d4e10",
        "reference": "CRY-1042",
        "network": "ETH", "asset": "USDT",
        "amount": "116.751879", "totalToSend": "116.751879",
        "networkFees": null,
        "currency": "EUR", "fiatAmount": "100",
        "address": "0x49d83b0d1f2c4a6e8b7d5c3a9f1e0d2b4c6a8e70",
        "paymentUri": "ethereum:0x49d83b0d?contract=0xdAC17F&amount=116.751879",
        "qrUrl": "https://www.niftipay.com/api/qr?data=ethereum%3A0x49d83b0d",
        "status": "pending",
        "createdAt": "2026-08-27T09:12:02.923Z",
        "expiresAt": "2026-08-27T21:12:02.923Z" }
    ],
    "next_cursor": "b3JkOjE3NjQyMzc1MjI5MjM6N2QxZGNkZDQ"
  } }
```

An empty list is `200` with `[]`, never `404`. The customer exists — "no orders
yet" is a fact about the collection, not a missing resource.

## Paging

`?limit=` defaults to **25** and caps at **100**. An out-of-range value is
**clamped, not rejected** — a partner tuning a page size should not get a `400`.

`?before=` takes the `next_cursor` from a previous response. Treat it as
opaque: it is a keyset cursor over `(createdAt, id)`, and constructing one
yourself will silently skip rows that share a timestamp at a page boundary.

**`next_cursor` is issued only on a full page.** A short page is the end of the
list, so it comes back `null`. A full page that happens to be the last one gets
a cursor whose next fetch is an empty page — that is the loop's ordinary
termination.

```
while cursor is not null:
    page = GET /customers/{id}/orders?limit=100&before=<cursor>
    cursor = page.data.next_cursor
```

A `before` we did not issue is a `400 invalid_cursor` rather than a silent
page one — ignoring it would turn "fetch until empty" into an infinite loop.

## Two shape notes

**`next_cursor` is snake_case; the order objects are camelCase.** The order view
is inherited verbatim from the merchant-internal one rather than re-shaped, so
it keeps its own casing. Everything partner-native inside `data` is snake_case.

**List rows carry `qrUrl` but not `qrImage`.** The inline PNG is rendered only
for single-order reads — a page of 100 would be 100 renders. Fetch the order by
id, or render `qrUrl` yourself.

## Errors

| Status | code                    | Meaning                                                    |
|--------|-------------------------|-------------------------------------------------------------|
| 400    | invalid_cursor          | `before` is not a cursor this API issued.                    |
| 403    | insufficient_scope      | Token was not minted with `orders:read`.                     |
| 403    | capability_not_enabled  | `payments.crypto` is off for this customer.                  |
| 404    | resource_not_found      | Not your customer, or the relationship was revoked.          |
| 503    | temporarily_unavailable | Read failed transiently; retry shortly.                      |
| 500    | internal_error          | Unknown failure. **Not** an invitation to retry.             |
