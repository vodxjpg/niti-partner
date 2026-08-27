---
title: List agreements
section: API Reference / Agreements
---
# List agreements

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/agreements`

> Required scope: `agreements:read` (global tier).

Returns every catalogued agreement and where this customer stands on each.
"Assigned" currently means all customers on the current version. `status` answers
the only question you have: `required` (no valid acceptance), `accepted` (current
version accepted), or `superseded` (an old version was accepted and must be
re-collected).

## Request

```bash
curl -X GET https://www.niftipay.com/api/v1/partner/customers/pc-1/agreements \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "agreements": [
      { "agreement_id": "tos", "title": "Terms of Service", "version": "1.0",
        "effective_date": "2026-01-01", "document_url": "https://.../tos.pdf",
        "content_hash": "a1b2c3…64hex",
        "parties": [ { "role": "provider", "name": "Niftipay" },
                     { "role": "customer", "name": "Example SL" } ],
        "disclosure": "This agreement is between you and Niftipay …",
        "status": "required", "current_acceptance": null,
        "previous_acceptances": [] } ] } }
```

| Field                | Type   | Notes                                                   |
|----------------------|--------|---------------------------------------------------------|
| `agreement_id`       | string |                                                         |
| `title`              | string |                                                         |
| `version`            | string | Current version in force.                               |
| `effective_date`     | string |                                                         |
| `document_url`       | string | Where to render the document text.                      |
| `content_hash`       | string | 64-hex SHA-256 of the document body.                    |
| `parties`            | array  | At least two: `{ role, name }`.                         |
| `disclosure`         | string | Always names Niftipay (no silent terms).                |
| `status`             | string | `required` \| `accepted` \| `superseded`.               |
| `current_acceptance` | object\|null | The acceptance of the current version, if any.  |
| `previous_acceptances`| array | Acceptances of superseded versions.                    |

The `current_acceptance` object mirrors *Accept an agreement*'s body (sans the
wrapping `acceptance` key).

## Errors

| Status | code                | Meaning                                  |
|--------|---------------------|------------------------------------------|
| 404    | not_found           | Customer is not yours / relationship missing. |
