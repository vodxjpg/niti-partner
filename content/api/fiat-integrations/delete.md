---
title: Delete a fiat integration
section: API Reference / Fiat Integrations
---
# Delete a fiat integration

<span class="badge delete">DELETE</span> `/api/v1/partner/customers/{customerId}/fiat-integrations/{integrationId}`

> Required scope: `payments:create`. **No** `Idempotency-Key`.

Removes an integration from your customer.

## Read this before you call it

Deleting has two side effects that are **not** limited to the integration row:

| What                        | What happens                                                        |
|-----------------------------|---------------------------------------------------------------------|
| Existing fiat orders        | Survive, with their `integration_id` cleared. Payment history is not erased, and deleting is not a way to erase it. |
| The merchant's webhooks     | Any webhook the **merchant** registered against this integration is deleted with it. |

The second is the one worth pausing on: tidying up an integration you created
can take a merchant's notification wiring with it. There is no undo.

## Request

```bash
curl -X DELETE https://www.niftipay.com/api/v1/partner/customers/pc-1/fiat-integrations/95d92bb0-65a4-462f-ae14-90be85bea223 \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "deleted": true,
            "integration_id": "95d92bb0-65a4-462f-ae14-90be85bea223" } }
```

## Deleting something that is not there is `404`

Not a silent `200`. A delete that "succeeded" against a mistyped id would leave
you believing something was removed that is still live and still able to take
payments.

So a second `DELETE` on the same id answers `404`, and that is the correct
answer rather than a quirk: the integration is gone either way, and your next
read agrees.

## Errors

| Status | code                    | Meaning                                       |
|--------|-------------------------|-----------------------------------------------|
| 403    | insufficient_scope      | Token was not minted with `payments:create`.  |
| 404    | resource_not_found      | No such integration **on this customer**, or already deleted. |
| 503    | temporarily_unavailable | Transient database failure. Retry.            |
