---
title: Register size
section: API Reference / Register
---
# Register size

<span class="badge get">GET</span> `/api/v1/partner/register`

> Required scope: `register:read`.

The size of the Niftipay user register: one number, and the moment it was
counted.

`register:read` is not part of a default token. Ask Niftipay to add it to your
client if you need it.

```bash
curl https://www.niftipay.com/api/v1/partner/register \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "users_total": 48213, "as_of": "2026-10-24T11:04:18.221Z" } }
```

| Field | Notes |
|---|---|
| `users_total` | Count of all accounts on the register, not only yours and not only merchants. |
| `as_of` | ISO 8601, server time at which the count was taken. The count is live, not cached, so two calls a second apart can legitimately differ. |

No identities are exposed here — the endpoint returns an aggregate and takes no
filters. To enumerate the accounts attributed to you, use
[candidates](/api/candidates.html); to enumerate the ones you have linked, use
[list customers](/api/customers/list.html).

## Errors

| Status | code | When |
|---|---|---|
| 401 | unauthorized | Missing, malformed or expired token. |
| 403 | insufficient_scope | The token was minted without `register:read`. |
| 500 | internal_error | Unexpected server error. Do not retry. |
| 503 | temporarily_unavailable | Transient failure. Retry. |
