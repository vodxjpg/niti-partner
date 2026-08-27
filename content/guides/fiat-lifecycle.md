---
title: Card payments, end to end
section: Guides
---
# Card payments, end to end

Every call from "we have a new merchant" to "the buyer paid", in order, with
what to expect back and what can go wrong at each step.

Read [Crypto payments, end to end](/guides/crypto-lifecycle.html) for the other
rail. The first four steps are shared; only the last two differ.

---

## The shape of it

```
1  create the customer                      ← once per merchant
2  accept the agreements                    ← once per merchant
3  run the KYB loop until approved          ← once per merchant
4  create a fiat integration                ← once per storefront
5  create an order                          ← per purchase
6  follow it to paid                        ← per purchase
```

Steps 1–4 you can do in one sitting. Step 3 is the one with a human in it.

**You can do step 4 before step 3 finishes.** Configuring a checkout is not
charging through one, so integrations are not gated on KYB — which means the
integration is ready the moment approval lands.

---

## 0. Get a token

```bash
curl -X POST https://www.niftipay.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{ "grant_type": "client_credentials",
        "client_id": "<partner_client_id>",
        "client_secret": "<partner_client_secret>",
        "scope": "customers:write kyb:write kyb:read documents:write agreements:accept payments:create payments:read" }'
```

The token is at **`data.access_token`**, not the top level, and lives about five
minutes. Scope requests are **all-or-nothing**: ask for one scope your client
does not hold and the whole request is refused. See
[Authentication](/getting-started/authentication.html).

---

## 1. Create the customer

```bash
curl -X POST $BASE/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{ "external_customer_id": "your-id-42", "email": "merchant@example.com", "name": "Example SL" }'
```

```json
{ "data": { "partner_customer_id": "pc_…", "customer_id": "usr_…",
            "relationship_status": "active" } }
```

**Keep `partner_customer_id`.** Every later call is scoped by it, and it is not
the same as `customer_id`.

This provisions a real merchant behind the scenes — wallets, keys, a default
integration. Nothing is charged and nothing is live yet.

> `external_customer_id` is yours and must be unique within your account. Reusing
> one returns the existing relationship rather than creating a second.

## 2. Accept the agreements

```bash
curl $BASE/customers/pc_…/agreements -H "Authorization: Bearer $TOKEN"
```

Two come back — terms and privacy — each with a `content_hash` and
`status: "required"`. For each:

```bash
curl -X POST $BASE/customers/pc_…/agreements/niftipay-tos/acceptances \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "agreement_version": "1.0", "acceptance_channel": "partner_api",
        "accepted_at": "2026-08-27T09:12:50.000Z",
        "evidence": { "external_session_id": "sess_88213" } }'
```

`accepted_at` must not be in the future. Acceptance is the mandatory consent
gate — marketing opt-in is **not**, and never gates onboarding.

## 3. The KYB loop

This is a loop, not a call. Send what you have; read what is missing; send more.

```bash
curl -X POST $BASE/customers/pc_…/verifications \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "business": { "legal_name": "Example SL", "registration_number": "B123",
                      "industry": "ecommerce_retail", "incorporation_country": "ES",
                      "incorporation_date": "2019-04-01",
                      "business_registration_country": "ES",
                      "registered_address": { "line1": "1 Calle", "city": "Madrid",
                                              "postal_code": "28001", "country": "ES" } } }'
```

Every response tells you exactly what is left:

```json
{ "data": { "submitted": false,
            "blocked_by": "missing_documents",
            "missing_documents": ["director_id", "bank_statement"],
            "incomplete_fields": [] } }
```

- `blocked_by: "validation_failed"` → read `incomplete_fields` (field paths and messages)
- `blocked_by: "missing_documents"` → upload what it names
- `submitted: true` → the case is in review

Field set and every enum: [KYB field reference](/api/verifications/fields.html),
or [`GET /onboarding/schema`](/api/onboarding-schema.html) to build your form
from data rather than from a page.

### Upload the five documents

`multipart/form-data`, not base64:

```bash
curl -X POST $BASE/customers/pc_…/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=certificate_of_incorporation" \
  -F "file=@incorporation.pdf;type=application/pdf"
```

All five are required. Uploads **append** — a second upload of the same type is
how you correct one; there is no delete.

### Then re-POST to submit

