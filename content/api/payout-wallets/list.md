---
title: List payout wallets
section: API Reference / Payout Wallets
---
# List payout wallets

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/payout-wallets`

> Required scope: `payout_wallets:read`, plus the `payout_wallets` capability.

Returns the customer's fiat payout wallet book: the stablecoin wallets its fiat
settlements are paid to. Exactly one active wallet has `is_payout_wallet: true`
once the book is set up. Archived wallets are included so you can reconcile
history. Reading the book does not require the merchant to be currently
eligible to transact.

## Request

```bash
curl https://www.niftipay.com/api/v1/partner/customers/{customerId}/payout-wallets \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "wallets": [
      {
        "id": "7c1e…",
        "label": "Main USDT",
        "chain": "TRC20",
        "asset": "USDT",
        "address": "TXYZ…",
        "destination_tag": null,
        "status": "active",
        "is_payout_wallet": true,
        "created_at": "2026-09-01T10:00:00.000Z",
        "archived_at": null
      }
    ]
  }
}
```

## Errors
`403 capability_not_enabled` when the `payout_wallets` capability is not granted.
`503 temporarily_unavailable` for a transient failure. `500 internal_error` otherwise.
