---
title: Archive a payout wallet
section: API Reference / Payout Wallets
---
# Archive a payout wallet

<span class="badge delete">DELETE</span> `/api/v1/partner/customers/{customerId}/payout-wallets/{walletId}`

> Required scope: `payout_wallets:write`, plus the `payout_wallets` capability, an
> `Idempotency-Key` and a `partner.payout_wallet` signature (over an empty body).

Archives the wallet. It stays in the book as `status: "archived"` for history,
and keeps its address reserved: a later `create` or `replace` with that same
address answers `409 conflict`. To use it again, bring the wallet itself back
with [`restore`](/api/payout-wallets/actions.html) rather than adding a second
row. The current payout wallet cannot be archived — set another wallet as payout
first, or use [replace](/api/payout-wallets/actions.html).

## Response `200`
`data.wallet` (now archived). Errors: `404 not_found`, `400 invalid_request` (payout wallet), `429 rate_limited`, plus the [common errors](/api/payout-wallets/rules.html).
