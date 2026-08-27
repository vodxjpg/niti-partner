---
title: Integration models
section: Guides
---
# Integration models

What this API can do, what it cannot, and how the pieces fit — for a partner
deciding how to build against it.

Written for the questions partners actually arrive with, in the order they
usually arrive.

---

## The short version

| Question | Answer |
|---|---|
| Server-to-server, both directions? | **Yes** — you call us, we webhook you. |
| Can we render the onboarding ourselves? | **Yes.** The API is headless by design. |
| Do you host a merchant-facing onboarding UI we can hand off to? | **No.** |
| Can you reopen onboarding after submission? | **Yes** — built for it. |
| Can you ask for something specific post-submission? | **Yes** — [requirements](/api/requirements/list.html). |
| Can you render fields from *our* schema? | **No.** Ours is fixed. We publish it instead. |
| Dynamic fields? | **We carry yours, we do not render them.** |
| Repeating groups? | **Yes**, fixed shape — `directors[]`, `ubos[]`. |
| Partner-defined document types? | **Unnamed ones, yes** — upload as `other`. |

The rest of this page is why, and what to do about each.

---

## 1. Which direction are you building?

Two integrations are possible, and they are not the same product. Decide which
one you mean before writing a contract — the question has caused more confusion
than any technical detail on this page.

### A. You consume our API — the default

You hold the merchant relationship, you render onboarding in your own product,
and you call us. This is what the API is designed for, what every endpoint in
the reference assumes, and what needs no new work on our side.

```
your product  ──▶  Niftipay Partner API   (you call us)
your product  ◀──  webhooks               (we call you)
```

### B. We consume your API — underwriting, or similar

You underwrite, price, or decide something we need. We hand you a case and act
on your answer.

This direction is **partial** today. See §2.

### Both at once

Also fine, and increasingly common: you consume our API for the merchant
lifecycle, and we consume yours for a decision. Nothing in the design prevents
it; just be explicit about which half you mean in any given sentence.

---

## 2. Server-to-server

**Us → you** works today through **partner webhooks**. You register one or more
HTTPS endpoints; we sign each delivery with HMAC-SHA256 over
`<x-timestamp>.<raw body>`, retry six times over roughly two days
(1m · 5m · 25m · 2h · 10h · 24h), and keep a delivery log with replay.

```
customer.updated            verification.pending
requirement.created         verification.approved
requirement.resolved        verification.rejected
document.reviewed           capability.updated
agreement.accepted          payment.confirmed / payment.expired
```

See [Webhooks](/api/webhooks.html), and two details partners consistently ask
about:

- **`event_id` is stable across retries.** It identifies the event, not the
  attempt — use it as an idempotency key. Register two destinations and both
  receive the **same** `event_id`.
- **`x-timestamp` is regenerated per attempt**, so your clock-skew window only
  has to cover transit and drift — never the 24-hour backoff. We do not mandate
  a value; ±300s is what we would pick.

**You → us** is the ordinary Partner API: OAuth client credentials, a
short-lived JWT, scoped per endpoint. See
[Authentication](/getting-started/authentication.html).

### What does not exist yet

A **per-partner outbound API client** — Niftipay calling arbitrary endpoints on
your side, in-line with a decision. Our one precedent posts to a single
globally-configured underwriting endpoint and receives status callbacks.
Generalising that per-partner is contained work, but it is work.

If your side can consume webhooks and expose the two callbacks in §6, nothing
new is needed.

---

## 3. Headless: you render the onboarding

There is **no merchant-facing Niftipay onboarding UI to hand off to**. If you
onboard merchants, you render the form.

That is deliberate rather than a gap, and the API is shaped for it:

- **`POST /verifications` accepts any subset.** Save per step, per field, per
  keystroke. Nothing has to be buffered client-side and lost on a failure.
- **Every response says what is outstanding.** `incomplete_fields` carries field
  paths and messages; `missing_documents` names the exact types. You never guess.
- **`blocked_by` separates "not finished" from "failed."** The middle of the
  flow is not an error.
