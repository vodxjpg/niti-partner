---
title: Errors
section: Getting Started
---
# Errors

Every error uses the same envelope:

```json
{ "error": { "code": "invalid_request", "message": "…", "request_id": "req-1",
             "details": [ { "field": "return_url", "reason": "invalid" } ] } }
```

`details` is optional and machine-readable. When an endpoint can say *which*
field it refused and *why*, it puts that here rather than expecting you to parse
`message` — `message` is prose and may be reworded.

Quote `request_id` to support. It is also returned as the `x-request-id`
response header, so you can log it without parsing a body — which matters most
on the responses you failed to parse.

## Codes

| Status | code                      | Meaning                                                     |
|--------|---------------------------|-------------------------------------------------------------|
| 400    | invalid_request           | Unknown field, non-https URL, wrong-typed field, bad body    |
| 400    | idempotency_key_required  | A write that requires `Idempotency-Key` did not get one      |
| 400    | idempotency_key_invalid   | The key is longer than the cap                               |
| 401    | unauthorized              | Missing, malformed or expired token                          |
| 403    | insufficient_scope        | Valid token, but minted without the scope this endpoint needs |
| 403    | capability_not_enabled    | The capability is not granted on this customer               |
| 404    | resource_not_found        | Resource does not exist **or is not yours** — the two are deliberately indistinguishable |
| 409    | capability_unavailable    | Granted, but the merchant cannot currently use it (see `details[].reason`) |
| 409    | reference_conflict        | The `reference` is already used (generic, ownerless)         |
| 409    | name_conflict             | A named resource with that name already exists on the customer |
| 409    | limit_reached             | A per-customer ceiling was hit                               |
| 409    | idempotency_key_reuse     | Same key, different body or different path                   |
| 409    | idempotency_key_in_progress | The first attempt with this key is still running           |
| 422    | validation_error          | Service-level validation failed                              |
| 429    | limit_reached             | A rate or daily cap was hit; `details[].reset_at` when known  |
| 500    | internal_error            | Unexpected server error                                      |
| 502    | provider_error            | The payment provider refused or failed                       |
| 503    | temporarily_unavailable   | Transient failure. **Retry** — this is the only code that means that |

## Two rules worth building against

**`404` never confirms existence.** A resource belonging to another partner or
another merchant answers exactly like one that was never created. A `403` there
would confirm the id is real and turn a retrieve endpoint into a discovery
endpoint. So a `404` means *"not yours, or not there"* — check both.

**Only `503 temporarily_unavailable` means retry.** Errors are classified before
they are returned: a dropped connection earns that code, a deterministic failure
does not. A client that retries on every `5xx` will loop forever against a bug,
which is why a plain `500` deliberately does not invite one.

> `reference_conflict` is deliberately generic — it does **not** reveal whose
> order holds the conflicting reference.

> Unmatched paths under `/api/v1/partner/*` return this JSON envelope too, not
> an HTML error page, so a client can parse a typo'd URL the same way it parses
> everything else.
