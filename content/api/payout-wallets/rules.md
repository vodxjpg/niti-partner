---
title: Payout wallet rules
section: API Reference / Payout Wallets
---
# Payout wallet rules

Every write to a customer's payout wallet book goes through the same book the
merchant's own dashboard uses, with the same rules. The only difference is the
second factor: where the merchant enters a 2FA code, you send an
[`X-Withdrawal-Signature`](/getting-started/withdrawal-signing.html) assertion
signed with **action `partner.payout_wallet`**, plus an `Idempotency-Key`.

| Rule | Behaviour |
|------|-----------|
| Access | Scope `payout_wallets:write` **and** the `payout_wallets` capability. The capability is never granted by default — Niftipay staff turn it on per customer. |
| Assets / chains | `asset`: `USDT` or `USDC`. `chain`: `ERC20` or `TRC20`. |
| Cap | At most 3 active wallets. |
| Duplicates | An address already in the book (active or archived) is refused with `409 conflict`. |
| Rate limit | At most 3 changes per customer per 24 hours, merchant and partner changes combined → `429 rate_limited`. |
| Cooling-off | A wallet added in the last 24 hours cannot become the payout wallet → `400 cooling_off`, with `details: [{ "cooling_off_until": "<ISO>" }]`. |
| Risk acknowledgement | Adding, replacing and setting the payout wallet need `"acknowledged": true`, confirming the merchant accepted the risk statement. |
| Payout wallet | The current payout wallet cannot be archived; set another wallet as payout first. |
| Notification | Every change emails the merchant a security notice naming your integration, and is recorded in the merchant's wallet history. |

The merchant is always the customer in the path — never anything in the body.
A wallet id that belongs to another customer answers `404`.

Common errors for all writes:
`400 idempotency_key_required`, `401 signature_required`,
`403 capability_not_enabled`, `409 idempotency_key_reuse`,
`409 idempotency_key_in_progress`, `503 temporarily_unavailable`,
`500 internal_error`.