- **Capabilities self-gate.** Card payments and withdrawals turn on when KYB is
  approved, so there is no go-live to coordinate.

The integration loop is: send what you have, read what is missing, send more.

```json
{ "data": { "submitted": false,
            "blocked_by": "missing_documents",
            "missing_documents": ["director_id", "bank_statement"],
            "incomplete_fields": [] } }
```

To build the form itself, read the field set from the API rather than from a
page — see §5.

---

## 4. Asking for something after submission

Underwriting rarely finishes in one pass. A requirement is one outstanding item
on a submitted case, tracked and resolved on its own.

```
merchant completes onboarding
POST /verifications                    →  submitted
webhook: verification.pending

underwriting needs an ID for the second UBO
POST /customers/{id}/requirements
  { "kind": "document", "target": "ubo:1",
    "document_type": "director_id",
    "message": "Identity document for the second UBO" }
→ the case REOPENS automatically
→ webhook: requirement.created

merchant uploads
POST  /customers/{id}/documents                       (multipart)
PATCH /customers/{id}/requirements/{requirementId}    { "status": "fulfilled" }

the raiser accepts
PATCH …                                               { "status": "satisfied" }
```

Full reference: [Requirements](/api/requirements/list.html). Three properties
worth designing against:

**An open requirement reopens a submitted case.** Asking for one more document
must not mean rejecting an entire application, and a merchant who cannot edit
cannot supply what was asked for. While anything is `open` or `fulfilled`, both
`POST /verifications` and `POST /documents` accept writes again. An *approved*
case does not reopen.

**Only the raiser closes one.** The side providing evidence may set `fulfilled`
and may not set `satisfied`. Enforced, not a convention — otherwise either side
could close its own requirements and carry an unreviewed case forward.

**`target` is yours.** `ubo:1`, `director:0`, `field:registration_number` — we
store it and hand it back untouched. Whoever raised a requirement is who knows
what it points at, so we do not interpret it.

### Whole-case rejection carries a reason

`verification.rejected` includes `rejection_reason` from a closed list:
`documents_illegible`, `documents_missing`, `documents_expired`,
`industry_not_accepted`, `entity_unverifiable`, `ownership_unclear`,
`sanctions_or_pep`, `duplicate_application`, `other`.

Two are **not** fixable by resubmitting — `industry_not_accepted` and
`sanctions_or_pep` — so do not offer a retry on them.

---

## 5. Dynamic fields: what we have, and what we do not

Partners often propose that Niftipay render *their* onboarding schema: they
publish a field contract, we build the form from it.

**We cannot do that.** Niftipay's onboarding is a fixed schema with fixed enums
and fixed steps. There is no field engine, nowhere to store answers to fields we
have no columns for, and no conditional-display system. Building one is a
project, not a change.

What exists is the **inverse**, which often serves the same purpose:

<span class="badge get">GET</span> `/api/v1/partner/onboarding/schema`

> Required scope: `partner:read`.

returns *our* field set as data — every enum inline, `required_at_submit` per
field, repeating groups with their shapes, the document rules. If you render
Niftipay onboarding inside your product, build the form from that response and
you will not drift the day we add an industry.

See [Onboarding schema](/api/onboarding-schema.html).

### Point by point

| Concept | Niftipay | Detail |
|---|---|---|
| Fields we render for you | ✗ | No form engine. This is the part that stays no. |
| **Fields you carry** | **✓** | [`additional_data`](/api/verifications/fields.html) — your own keys on the case. We store, return and relay them; we never render or interpret them. |
| Conditional fields | ✗ | No "show B if A" rules exist to express. |
| **Repeating groups** | **✓** | `directors[]`, `ubos[]`, max 20 each. Fixed element shape — more people, never more fields. |
| **Unnamed documents** | **✓** | A [requirement](/api/requirements/list.html) can ask for a document with no `document_type`; the merchant uploads it as `other`. |

