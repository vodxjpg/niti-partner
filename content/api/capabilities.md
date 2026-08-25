---
title: List capabilities
section: API Reference / Capabilities
---
# List capabilities

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/capabilities`

> Required scope: `customers:read` (global tier). Capabilities are a sub-resource
> of the customer, so no separate scope is needed.

Reports, per capability, two independent facts:

- `enabled` — the **grant**, changed only by staff (the partner's configuration key).
- `available` — merchant-side **truth**, which can flip on its own (e.g. KYB expiring,
  a chargeback threshold landing) with nobody touching the partner's configuration.

Reporting both lets you explain a disabled action in your own words ("payments
unavailable — verification pending") instead of guessing from a `409`.

## Request

```bash
curl -X GET https://api.niftipay.com/api/v1/partner/customers/pc-1/capabilities \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "capabilities": [
      { "capability": "payments.crypto", "enabled": false, "available": true, "reason": null },
      { "capability": "payments.fiat_card", "enabled": true, "available": false,
        "reason": "chargeback_threshold" },
      { "capability": "payouts", "enabled": false, "available": true, "reason": null },
      { "capability": "refunds", "enabled": false, "available": true, "reason": null },
      { "capability": "wallets", "enabled": false, "available": true, "reason": null },
      { "capability": "withdrawals", "enabled": false, "available": true, "reason": null } ] } }
```

| Capability            | Gates                                            |
|-----------------------|--------------------------------------------------|
| `payments.crypto`     | Crypto order creation (`payments.crypto` scope). |
| `payments.fiat_card`  | Fiat card payments.                              |
| `payouts`             | Payouts.                                         |
| `refunds`             | Refunds.                                         |
| `wallets`             | Wallet operations.                               |
| `withdrawals`         | Withdrawals.                                     |

All six capabilities are always returned. `enabled` defaults to `false`. When a
capability's availability check itself fails, the entry degrades to
`{ "available": true, "reason": "availability_unknown" }` — distinguishable from a
healthy resolve — so you can render the uncertainty rather than assert a state you
have no basis for. The internal error is logged, never returned.

## Errors

| Status | code                | Meaning                                  |
|--------|---------------------|------------------------------------------|
| 404    | not_found           | Customer is not yours / relationship missing. |
