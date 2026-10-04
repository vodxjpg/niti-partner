---
title: Set payout wallet / replace / restore
section: API Reference / Payout Wallets
---
# Set payout wallet, replace or restore a wallet

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

An address the customer has held before is still in the book, so `replace` onto
it answers `409 conflict` rather than adding a second row. If the wallet holding
it is archived, `restore` it and then `set_payout`; if it is active, `set_payout`
on that wallet directly.

## `restore` — bring an archived wallet back

```json
{ "action": "restore" }
```

Returns an archived wallet to `status: "active"` with its original id, label and
address. No acknowledgement, because nothing moves: `is_payout_wallet` is left
alone, so a restored wallet becomes the payout destination only through a
following `set_payout`. Refused with `400 invalid_request` when the wallet is
not archived, or when the customer already holds the maximum number of active
wallets.

## Errors
`400 invalid_request` (unknown `action`, validation, missing acknowledgement, wallet not archived, active-wallet cap), `400 cooling_off`, `404 not_found`, `409 conflict` (the address is already in the book), `429 rate_limited`, plus the [common errors](/api/payout-wallets/rules.html).
