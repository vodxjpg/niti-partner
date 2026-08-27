---
title: Webhooks
section: API Reference
---
# Webhooks

Niftipay pushes partner-relevant events to the webhook URL configured on the
integration. Each delivery is a signed `POST`.

## Verifying a webhook

Every delivery carries two headers you must check before trusting the body:

| Header | Meaning |
| --- | --- |
| `x-signature` | `v1=<hex hmac-sha256(secret, "${x-timestamp}.${raw body}")>` |
| `x-timestamp` | Unix seconds at send time |
| `x-webhook-id` | The id of the destination webhook |

Recompute `hmac-sha256(secret, "<x-timestamp>.<raw request body>")` and compare
it to the `v1=` value in `x-signature`. Reject mismatches, and reject timestamps
that fall outside a small clock-skew window. Always return `2xx` quickly and
process asynchronously — a slow handler is retried as if it failed.

## Event shape

```json
{
  "event_id": "evt_3f9a...",
  "event_type": "payment.confirmed",
  "created_at": "2024-01-01T00:00:00.000Z",
  "partner_id": "client_abc123",
  "data": { "partner_customer_id": "pc_1", "order_id": "1001", "status": "paid" }
}
```

`event_id` identifies the EVENT, not the attempt — see *Dedupe* below. The `data` field carries
only identifiers and status — never raw documents or PII. Re-read detail through
the API where scopes still apply.

The events Niftipay can emit today:

- `customer.updated`
- `verification.pending`
- `verification.approved`
- `verification.rejected`
- `agreement.accepted`
- `document.reviewed`
- `capability.updated`
- `payment.confirmed`
- `payment.expired`

## Retries

Failed deliveries are retried up to six times with exponential backoff:
1m, 5m, 25m, 2h, 10h, 24h. A `2xx` response ends delivery; a non-retryable
`4xx` is dead-lettered; a `5xx` or network timeout is retried on the schedule
above. Use `event_id` to dedupe across retries.

## `verification.rejected` carries a reason

Its `data` includes `rejection_reason` — one of the closed list documented in
[Retrieve a verification](/api/verifications/retrieve.html), or `null` when we
were not given one. It is the only thing that lets you tell a merchant what to
fix without a support ticket.

## Dedupe

`event_id` is generated **once per event** and stored with the delivery, so
every retry of that delivery carries the same value and the same body. Treating
it as an idempotency key is correct.

Earlier revisions of this page called it "unique per delivery", which
contradicted the sentence above it. It is unique per event; the delivery attempt
is not separately identified on the wire.

One consequence worth designing for: if you register **more than one**
destination, an event fans out to all of them carrying the **same** `event_id`.
Dedupe per destination, or accept that two endpoints will see the same id.

## Clock skew

`x-timestamp` is regenerated on **every attempt**, not once per event, so your
tolerance only has to cover network transit and clock drift — never the retry
backoff, which reaches 24 hours.

We do not mandate a window; you are the verifier and it is your call. **±300
seconds is a sensible default** and is what we would pick. Anything under ±60s
starts rejecting deliveries over ordinary NTP drift.

> Webhooks are delivered only for the customers this partner onboarded, and only
> to destinations it supplied. A partner never receives another partner's events.