An **empty** `POST /verifications` is a valid way to re-attempt submission once
the documents exist.

### Wait for approval

Listen for `verification.approved`, or poll `GET /verifications`.

If it comes back rejected, `rejection_reason` says why —
`industry_not_accepted` and `sanctions_or_pep` are **not** fixable by
resubmitting, so do not offer a retry on those.

If the underwriter needs one more thing, you get a
[requirement](/api/requirements/list.html) rather than a rejection: the case
reopens, the merchant supplies it, and you carry on.

### What approval turns on

```json
{ "capability": "payments.fiat_card", "enabled": true, "available": true }
```

`payments.fiat_card` and `withdrawals` are KYB-gated; the other four are granted
at creation. Check with
[capabilities](/api/capabilities.html) if you want to render a state.

## 4. Create a fiat integration

One per storefront. **This works before KYB completes** — the resource is not
capability-gated, so the integration is ready the moment approval lands.

```bash
curl -X POST $BASE/customers/pc_…/fiat-integrations \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{ "name": "storefront-eu",
        "return_url": "https://shop.example.com/thanks",
        "failure_url": "https://shop.example.com/oops" }'
```

```json
{ "data": { "integration": { "integration_id": "95d92bb0-…", "psp": "niftipayp1" } } }
```

**Keep `integration_id`** — step 5 needs it.

Every URL must be **https**. Only `name`, `return_url`, `failure_url` and
`contact_url` are settable; sending `psp` or `merchant_webhook_url` is a `400`
naming the field, not a silent drop.

> Each customer already has one seeded integration called `trapyfy`. You can use
> it, but a storefront with its own return URL wants its own.

## 5. Create the order

```bash
curl -X POST $BASE/customers/pc_…/fiat-orders \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{ "integration_id": "95d92bb0-…", "amount_cents": 1250, "currency": "EUR",
        "reference": "INV-1042",
        "return_url": "https://shop.example.com/thanks",
        "failure_url": "https://shop.example.com/oops",
        "email": "buyer@example.com" }'
```

```json
{ "data": { "fiat_order": { "order_key": "36824", "status": "new",
                            "amount_cents": 1250, "service_fee_cents": 56,
                            "total_cents": 1306 },
            "pay_url": "https://www.niftipay.com/paylink/e9cc4022-…" } }
```

**Send the buyer to `pay_url`.** Keep `order_key` — it is how you read the order
back, and it is a short integer, not a uuid.

`amount_cents` is what you charge; `total_cents` is what the buyer pays once the
service fee is applied. Do not compute the fee yourself.

`Idempotency-Key` is required. On a retry, **reuse the same key** — this call
mints a real payment link, and a fresh key would mint a second one.

## 6. Follow it

**Listen** for `payment.confirmed` and `payment.expired`, or **poll**:

```bash
curl $BASE/fiat-orders/36824 -H "Authorization: Bearer $TOKEN"
```

Statuses you will see: `new` → `processing` → `completed`, or `expired`,
`cancelled`, `error`, `refunded`.

---

## What goes wrong, and what it means

| Response | Cause | Do |
|---|---|---|
| `403 capability_not_enabled` | KYB not approved yet | Wait for `verification.approved`. Not retryable. |
| `409 capability_unavailable` | Granted, but the merchant is not currently eligible | Read `details[0].reason`. |
| `409 integration_missing` | `integration_id` is not this customer's | Re-read the list. |
| `409 reference_conflict` | That `reference` already exists for this merchant | Pick another, or read the order you already have. |
| `409 below_minimum` | Under the merchant's EUR minimum | `details[0].minimum_eur` has the threshold. |
| `429 limit_reached` | Daily cap | `details[0].reset_at` when known. |
| `502 provider_error` | The processor refused or failed | Retry once, then quote the `request_id`. |
| `503 temporarily_unavailable` | Transient | **The only code that means retry.** |

A plain `500` deliberately does **not** invite a retry — retrying a
deterministic failure buys a machine caller an endless loop.

---

## Two things worth getting right early

**Reuse the idempotency key on retries.** The check runs before anything else, so
a replayed key returns the recorded response — same order, same `pay_url`, same
`request_id`. A fresh key on a timeout creates a second payment link.

**Dedupe webhooks on `event_id`.** It identifies the event, not the delivery
attempt, so every retry carries the same value. Register two destinations and
both receive the same id.
