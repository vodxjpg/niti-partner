---
title: List verifications
section: API Reference / Verifications
---
# List verifications

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/verifications`

> Required scope: `kyb:read` (global tier).

Returns the customer's single KYB case plus its status-transition history. A
customer that has never started a verification gets `404`, not an empty case.

## Request

```bash
curl -X GET https://api.niftipay.com/api/v1/partner/customers/pc-1/verifications \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "verifications": [
      { "verification_id": "app-1", "partner_customer_id": "pc-1", "type": "kyb",
        "status": "unverified", "submitted_at": null, "verified_at": null,
        "valid_until": null, "source": "niftipay", "reusable": false,
        "reuse_policy": "none", "document_access": "restricted",
        "created_at": "2026-08-01T00:00:00.000Z", "updated_at": null,
        "attributes": { "legal_name": "Example SL", "registration_number": "B123",
                        "trading_name": null, "website": null, "industry": null,
                        "registered_address_line1": null, "registered_address_line2": null,
                        "registered_city": null, "registered_postal_code": null,
                        "registered_country": null, "incorporation_country": null,
                        "incorporation_date": null, "business_registration_country": null },
        "directors": [], "ubos": [] } ],
    "history": [
      { "status": "kyb_submitted", "occurred_at": "2026-08-10T10:00:00.000Z" },
      { "status": "kyb_approved", "occurred_at": "2026-08-12T14:08:00.000Z" } ] } }
```

`verifications` always holds at most one entry (a merchant has a single KYB
case). `attributes` exposes only fields the merchant supplied; `valid_until` is
always `null` (coinx records no KYB expiry).

## Errors

| Status | code                | Meaning                                         |
|--------|---------------------|-------------------------------------------------|
| 404    | resource_not_found  | No verification has been started for this customer. |
| 404    | not_found           | Customer is not yours / relationship missing.    |
