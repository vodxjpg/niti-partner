---
title: Rename a payout wallet
section: API Reference / Payout Wallets
---
# Rename a payout wallet

<span class="badge patch">PATCH</span> `/api/v1/partner/customers/{customerId}/payout-wallets/{walletId}`

> Required scope: `payout_wallets:write`, plus the `payout_wallets` capability, an
> `Idempotency-Key` and a `partner.payout_wallet` signature.

Changes the label only. Address, chain and history are untouched. Counts toward
the 24-hour change limit.

```bash
curl -X PATCH https://www.niftipay.com/api/v1/partner/customers/{customerId}/payout-wallets/{walletId} \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "X-Withdrawal-Signature: <ed25519-assertion>" \
  -H "Content-Type: application/json" \
  -d '{ "label": "Treasury USDT" }'
```

## Response `200`
`data.wallet`. Errors: `404 not_found`, `400 invalid_request`, `429 rate_limited`, plus the [common errors](/api/payout-wallets/rules.html).
