---
title: Authentication
section: Getting Started
---
# Authentication

Calls are authenticated with a partner API key sent as a Bearer token.

```
Authorization: Bearer <partner_api_key>
```

Keys are scoped to a partner (`clientId`) and a set of capabilities (e.g.
`payments:create`, `payments.fiat_card`). Requests without a valid key are
refused with `401`. Treat keys as secrets — they are shown once at creation
and never again.

> A partner customer (`partnerCustomerId`) is the link between a partner's
> external customer and the merchant's ledger. Every order, wallet and
> withdrawal is attributed to one.
