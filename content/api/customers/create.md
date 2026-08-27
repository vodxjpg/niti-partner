---
title: Create a customer
section: API Reference / Customers
---
# Create a customer

<span class="badge post">POST</span> `/api/v1/partner/customers`

Links a partner's external customer to the merchant ledger.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "external_customer_id": "cust_42", "email": "buyer@example.com" }'
```

| Field                 | Type   | Required | Notes                              |
|-----------------------|--------|----------|------------------------------------|
| `external_customer_id`| string | yes      | Your id for this customer (≤200).  |
| `email`               | string | yes      | Used to link repeat customers.     |
| `name`                | string | no       | Optional display name.             |
| `phone`               | string | no       | Optional (≤32).                    |
| `telegram_handle`     | string | no       | Optional (≤64), leading `@` stripped. |

Unrecognised fields are refused, never ignored.

## Response `201`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "partner_customer_id": "pc-1",
    "customer_id": "user_abc",
    "external_customer_id": "cust_42",
    "relationship_status": "active",
    "created_at": "2026-08-01T00:00:00.000Z",
    "customer": {
      "email": "buyer@example.com",
      "name": null,
      "country": null,
      "created_at": null
    }
  }
}
```

## Errors
`400 invalid_request` for unrecognised fields or a missing/wrong-typed `external_customer_id` or `email`.
`409 customer_exists` if the customer already belongs to another identity.
