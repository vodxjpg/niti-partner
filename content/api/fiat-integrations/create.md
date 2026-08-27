---
title: Create a fiat integration
section: API Reference / Fiat Integrations
---
# Create a fiat integration

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/fiat-integrations`

> Required scope: `payments:create`. `Idempotency-Key` is **required**.

Creates a new checkout configuration for your customer. Use one per storefront
that needs its own return destination.

Like the rest of this resource, it is **not** gated on `payments.fiat_card`, so
you can set an integration up while the customer's KYB is still pending.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-integrations \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "storefront-eu",
        "return_url": "https://shop.test/done",
        "failure_url": "https://shop.test/oops",
        "contact_url": "https://shop.test/support" }'
```

| Field         | Type   | Required | Notes                                                     |
|---------------|--------|----------|-----------------------------------------------------------|
| `name`        | string | yes      | Your label. Max 100 chars. Unique per customer.            |
| `return_url`  | string | yes      | **https only.** Where the buyer goes after paying.         |
| `failure_url` | string | no       | **https only.** Where the buyer goes after a decline.      |
| `contact_url` | string | no       | **https only.** Support page shown to the buyer.           |

## Those four fields are the whole surface

`psp`, `psp_project_id` and `merchant_webhook_url` are **not settable**, and
sending one is a `400` naming the field — not a silent drop:

```json
{ "error": { "code": "invalid_request",
             "message": "`psp` is not a settable field on a fiat integration. Settable fields are: name, return_url, failure_url, contact_url.",
             "request_id": "req-1",
             "details": [ { "field": "psp", "reason": "unknown_field" } ] } }
```

Two reasons the refusal is loud rather than tolerant:

- **Every settable field is a URL a buyer is sent to.** A misspelled
  `returnURL` that was quietly ignored would leave the integration pointing
  wherever it pointed before, and you would find out from a buyer landing on the
  wrong page.
- `merchant_webhook_url` is where the **merchant's** payment notifications go.
  A partner able to write a field it cannot read could silently redirect them.
  Your own events arrive on the [partner webhook](/api/webhooks.html) channel
  instead.

`name` over 100 characters is refused, never truncated — a shortened name is a
row you cannot find again by the name you think you wrote.

## Response `201`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "integration": {
    "integration_id": "95d92bb0-65a4-462f-ae14-90be85bea223",
    "name": "storefront-eu",
    "psp": "niftipayp1",
    "return_url": "https://shop.test/done",
    "failure_url": "https://shop.test/oops",
    "contact_url": "https://shop.test/support",
    "created_at": "2026-08-27T08:53:29.538Z",
    "updated_at": null } } }
```

## Idempotency

Required here, and only here on this resource. A retry after a socket timeout
cannot know whether the first attempt landed, and without the key that retry
silently doubles the customer's integration list — the list a later
`POST /fiat-orders` then has to pick from by id.

Replaying the same key with the same body replays the original response,
including its `request_id`. The same key with a **different** body is
`409 idempotency_key_reuse`. See [Idempotency](/getting-started/idempotency.html).

A `400` decided from the request alone (bad JSON, or a field that failed
validation) **releases** the key, so you can fix the payload and retry with the
same one.

## Limits

A customer may hold at most **25** integrations. The 26th is
`409 limit_reached`. This is a ceiling against a runaway retry loop, not a
product limit — a customer needs one integration per storefront.

## Errors

| Status | code                     | Meaning                                                   |
|--------|--------------------------|-----------------------------------------------------------|
| 400    | invalid_request          | Unknown field, non-https URL, missing `name`/`return_url`, name over 100 chars. |
| 400    | idempotency_key_required | No `Idempotency-Key` header.                              |
| 403    | insufficient_scope       | Token was not minted with `payments:create`.              |
| 404    | resource_not_found       | Customer is not yours / relationship missing.             |
| 409    | name_conflict            | The customer already has an integration with that name.   |
| 409    | limit_reached            | The customer already holds 25 integrations.               |
| 409    | idempotency_key_reuse    | Same key, different body.                                 |
| 503    | temporarily_unavailable  | Transient database failure. Retry.                        |
