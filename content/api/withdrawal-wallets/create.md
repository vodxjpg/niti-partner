---
title: Register a withdrawal wallet
section: API Reference / Withdrawal Wallets
---
# Register a withdrawal wallet

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/withdrawal-wallets`

> Required scope: `withdrawals:write`, plus the `withdrawals` capability — which
> is KYB-gated, so it turns on when the customer's verification is approved.

Adds a destination to the customer's withdrawal allowlist.

This is the endpoint the signature really protects. A withdrawal can only send
to an address already on the allowlist, so an attacker holding just your bearer
token cannot move funds anywhere new — adding a destination needs the signature
too. Needs both an `Idempotency-Key` and an `X-Withdrawal-Signature`; see
[Signing withdrawals](/getting-started/withdrawal-signing.html).

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/{customerId}/withdrawal-wallets \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "X-Withdrawal-Signature: <ed25519-assertion>" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "BTC", "asset": "BTC", "label": "Treasury", "address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "destination_tag": "12345" }'
```

| Field            | Type   | Required | Notes |
|------------------|--------|----------|-------|
| `chain`          | string | yes      | One of `BTC`, `ETH`, `LTC`, `SOL`, `XRP`, `TRON` (uppercased). |
| `asset`          | string | yes      | Uppercased. |
| `label`          | string | yes      | Non-blank display label. |
| `address`        | string | yes      | Must be valid for `chain` (typo guard). |
| `destination_tag`| string | no       | Optional; if present must be a non-blank string. |

`userId` is set server-side from the relationship and ignored if supplied. At most 20 destinations may be registered per chain per customer.

## Response `201`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "wallet": {
      "id": "w-1",
      "chain": "BTC",
      "asset": "BTC",
      "label": "Treasury",
      "address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      "destination_tag": "12345",
      "created_at": "2026-08-24T10:00:00.000Z",
      "last_used_at": null
    }
  }
}
```

## Errors
`400 idempotency_key_required` when no `Idempotency-Key` header is provided.
`401 signature_required` when `X-Withdrawal-Signature` is missing or invalid.
`400 invalid_request` for a non-JSON body or missing `chain`, `asset`, `label`, or `address`.
`400 unsupported_chain` when `chain` is not one of the six supported chains.
`400 invalid_address` when `address` is not valid for its chain.
`409 wallet_limit_reached` when 20 destinations already exist for this chain.
`503 temporarily_unavailable` for a transient database failure (reservation kept).
`500 internal_error` for a permanent write failure.
`409 idempotency_key_reuse` when the same key is reused with a different body.
`409 idempotency_key_in_progress` when retried inside the window after a transport failure.
