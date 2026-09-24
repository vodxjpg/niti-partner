---
title: Set payout wallet / replace
section: API Reference / Payout Wallets
---
# Set payout wallet / replace a wallet

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/payout-wallets/{walletId}`

> Required scope: `payout_wallets:write`, plus the `payout_wallets` capability, an
> `Idempotency-Key` and a `partner.payout_wallet` signature.

## `set_payout` — make this the payout wallet

```json
{ "action": "set_payout", "acknowledged": true }
```

Moves `is_payout_wallet` to this wallet. Refused with `400 cooling_off` while
the wallet is inside its 24-hour cooling-off (see `details[0].cooling_off_until`).
If it already is the payout wallet the response carries `"unchanged": true`.

## `replace` — swap a wallet for a new address

```json
{ "action": "replace", "chain": "TRC20", "asset": "USDT", "address": "TNEW…", "label": "New USDT", "acknowledged": true }
```

Archives `{walletId}` and adds the new wallet in one change. If the replaced
wallet was the payout wallet, the new one takes over. The response carries the
new `wallet` and `archived_wallet_id`.

## Errors
`400 invalid_request` (unknown `action`, validation, missing acknowledgement), `400 cooling_off`, `404 not_found`, `409 conflict`, `429 rate_limited`, plus the [common errors](/api/payout-wallets/rules.html).
