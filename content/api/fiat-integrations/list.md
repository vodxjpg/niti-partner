---
title: List fiat integrations
section: API Reference / Fiat Integrations
---
# List fiat integrations

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/fiat-integrations`

> Required scope: `payments:read` (global tier).

An **integration** is one checkout configuration belonging to your customer: a
name, and the URLs a buyer is sent to after paying or failing. Its
`integration_id` is the value [Create a fiat card
order](/api/fiat-orders/create.html) requires.

Every customer starts with one integration seeded at signup, so this list is
never empty for a live customer.

## Not gated on `payments.fiat_card`

All five integration endpoints need the scope and the relationship — and
deliberately **not** the `payments.fiat_card` capability that gates the order
rail. That capability only turns on once KYB completes, and gating configuration
on it would lock you out of preparing an integration for exactly as long as you
are waiting for KYB.

So you can create and configure integrations while verification is still
pending. Charging through one is a separate question, and
`POST /fiat-orders` answers it on its own.

## Request

```bash
curl https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-integrations \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "integrations": [
    { "integration_id": "03c9bad0-3174-4def-8d88-651693617c39",
      "name": "trapyfy",
      "psp": "niftipayp1",
      "return_url": "https://shop.test/done",
      "failure_url": "https://shop.test/oops",
      "contact_url": null,
      "created_at": "2026-08-26T15:10:19.465Z",
      "updated_at": null } ] } }
```

Ordered oldest first, so the seeded integration is the first entry.

| Field            | Notes                                                              |
|------------------|--------------------------------------------------------------------|
| `integration_id` | Pass this to `POST /fiat-orders` as `integration_id`.               |
| `name`           | Your label. Unique per customer.                                    |
| `psp`            | The processor, always reported as `niftipayp1`. Read-only.          |
| `return_url`     | Where the buyer goes after a successful payment.                    |
| `failure_url`    | Where the buyer goes after a decline. May be `null`.                |
| `contact_url`    | Support page shown to the buyer. May be `null`.                     |
| `updated_at`     | `null` until the integration is changed.                            |

## What is never returned

An integration row also carries the **merchant's** own webhook URL and its PSP
project credentials. Neither is readable through this API, and neither is
settable — see [Create](/api/fiat-integrations/create.html).

## Errors

| Status | code                    | Meaning                                       |
|--------|-------------------------|-----------------------------------------------|
| 403    | insufficient_scope      | Token was not minted with `payments:read`.    |
| 404    | resource_not_found      | Customer is not yours / relationship missing. |
| 503    | temporarily_unavailable | Transient database failure. Retry.            |
