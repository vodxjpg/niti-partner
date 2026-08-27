---
title: List capabilities
section: API Reference / Capabilities
---
# List capabilities

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/capabilities`

> Required scope: `customers:read` (global tier). Capabilities are a sub-resource
> of the customer, so no separate scope is needed.

Reports, per capability, two independent facts:

- `enabled` — the **grant**: whether your partner integration is permitted to use
  this capability on this customer. See *How grants are set* below.
- `available` — merchant-side **truth**, which can flip on its own (e.g. KYB expiring,
  a chargeback threshold landing) with nobody touching the partner's configuration.

Reporting both lets you explain a disabled action in your own words ("payments
unavailable — verification pending") instead of guessing from a `409`.

## Request

```bash
curl -X GET https://www.niftipay.com/api/v1/partner/customers/pc-1/capabilities \
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

All six capabilities are always returned. When a
capability's availability check itself fails, the entry degrades to
`{ "available": true, "reason": "availability_unknown" }` — distinguishable from a
healthy resolve — so you can render the uncertainty rather than assert a state you
have no basis for. The internal error is logged, never returned.

## How grants are set

Two arrangements exist, and which one applies to you is a property of your
partner integration rather than of any individual customer.

**Auto-granted.** A customer you create starts with the same capability set a
merchant signing up directly receives:

| Capability           | On creation | Notes                              |
|----------------------|-------------|------------------------------------|
| `payments.crypto`    | granted     |                                    |
| `payouts`            | granted     |                                    |
| `refunds`            | granted     |                                    |
| `wallets`            | granted     |                                    |
| `payments.fiat_card` | **held**    | Granted when KYB is approved.      |
| `withdrawals`        | **held**    | Granted when KYB is approved.      |

The two held capabilities are the money-out and card rails. They are granted
automatically the moment the customer's [verification](/api/verifications/create.html)
is approved, and withdrawn again if it is later rejected — you do not need to
ask anyone.

**Manually granted.** Every capability starts at `false` and is turned on by
Niftipay staff per customer.

Either way, the check below is the same, and it is the one to build against:
read `enabled` and `available` rather than assuming a starting state.

## `enabled` and `available` are two separate gates

Turning a grant on does not make a capability usable. Calling a rail you have
been granted but whose merchant is not eligible returns `409
capability_unavailable`, not a `403` — the two failures need different handling:

| `enabled` | `available` | Calling the rail gives | What to do                        |
|-----------|-------------|------------------------|-----------------------------------|
| `false`   | any         | `403 capability_not_enabled` | Ask Niftipay, or complete KYB. |
| `true`    | `false`     | `409 capability_unavailable` | Wait, or act on `reason`.      |
| `true`    | `true`      | The rail runs          | —                                 |

## Errors

| Status | code                | Meaning                                       |
|--------|---------------------|-----------------------------------------------|
| 403    | insufficient_scope  | Token was not minted with `customers:read`.   |
| 404    | resource_not_found  | Customer is not yours / relationship missing. |
