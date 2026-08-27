---
title: List withdrawal wallets
section: API Reference / Withdrawal Wallets
---
# List withdrawal wallets

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/withdrawal-wallets`

Returns the customer's registered withdrawal destinations (the allowlist). Reading the allowlist does not require the merchant to be currently eligible to transact.

## Request

```bash
curl -X GET https://www.niftipay.com/api/v1/partner/customers/{customerId}/withdrawal-wallets \
  -H "Authorization: Bearer <partner_api_key>"
```

No query parameters. The merchant is taken from the customer relationship.

## Response `200`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "wallets": [
      {
        "id": "w-1",
        "chain": "BTC",
        "asset": "BTC",
        "label": "Treasury",
        "address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        "destination_tag": null,
        "created_at": "2026-08-24T10:00:00.000Z",
        "last_used_at": null
      }
    ]
  }
}
```

Each wallet object:

| Field            | Type           | Notes |
|------------------|----------------|-------|
| `id`             | string         | Destination id. |
| `chain`          | string         | Chain. |
| `asset`          | string         | Asset. |
| `label`          | string         | Display label. |
| `address`        | string         | Destination address. |
| `destination_tag`| string or null | Optional destination tag. |
| `created_at`     | string         | ISO-8601 timestamp. |
| `last_used_at`   | string or null | ISO-8601 timestamp of last use, or `null`. |

An empty list (`[]`) is a valid answer — it is not a 404.

## Errors
`503 temporarily_unavailable` if the list read fails transiently — retry shortly.
`500 internal_error` for a permanent read failure — do not retry automatically.