So the honest line is not "no dynamic fields" — it is **we will carry your
fields, we will not render them**. That distinction is the whole of it: you
collected the values in your own UI, from your own user, under your own privacy
notice. Rendering partner-authored fields to our merchants under our logo is a
GDPR and phishing question before it is an engineering one, and it is why that
row stays ✗.

Need a field in the *core* schema rather than your own bag? Ask — a schema
change with a `schema_version` bump, not a runtime one.

### Our field set, in brief

Machine-readable: [`GET /onboarding/schema`](/api/onboarding-schema.html).
Prose with reasoning: [KYB field reference](/api/verifications/fields.html).

**Industry** — 17 values, and the selection *is* the risk classification:
`ecommerce_retail` · `cannabis` · `cbd` · `hemp` · `seeds` · `growshops` ·
`cannabis_clubs` · `standard_wellness_products` · `peptides` · `kratom` ·
`higher_risk_supplements` · `difficult_to_place_ecommerce` ·
`merchants_requiring_expensive_payment_routes` ·
`merchants_with_elevated_refund_or_chargeback_exposure` · `functional_mushrooms` ·
`adult` · `other`

**Expected monthly volume** — a **band, not a number**. Sending `50000` is a
`422`: `range_0_1k` · `range_1k_10k` · `range_10k_50k` · `range_50k_250k` ·
`range_250k_plus`

**Other enums** — `card_type` (`eea` · `non_eea` · `mixed`) ·
`settlement_option` (`fiat_eur_iban` · `crypto_usdt`) · `fee_handling`
(`customer_pays` · `niftipay_absorbs`) · `requested_payment_methods` (`card` ·
`bank_transfer` · `crypto` · `other`)

**Documents** — all five required. PDF, JPEG or PNG, 15 MB max:
`certificate_of_incorporation` · `proof_of_address` · `director_id` ·
`bank_statement` · `processing_statement`. **There is no delete** — uploads
append and submission takes the latest of each type, so a second upload of the
same type is the supported correction.

**People** — `directors[]` and `ubos[]`, max 20 each. `full_name` +
`date_of_birth` + `nationality` per person; a UBO adds `ownership_percent`,
**25–100**, decimals fine.

Three UBO rules that are easy to guess wrong:

- Percentages **do not have to total 100**. The 25% floor is the whole rule.
- `directors` and `ubos` are independent — **no cross-check, no dedup**. A
  founder who is both belongs in both.
- A company with nobody at 25% sends `"ubos": []` with
  `"ubo_declaration": "no_qualifying_ubo"`. A declaration, not an inference from
  an empty array: "not filled in yet" and "genuinely nobody" are different facts.

---

## 6. If we need to consume your API

For the underwriting direction, the smallest contract that works is the mirror
of what we already do. Expose:

```
POST  {you}/partner/v1/cases                 a submitted case
POST  {you}/partner/v1/cases/{id}/documents  evidence, or a signed pull link
```

and consume:

```
POST   /v1/partner/customers/{id}/requirements       raise one
PATCH  /v1/partner/customers/{id}/requirements/{id}  accept or cancel
GET    /v1/partner/customers/{id}/verifications      current state
```

with your decisions arriving as `verification.*` status changes.

We would rather adapt to a contract you already have than invent a parallel one.
Send it over.

---

## 7. Building against the docs

Everything on this site is available as Markdown and as an OpenAPI 3.1
document — see [Machine-readable docs](/getting-started/machine-readable.html).

```bash
curl -s https://partners.niftipay.com/llms-full.txt   # whole API, one file
curl -s https://partners.niftipay.com/openapi.json    # 33 operations
```

---

## Known limits, collected

Stated here so you meet them on this page rather than mid-build:

- No hosted merchant onboarding UI to hand off to.
- No per-partner outbound API client (webhooks only).
- No form engine: we will not render partner-defined fields to merchants.
- No conditional fields.
- No document delete — uploads append.
- No withdrawal-wallet delete — the allowlist only grows.
- No pagination cursors; list endpoints return a single clamped page.
- Reviewer notes are never exposed. Rejection reasons are a coarse closed list.

If one of these blocks you, say which. Several of them are contained work and
have been done for partners who asked.
