---
title: Create customer wallets
section: API Reference / Wallets
---
# Create customer wallets

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/wallets`

Provisions the customer's persistent master wallet addresses, one per chain (BTC, ETH, LTC, SOL, XRP, TRON) on mainnet, and returns them. Call this once per customer; it is idempotent per chain.

## Request

No request body. The merchant is taken from the customer relationship, never from the request. This endpoint carries **no** `Idempotency-Key` requirement.

```bash
curl -X POST https://api.niftipay.com/api/v1/partner/customers/{customerId}/wallets \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Content-Type: application/json"
```

## Response `201`

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
      },
      {
        "chain": "ETH",
        "address": "0xeth",
        "balance": "0",
        "balanceUnavailable": true,
        "tokens": { "USDT": "0", "USDC": "0" },
        "tokensUnavailable": ["USDT"],
        "network": "mainnet"
      }
    ]
  }
}
```

`wallets` is an array of objects. Fields:

| Field               | Type            | Required | Notes |
|---------------------|-----------------|----------|-------|
| `chain`             | string          | always   | e.g. `BTC`, `ETH`. |
| `address`           | string          | always   | The master address for the chain. |
| `balance`           | string          | always   | Decimal string of the chain-native balance. |
| `network`           | string          | always   | Always `mainnet`. |
| `balanceUnavailable`| boolean         | no       | Present only when the balance could not be read. |
| `tokens`            | object          | no       | Map of token symbol to decimal-string balance. |
| `tokensUnavailable` | array of string | no       | Tokens whose balance could not be read. |

If the post-provision balance read fails, `wallets` is `[]` and `walletsUnavailable: true` is added (so an empty list is not mistaken for "nothing provisioned"). That marker is omitted on a healthy read and on a genuinely empty provision.

## Errors
`503 temporarily_unavailable` if wallet generation (Tatum) fails transiently — retry shortly.
`500 internal_error` for permanent provisioning failures — do not retry automatically.
