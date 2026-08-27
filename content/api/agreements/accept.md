---
title: Accept an agreement
section: API Reference / Agreements
---
# Accept an agreement

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/agreements/{agreementId}/acceptances`

> Required scope: `agreements:accept`.

Records that the customer accepted this agreement. The partner rendered the
document in its own UI, so the record must carry the exact `agreement_version`,
a `content_hash` is captured server-side, and the `acceptance_channel` — these
are the only evidence that the act happened.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/agreements/tos/acceptances \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Content-Type: application/json" \
  -d '{ "agreement_version": "1.0", "acceptance_channel": "partner_web",
        "accepted_at": "2026-08-19T09:00:00.000Z",
        "evidence": { "external_session_id": "sess_88213" } }'
```

| Field                | Type   | Required | Notes                                                        |
|----------------------|--------|----------|--------------------------------------------------------------|
| `agreement_version`  | string | yes      | Must match the version presented to the customer.            |
| `acceptance_channel` | string | yes      | One of `partner_web` \| `partner_app` \| `partner_api`.       |
| `accepted_at`        | string | no       | ISO-8601; defaults to now. Must not be in the future (60s clock-skew tolerance). |
| `evidence`           | object | no       | Free-form object; non-object values are dropped, not stored. |

## Response `201` (new) / `200` (replay)

A genuine first acceptance returns `201`; an idempotent replay returns `200`
with the original acceptance so retries need no special handling.

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "acceptance": {
      "acceptance_id": "acc-1", "agreement_id": "tos", "agreement_version": "1.0",
      "content_hash": "a1b2c3…64hex", "acceptance_channel": "partner_web",
      "accepted_at": "2026-08-19T09:00:00.000Z", "recorded_at": "2026-08-19T09:00:01.000Z",
      "accepted_via_partner": true, "evidence": { "external_session_id": "sess_88213" } } } }
```

## Errors

| Status | code                          | Meaning                                                                       |
|--------|-------------------------------|-------------------------------------------------------------------------------|
| 400    | invalid_request               | Body missing or not a JSON object.                                            |
| 422    | invalid_request               | `agreement_version` missing, or `accepted_at` malformed / in the future.      |
| 422    | invalid_request               | `acceptance_channel` not one of the allowed values.                           |
| 404    | resource_not_found            | Agreement id is not in the catalogue.                                         |
| 404    | not_found                     | Customer is not yours / relationship missing.                                 |
| 409    | agreement_version_mismatch    | Submitted version is superseded (`details`: `[{ current_version, document_url }]`). |
