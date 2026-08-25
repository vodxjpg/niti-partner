---
title: Retrieve a verification
section: API Reference / Verifications
---
# Retrieve a verification

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/verifications`

> Required scope: `kyb:read` (global tier).

> **Non-obvious rule — no per-id route exists yet.** The live
> `coinx-fiat` route only implements `GET /verifications` (a customer has exactly
> one KYB case). There is **no** `…/verifications/{verificationId}` path segment
> in the source; the case id is the `verification_id` returned in the list/POST
> responses. Use the path shown above to fetch the customer's case. This page
> documents that response; treat `verification_id` as a returned field, not a path
> parameter.

Returns the customer's KYB case and its status-transition history.

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
        "status": "approved", "submitted_at": "2026-08-10T10:00:00.000Z",
        "verified_at": "2026-08-12T14:08:00.000Z", "valid_until": null,
        "source": "niftipay", "reusable": false, "reuse_policy": "none",
        "document_access": "restricted", "created_at": "2026-08-01T00:00:00.000Z",
        "updated_at": "2026-08-12T14:08:00.000Z",
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

`status` is one of `unverified` | `pending` | `approved` | `rejected`. `expired` is
never returned; a past-due case shows `valid_until: null`. `history` carries only
the transition status and its timestamp — reviewer notes and reason codes are
withheld.

## Errors

| Status | code                | Meaning                                         |
|--------|---------------------|-------------------------------------------------|
| 404    | resource_not_found  | No verification has been started for this customer. |
| 404    | not_found           | Customer is not yours / relationship missing.    |
