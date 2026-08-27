---
title: Update a fiat integration
section: API Reference / Fiat Integrations
---
# Update a fiat integration

<span class="badge patch">PATCH</span> `/api/v1/partner/customers/{customerId}/fiat-integrations/{integrationId}`

> Required scope: `payments:create`. **No** `Idempotency-Key`.

Changes named fields on an existing integration. Fields you omit are left alone.

## Request

```bash
curl -X PATCH https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-integrations/95d92bb0-65a4-462f-ae14-90be85bea223 \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "storefront-eu-v2", "contact_url": "https://shop.test/support" }'
```

| Field         | Type          | Notes                                                   |
|---------------|---------------|---------------------------------------------------------|
| `name`        | string        | Max 100 chars. Must stay unique on this customer.        |
| `return_url`  | string        | https only. **Cannot** be set to `null`.                 |
| `failure_url` | string \| null | https only. `null` clears it.                           |
| `contact_url` | string \| null | https only. `null` clears it.                           |

Same closed field set as [Create](/api/fiat-integrations/create.html): anything
else is `400 invalid_request` with `reason: "unknown_field"`.

An **empty body** is `400` with `{ "field": "body", "reason": "empty" }` rather
than a no-op success — a `200` for a request that changed nothing would be
indistinguishable from one that worked.

`null` clears the two optional URLs; that is the only way to unset one. It is
refused on `return_url`, which every order needs.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "integration": {
    "integration_id": "95d92bb0-65a4-462f-ae14-90be85bea223",
    "name": "storefront-eu-v2",
    "psp": "niftipayp1",
    "return_url": "https://shop.test/done",
    "failure_url": "https://shop.test/oops",
    "contact_url": "https://shop.test/support",
    "created_at": "2026-08-27T08:53:29.538Z",
    "updated_at": "2026-08-27T08:53:40.151Z" } } }
```

`updated_at` is stamped on every successful `PATCH`.

## Why no idempotency key

A `PATCH` here sets named columns to supplied values, so replaying it lands on
the same row in the same state. Requiring a key on a naturally idempotent verb
would only hand you a `409` to work around. The creating `POST` is the one that
produces something new per attempt, and that is the one that requires a key.

## Errors

| Status | code                    | Meaning                                                       |
|--------|-------------------------|---------------------------------------------------------------|
| 400    | invalid_request         | Unknown field, non-https URL, empty body, `return_url: null`, name over 100 chars. |
| 403    | insufficient_scope      | Token was not minted with `payments:create`.                  |
| 404    | resource_not_found      | No such integration **on this customer**.                     |
| 409    | name_conflict           | Another integration on this customer already uses that name.  |
| 503    | temporarily_unavailable | Transient database failure. Retry.                            |

> Renaming an integration to the name it already has is fine — the conflict
> check ignores the row being changed.
