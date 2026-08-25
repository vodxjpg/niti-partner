---
title: List customer wallets
section: API Reference / Wallets
---
# List customer wallets

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/wallets`

Returns the customer's master wallet addresses and balances across all chains.

## Request

```bash
curl -X GET https://api.niftipay.com/api/v1/partner/customers/{customerId}/wallets \
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
        "chain": "BTC",
        "address": "bc1qbtc",
        "balance": "0.5",
        "network": "mainnet"
      }
    ]
  }
}
```

`wallets` is an array of objects. See [Create customer wallets](./create.md) for the per-wallet field table (`chain`, `address`, `balance`, `network`, `balanceUnavailable`, `tokens`, `tokensUnavailable`). An empty list (`[]`) is a valid answer for a customer with no wallets — it is not a 404.

## Errors
`503 temporarily_unavailable` if balances could not be read transiently — retry shortly.
`500 internal_error` for a permanent read failure — do not retry automatically.
