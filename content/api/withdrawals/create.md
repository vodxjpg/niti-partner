---
title: Create a withdrawal
section: API Reference / Withdrawals
---
# Create a withdrawal

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/withdrawals`

Sends crypto from the customer's wallet to a registered destination. Requires an idempotency key and a withdrawal signature.

## Request

```bash
curl -X POST https://api.niftipay.com/api/v1/partner/customers/{customerId}/withdrawals \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "X-Withdrawal-Signature: <ed25519-assertion>" \
  -H "Content-Type: application/json" \
  -d '{ "chain": "BTC", "asset": "BTC", "amount": "0.5", "to": "bc1qdest" }'
```

| Field    | Type   | Required | Notes |
|----------|--------|----------|-------|
| `chain`  | string | yes      | Uppercased. A registered destination must exist for this chain+address. |
| `asset`  | string | yes      | Uppercased. |
| `amount` | string | yes      | Decimal string. |
| `to`     | string | yes      | Destination address. Must match a registered withdrawal wallet for this customer. |
| `network`| string | no       | If present, must be `mainnet` (anything else is refused). |

Only `chain`, `asset`, `amount`, and `to` are forwarded to the platform service; everything else in the body is ignored. `userId` is set server-side from the relationship and cannot be overridden. `destinationTag`, if any, is taken from the **registered** destination row, never from the request body.

## Response `201`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "withdrawal": {
      "tx_hash": "0xabc",
      "chain": "BTC",
      "asset": "BTC",
      "gross": "0.5",
      "fee": "0.001",
      "net": "0.499",
      "gas": "0.0001",
      "to_address": "bc1qdest"
    }
  }
}
```

## Errors
`400 idempotency_key_required` when no `Idempotency-Key` header is provided.
`401 signature_required` when `X-Withdrawal-Signature` is missing or invalid.
`400 invalid_request` for a non-JSON/unreadable body or missing `chain`, `asset`, `amount`, or `to`.
`400 unsupported_network` when `network` is present but not `mainnet`.
`403 destination_not_registered` when `to` is not a registered destination for this customer (identical response for a destination registered to another merchant).
`409 insufficient_balance` when the wallet or token balance is too low.
`400 amount_too_small` when the amount is consumed by gas and fees.
`400 unsupported_asset` when the asset is unsupported on the chain.
`400 invalid_amount` when `amount` is not a valid positive number.
`400 withdrawal_refused` for any other service refusal not in the mapped set.
`503 temporarily_unavailable` on a 5xx from the service or a transport failure (reservation is kept so a retry is safe).
`500 internal_error` for permanent unclassified failures.
`409 idempotency_key_reuse` when the same key is reused with a different body.
`409 idempotency_key_in_progress` when retried inside the window after a transport failure.
