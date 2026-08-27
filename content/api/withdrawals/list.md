---
title: List customer withdrawals
section: API Reference / Withdrawals
---
# List customer withdrawals

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/withdrawals`

> Required scope: `withdrawals:read`.

Returns the customer's recent withdrawals, newest first. Reading history does not require the merchant to be currently eligible to transact.

## Request

```bash
curl -X GET "https://www.niftipay.com/api/v1/partner/customers/{customerId}/withdrawals?limit=25" \
  -H "Authorization: Bearer <partner_api_key>"
```

| Param  | Type   | Required | Notes |
|--------|--------|----------|-------|
| `limit`| integer| no       | Default `25`, maximum `100`. Values above the maximum are clamped to `100`; non-positive or non-numeric values fall back to the default. |

## Response `200`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "withdrawals": [
      {
        "id": "wd-1",
        "created_at": "2026-08-24T10:00:00.000Z",
        "chain": "BTC",
        "asset": "BTC",
        "gross": "0.5",
        "fee": "0.001",
        "to_address": "bc1qdest",
        "tx_hash": "0xabc",
        "status": "sent"
      }
    ]
  }
}
```

Each withdrawal object:

| Field        | Type   | Notes |
|--------------|--------|-------|
| `id`         | string | Withdrawal id. |
| `created_at` | string | ISO-8601 timestamp. |
| `chain`      | string | Chain. |
| `asset`      | string | Asset. |
| `gross`      | string | Decimal string gross amount. |
| `fee`        | string | Decimal string fee. |
| `to_address` | string | Destination address. |
| `tx_hash`    | string or null | On-chain tx hash, or `null`. |
| `status`     | string | e.g. `sent`. |

An empty list (`[]`) is a valid answer.

## Errors
`503 temporarily_unavailable` if the list read fails transiently — retry shortly.
`500 internal_error` for a permanent read failure — do not retry automatically.
