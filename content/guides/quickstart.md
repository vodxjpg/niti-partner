---
title: Quickstart
section: Guides
---
# Quickstart

A full payment in five calls.

1. **Authenticate** — send your partner API key as a Bearer token
   ([Authentication](/getting-started/authentication.html)).
2. **Create a customer** — `POST /api/v1/partner/customers`
   ([Customers](/api/customers/create.html)).
3. **Create a fiat order** — `POST /api/v1/partner/customers/{id}/fiat-orders`
   with `return_url` **and** `failure_url` both required and https
   ([Fiat Orders](/api/fiat-orders/create.html)).
4. **Redirect** the buyer to `pay_url`; they return to your `return_url`
   (or `failure_url` on decline).
5. **Receive** the outcome via [webhook](/api/webhooks.html).

## Going live

`payments:create` is granted only after the partner migration
(`2026-08-25T00-00-00_fiat_order_partner_customer.sql`) is applied to the
database — the column must exist and be written before the first grant.
Partners that previously omitted `failure_url` must now send it or calls will
be refused with `400 invalid_request`.
