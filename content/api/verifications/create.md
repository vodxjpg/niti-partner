---
title: Create a verification
section: API Reference / Verifications
---
# Create a verification

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/verifications`

> Required scope: `kyb:write`.

Writes structured KYB data for the customer, then attempts to submit the case
every time. Once the five required documents exist and the form is complete, the
next POST carries the case into review — so "submit" is never a separate verb to
forget. A submission blocked by missing evidence or an incomplete form is **not**
an error: the response reports `submitted: false` and what is outstanding, and
you re-POST once ready.

Only `kyb` verifications exist. The server injects `type: "kyb"`; do **not** send
a `type` field (sending `type: "kyc"` is refused). The payload is strict — unknown
fields are rejected, not ignored.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/verifications \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Content-Type: application/json" \
  -d '{ "business": { "legal_name": "Example SL", "registration_number": "B123" } }'
```

| Field                                    | Type            | Required | Notes                                                        |
|------------------------------------------|-----------------|----------|--------------------------------------------------------------|
| `business`                               | object          | no       | Company details.                                             |
| `business.legal_name`                    | string          | no       | Mapped to `companyName`.                                     |
| `business.trading_name`                  | string          | no       |                                                              |
| `business.website`                       | string          | no       |                                                              |
| `business.industry`                      | string          | no       | Enum — see [KYB field reference](/api/verifications/fields.html).                                 |
| `business.registration_number`           | string          | no       |                                                              |
| `business.registered_address`            | object          | no       | `{ line1, line2, city, postal_code, country }`.              |
| `business.incorporation_country`         | string          | no       |                                                              |
| `business.incorporation_date`            | string          | no       |                                                              |
| `business.business_registration_country` | string          | no       |                                                              |
| `contact`                                | object          | no       | `{ first_name, last_name, email, phone }`.                   |
| `commercial`                             | object          | no       | `{ expected_monthly_processing_volume, card_type, settlement_option, fee_handling, requested_payment_methods[] }`. |
| `directors`                              | array (≤20)     | no       | Each: `{ full_name, date_of_birth, nationality, country?, email?, phone?, address_line1?, city?, postal_code? }`. |
| `ubos`                                   | array (≤20)     | no       | Person fields + `ownership_percent` (number 25–100).         |
| `consent`                                | object          | no       | `{ version?, marketing_opt_in? }`.                           |

Omitting a field leaves its stored value untouched; an explicit `null` clears it.

## Response `200`

The status is always `200`, whether or not submission succeeded.

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "verification": {
      "verification_id": "app-1", "partner_customer_id": "pc-1", "type": "kyb",
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
      "directors": [], "ubos": [] },
    "submitted": false,
    "blocked_by": "missing_documents",
    "missing_documents": ["proof_of_address", "director_id"],
    "incomplete_fields": [] } }
```

`status` is one of `unverified` | `pending` | `approved` | `rejected`. `blocked_by`
is `null` when submitted, otherwise the submit code (`missing_documents` → see
`missing_documents`; `validation_failed` → see `incomplete_fields`).

## Errors

| Status | code                         | Meaning                                                              |
|--------|------------------------------|----------------------------------------------------------------------|
| 400    | invalid_request              | Body missing or not a JSON object.                                   |
| 422    | invalid_request              | Payload invalid or carries an unknown field (`details` lists issues).|
| 422    | unsupported_verification_type| `type` was `kyc` (only `kyb` is supported).                          |
| 409    | verification_in_progress     | Case already under review and cannot be modified.                    |
| 500    | internal_error               | The verification could not be read back.                             |
