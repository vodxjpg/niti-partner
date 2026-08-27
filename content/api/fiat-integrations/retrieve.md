---
title: Retrieve a fiat integration
section: API Reference / Fiat Integrations
---
# Retrieve a fiat integration

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/fiat-integrations/{integrationId}`

> Required scope: `payments:read` (global tier).

Returns one integration. Same object as a
[list](/api/fiat-integrations/list.html) entry.

## Request

```bash
curl https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-integrations/95d92bb0-65a4-462f-ae14-90be85bea223 \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "integration": {
    "integration_id": "95d92bb0-65a4-462f-ae14-90be85bea223",
    "name": "storefront-eu",
    "psp": "niftipayp1",
    "return_url": "https://shop.test/done",
    "failure_url": "https://shop.test/oops",
    "contact_url": null,
    "created_at": "2026-08-27T08:53:29.538Z",
    "updated_at": "2026-08-27T08:53:40.151Z" } } }
```

## An id that is not yours is `404`, never `403`

An `integrationId` belonging to a different merchant answers exactly the same as
one that does not exist. A `403` would confirm the id is real, which is the
customer-discovery the relationship guard exists to prevent — the same rule
[Retrieve a customer](/api/customers/retrieve.html) follows.

Practically: if you get a `404` you cannot tell whether you mistyped the id or
aimed a valid id at the wrong customer. Check both.

## Errors

| Status | code                    | Meaning                                            |
|--------|-------------------------|----------------------------------------------------|
| 403    | insufficient_scope      | Token was not minted with `payments:read`.         |
| 404    | resource_not_found      | No such integration **on this customer**.          |
| 503    | temporarily_unavailable | Transient database failure. Retry.                 |
