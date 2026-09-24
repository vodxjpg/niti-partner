---
title: Add a payout wallet
section: API Reference / Payout Wallets
---
# Add a payout wallet

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/payout-wallets`

> Required scope: `payout_wallets:write`, plus the `payout_wallets` capability,
> an `Idempotency-Key` and an `X-Withdrawal-Signature` with action
> `partner.payout_wallet`. See [Payout wallet rules](/api/payout-wallets/rules.html).

Adds a wallet to the customer's book. The first wallet in an empty book becomes
the payout wallet; otherwise the payout wallet is unchanged — use
[set as payout wallet](/api/payout-wallets/actions.html) after the 24-hour
cooling-off.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/{customerId}/payout-wallets \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "X-Withdrawal-Signature: <ed25519-assertion>" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "TRC20", "asset": "USDT", "address": "TXYZ…", "label": "Main USDT", "acknowledged": true }'
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `chain` | string | yes | `ERC20` or `TRC20`. |
| `asset` | string | yes | `USDT` or `USDC`. |
| `address` | string | yes | Validated for `chain`. |
| `label` | string | no | Defaults to `"<asset> <chain>"`. |
| `destination_tag` | string | no | |
| `acknowledged` | boolean | yes | Must be `true`. |

## Response `201`

`data.wallet`, in the shape shown in [List payout wallets](/api/payout-wallets/list.html).

## Errors
`400 invalid_request` (unsupported asset/chain, invalid address, missing acknowledgement, 3 wallets already active), `409 conflict` (address already in the book), `429 rate_limited`, plus the [common errors](/api/payout-wallets/rules.html).
