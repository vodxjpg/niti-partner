---
title: Authentication
section: Getting Started
---
# Authentication

Calls are authenticated with a Bearer token — a short-lived **JWT** — not a
static key.

```
Authorization: Bearer <jwt>
```

The JWT is scoped to your partner (`clientId`) and a set of capabilities (e.g.
`payments:create`, `payments.fiat_card`). Requests without a valid token are
refused with `401`.

## Partner client credentials

When your partner integration is provisioned you receive two values — an OAuth
**client id** and **client secret**. These are what you use to obtain (or
re-obtain) the JWT:

| Value | Description |
| --- | --- |
| `partner_client_id` | Your OAuth client identifier. It becomes the `sub` claim of the JWT (`partner:<clientId>`). |
| `partner_client_secret` | The client secret. It is exchanged for the JWT and is **never** sent on API calls — only to the token endpoint. |

> A partner customer (`partnerCustomerId`) is the link between a partner's
> external customer and the merchant's ledger. Every order, wallet and
> withdrawal is attributed to one.

## Obtaining the JWT (client_credentials)

Exchange your client credentials for a JWT using the OAuth `client_credentials`
grant:

```bash
curl -X POST https://www.niftipay.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "<partner_client_id>",
    "client_secret": "<partner_client_secret>",
    "scope": "customers:read customers:write payments:create ..."
  }'
```

The token response uses the same envelope as every other endpoint — the token
is at `data.access_token`, **not** at the top level:

```json
{ "data": { "access_token": "<jwt>", "expires_in": 300, "token_type": "bearer" },
  "request_id": "req-1",
  "api_version": "2026-08-01" }
```

Read it defensively. A client that reads `access_token` off the top level gets
`undefined`, sends `Authorization: Bearer undefined`, and the failure surfaces
one call later as `jwt malformed` — a long way from its cause.

Send the returned `access_token` as the `Authorization: Bearer <jwt>` header.
The token is short-lived (see `expires_in`); mint a fresh one before it
expires. If you were instead issued a ready-made API key (a JWT) directly, you
can use it as the Bearer token without this exchange.

## Handling your credentials

- **Keep the secret server-side.** `partner_client_secret` must live only in
  your backend (or your platform's secret store) and the environment of this
  console. Never ship it in client-side code, commit it, or expose it in a
  browser.
- **The JWT is not the secret.** The secret mints tokens; only the JWT is sent
  on each API request. Don't paste the secret where a token is expected, and
  don't paste a token into the secret field.
- **Rotate the secret, not the token flow.** If you rotate
  `partner_client_secret`, update it wherever it is configured; tokens already
  minted stay valid until they expire, then new ones use the rotated secret.
- **Mind scopes.** The JWT is minted with the scopes you request, limited to
  what your client is allowed. Requesting a scope your client lacks returns
  `invalid_scope`; calling an endpoint whose scope you didn't request returns
  `403 insufficient_scope`.
- **Scope requests are all-or-nothing.** If any one scope you ask for falls
  outside your client's grant, the token endpoint refuses the **whole** request
  rather than issuing a token with the subset it could honour. There is no
  introspection endpoint, so a client cannot discover its own scopes — ask for
  what you need, and if you get `invalid_scope`, retry with less.
- **Treat JWTs as secrets too.** Although short-lived, log them sparingly and
  don't embed them in URLs.
