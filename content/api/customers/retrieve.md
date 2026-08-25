---
title: Retrieve a customer
section: API Reference / Customers
---
# Retrieve a customer

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}`

```bash
curl https://api.niftipay.com/api/v1/partner/customers/pc-1 \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
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
`404 not_found` if the customer is not yours.
