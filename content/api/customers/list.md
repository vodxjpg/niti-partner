---
title: List customers
section: API Reference / Customers
---
# List customers

<span class="badge get">GET</span> `/api/v1/partner/customers`

Returns the partner's customers (cursor-paginated).

```bash
curl https://www.niftipay.com/api/v1/partner/customers \
  -H "Authorization: Bearer <partner_api_key>"
```

| Query        | Type   | Notes                     |
|--------------|--------|---------------------------|
| `limit`      | int    | Page size (default 50).   |
| `cursor`     | string | Opaque cursor from prior response. |

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
        }
      }
    ],
    "next_cursor": null
  }
}
```
