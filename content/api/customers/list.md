---
title: List customers
section: API Reference / Customers
---
# List customers

<span class="badge get">GET</span> `/api/v1/partner/customers`

> Required scope: `customers:read`.

Returns the partner's customers (cursor-paginated).

```bash
curl https://www.niftipay.com/api/v1/partner/customers \
  -H "Authorization: Bearer <partner_api_key>"
```

| Query    | Type   | Notes                                                                 |
|----------|--------|-----------------------------------------------------------------------|
| `limit`  | int    | Page size. Defaults to **25**, caps at **100**; out-of-range is clamped, not rejected. |
| `before` | string | The `next_cursor` from a previous response. Opaque — a cursor this API did not issue is `400 invalid_cursor`. |

## Response `200`
```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "customers": [
      {
        "partner_customer_id": "pc-1",
        "customer_id": "user_abc",
        "external_customer_id": "cust_42",
        "relationship_status": "active",
        "created_at": "2026-08-01T00:00:00.000Z",
        "customer": {
          "email": "buyer@example.com",
          "name": null,
          "country": null,
          "created_at": null
        },
        "payment_methods": {
          "crypto": true,
          "fiat_card": true,
          "ramping": false,
          "bank_transfer": false
        }
      }
    ],
    "next_cursor": null
  }
}
```

## `payment_methods`

Which of the four rails the merchant can currently use. Platform defaults are
already applied, so these are the effective values, not the merchant's
overrides.

| Key | Rail |
|---|---|
| `crypto` | Crypto orders. |
| `fiat_card` | Card payments. |
| `ramping` | On/off-ramp. |
| `bank_transfer` | Bank transfer. |

A rail being `true` here means the merchant's own settings allow it. It is not
the same gate as a **capability**, which is granted on your relationship with
the merchant — see [capabilities](/api/capabilities.html). Both must be open
before a call on that rail succeeds, so check the capability too rather than
branching on `payment_methods` alone.

## Paging

`next_cursor` is issued only on a full page; a short page is the end of the
list and comes back `null`. The cursor is a keyset over `(created_at, id)`,
base64url-encoded and opaque.

```
while cursor is not null:
    page = GET /api/v1/partner/customers?limit=100&before=<cursor>
    cursor = page.data.next_cursor
```
