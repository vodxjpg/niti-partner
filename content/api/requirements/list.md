---
title: Requirements
section: API Reference / Requirements
---
# Requirements

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/requirements`
<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/requirements`
<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/requirements/{requirementId}`
<span class="badge patch">PATCH</span> `/api/v1/partner/customers/{customerId}/requirements/{requirementId}`

> Scopes: `kyb:read` to read, `kyb:write` to raise or change. No
> `Idempotency-Key` — a duplicate requirement is visible, harmless and
> cancellable.

A requirement is one thing still outstanding on a KYB case, **after** it was
submitted.

Before this existed, the only way to ask for anything post-submission was to
reject the whole case: you received one coarse `rejection_reason`, so "an
identity document for the second UBO" arrived as `documents_missing` and you had
to guess. A requirement names its own target, carries its own status and
resolves on its own — so several can be open at once and each is a row in your
UI the merchant can act on.

## An open requirement reopens the case

This is the point. Asking for one more document must not mean rejecting an
entire application, and a merchant who cannot edit cannot supply what was asked
for.

While anything is `open` or `fulfilled`:

- `POST /verifications` accepts edits again
- `POST /documents` accepts evidence again

An **approved** case does not reopen. Documents on an approved merchant can
still be replaced through the normal upload path.

## The object

```json
{ "requirement_id": "102b4aa0-05f2-439a-88fd-aabb0adf6e7d",
  "kind": "document",
  "target": "ubo:1",
  "document_type": "director_id",
  "message": "Identity document for the second UBO",
  "status": "open",
  "raised_by": "you",
  "document_id": null,
  "due_at": null,
  "created_at": "2026-08-27T12:28:19.696Z",
  "updated_at": null,
  "resolved_at": null }
```

| Field | Notes |
|---|---|
| `kind` | `document` · `field` · `clarification` |
| `target` | **Your** vocabulary — `ubo:1`, `director:0`, `field:registration_number`. Opaque to us: the party that raised it is the party that knows what it points at. |
| `document_type` | Only when `kind` is `document`. One of the five upload types. |
| `message` | What the merchant is shown. Max 500 characters, rejected rather than truncated. |
| `raised_by` | `you` · `partner` · `niftipay`. Never another partner's client id — which competitor also serves this merchant is not your business. |
| `due_at` | Optional ISO-8601. Advisory; nothing enforces it. |

## Statuses, and who may set them

```
open ──▶ fulfilled ──▶ satisfied
  │                       
  └──────────────────▶ cancelled
```

| Status | Meaning |
|---|---|
| `open` | The merchant has to do something. |
| `fulfilled` | They did. The party that raised it has not accepted yet. |
| `satisfied` | Accepted. Closed. |
| `cancelled` | Withdrawn. Closed. |

**The asymmetry is deliberate.** The side *providing* evidence may set
`fulfilled` and may **not** set `satisfied`. Only the party that raised a
requirement accepts or cancels it — otherwise you could close your own
requirements and carry an unreviewed case to submission.

A closed requirement never reopens. Raise a new one.

Attempting a transition you are not entitled to is `409 invalid_state`, with
`details[0]` naming the `from` and `to`.

## Raising one

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/requirements \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Content-Type: application/json" \
  -d '{ "kind": "document",
        "target": "ubo:1",
        "document_type": "director_id",
        "message": "Identity document for the second UBO",
        "due_at": "2026-09-10T00:00:00.000Z" }'
```

`message` is required — it is what the merchant reads, and a requirement nobody
can read is not a requirement. Max **50** open requirements per customer.

## Listing

`?status=open` returns only what is outstanding (`open` and `fulfilled`).
Without it you get everything, oldest first — a merchant works down a list, and
what was asked for first is usually what blocks the rest.

## Webhooks

`requirement.created` and `requirement.resolved` carry the same fields as the
object, including `message`. They fan out to every partner covering the merchant,
**including the one that raised it** — a partner with more than one system
integrated should not have to special-case its own writes.

## Errors

| Status | code | Meaning |
|---|---|---|
| 400 | invalid_request | Bad `kind`, missing/over-long `message`, bad `document_type`, unparseable `due_at`. |
| 403 | insufficient_scope | Token lacks `kyb:read` / `kyb:write`. |
| 404 | resource_not_found | Not your customer, no verification started, or no such requirement. |
| 409 | invalid_state | Transition not allowed for this caller, or the requirement is closed. |
| 409 | limit_reached | 50 open requirements already. |
| 503 | temporarily_unavailable | Transient. Retry. |
