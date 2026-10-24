---
title: List candidates
section: API Reference / Candidates
---
# List candidates

<span class="badge get">GET</span> `/api/v1/partner/candidates`

> Required scope: `candidates:read`.

Merchants that Niftipay has recorded as originating from **you** and that you
have **not linked yet**. It is the backlog for
[create a customer](/api/customers/create.html): everything in this list is an
account you can claim with a `POST /customers` call, and once you do it leaves
the list.

`candidates:read` is not part of a default token. Ask Niftipay to add it to
your client if you need this rail.

```bash
curl "https://www.niftipay.com/api/v1/partner/candidates?limit=100" \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "candidates": [
      { "user_id": "user_abc", "email": "merchant@example.com" },
      { "user_id": "user_def", "email": "second@example.com" }
    ],
    "next_cursor": null
  } }
```

**Two fields, and nothing else.** No name, no country, no verification state, no
order or volume data. A candidate is not yet your customer, so this endpoint
tells you only what you need to claim it — everything else arrives through
[retrieve a customer](/api/customers/retrieve.html) after the link exists.

| Field | Notes |
|---|---|
| `user_id` | The Niftipay user id. It is the same value `customers.customer_id` carries once the account is linked. |
| `email` | The account's email. Send it as `email` on `POST /customers` to claim the account. |

## Query parameters

| Parameter | Notes |
|---|---|
| `?limit=` | Defaults to **100**, caps at **500**. Out-of-range is clamped, not rejected. |
| `?before=` | The `next_cursor` from a previous response. Opaque — a cursor this API did not issue is `400 invalid_cursor`. |

`next_cursor` is issued only on a full page; a short page is the end of the
list and comes back `null`.

## An empty list is the normal answer

Two different situations both return `200` with `[]`:

- you have linked every account attributed to you — the backlog is simply
  empty; or
- no accounts are attributed to you at all, because the origin attribution has
  not been set up for your client.

Neither is an error, and the response does not distinguish them. If the list is
permanently empty and you expect it not to be, that is a conversation with
Niftipay rather than something to retry against.

## Errors

| Status | code | When |
|---|---|---|
| 400 | invalid_cursor | `before` is not a cursor this API issued. |
| 401 | unauthorized | Missing, malformed or expired token. |
| 403 | insufficient_scope | The token was minted without `candidates:read`. |
| 500 | internal_error | Unexpected server error. Do not retry. |
| 503 | temporarily_unavailable | Transient failure. Retry. |
