---
title: Bidirectional partner integration
section: Guides
---
# Bidirectional partner integration

Answers to the questions raised in *Temble × Niftipay — Partner API v1.0 —
Technical Integration Proposal*, plus what changed on our side in response.

Written for a **two-way** integration: Temble consumes the Niftipay Partner API,
and Niftipay consumes Temble's. Both directions are treated as first-class here.

---

## The short version

| Question | Answer |
|---|---|
| Private/enterprise server-to-server? | **Yes**, outbound webhooks today; a per-partner outbound API client is new work. |
| Reopen onboarding after submission? | **Yes** — built for this. See *Requirements*. |
| Dynamic requirements after submission? | **Yes** — shipped in response to your proposal. |
| Render fields from an external schema? | **No.** Our schema is fixed. We now publish it, which is the opposite direction. |
| Dynamic / custom / conditional fields? | **No.** |
| Repeating groups? | **Yes**, but fixed shape — `directors[]`, `ubos[]`. |
| Dynamic document requirements? | **Partly** — a requirement can ask for one of five fixed types. |

Two of those changed *because of* your questions. The rest are honest limits and
we would rather you design around them than discover them.

---

## 1. Private partner API — server-to-server

**Niftipay → Temble** works today through **partner webhooks**. You register one
or more HTTPS endpoints; we sign each delivery with HMAC-SHA256 over
`<x-timestamp>.<raw body>`, retry six times over roughly two days
(1m · 5m · 25m · 2h · 10h · 24h), and keep a delivery log with replay.

Event vocabulary:

```
customer.updated            verification.pending
requirement.created         verification.approved
requirement.resolved        verification.rejected
document.reviewed           capability.updated
agreement.accepted          payment.confirmed / payment.expired
```

See [Webhooks](/api/webhooks.html) for verification, and note two things you
asked about specifically:

- **`event_id` is stable across retries.** It identifies the event, not the
  attempt. Use it as an idempotency key. If you register two destinations, both
  receive the **same** `event_id`.
- **`x-timestamp` is regenerated per attempt**, so your skew window only has to
  cover transit and clock drift — never the 24-hour backoff. We do not mandate a
  value; ±300s is what we would pick.

**Temble → Niftipay** is the ordinary Partner API: OAuth client credentials,
short-lived JWT, scoped per endpoint. See
[Authentication](/getting-started/authentication.html).

**What does not exist yet:** a per-partner outbound API *client* — Niftipay
calling arbitrary Temble endpoints on a schedule or in-line with a decision. Our
one precedent is the KYB sync, which POSTs to a single globally-configured
underwriting endpoint and receives status callbacks. Generalising that to
per-partner is a contained piece of work, but it is work. If your side can
consume webhooks and expose the callbacks below, nothing new is needed.

---

## 2. Dynamic requirements — this now exists

Your Hour 1 / Hour 3 example is exactly the flow, and it is live.

```
Hour 1  merchant completes onboarding
        POST /verifications  →  submitted
        webhook: verification.pending

Hour 3  Temble underwrites, needs an ID for the second UBO
        POST /customers/{id}/requirements
          { "kind": "document", "target": "ubo:1",
            "document_type": "director_id",
            "message": "Identity document for the second UBO" }
        → the case REOPENS automatically
        → webhook: requirement.created  (to every partner on this merchant)

        merchant uploads
        POST /customers/{id}/documents        (multipart)
        PATCH /customers/{id}/requirements/{requirementId}
          { "status": "fulfilled" }
        → webhook: requirement.resolved

        Temble accepts
        PATCH … { "status": "satisfied" }
```

Full reference: [Requirements](/api/requirements/list.html).

Three properties worth designing against:

**An open requirement reopens a submitted case.** Asking for one more document
must not mean rejecting an entire application, and a merchant who cannot edit
cannot supply what was asked for. While anything is `open` or `fulfilled`, both
`POST /verifications` and `POST /documents` accept writes again. An *approved*
case does not reopen.

**Only the raiser closes one.** The side providing evidence may set `fulfilled`
and may not set `satisfied`. If Temble raises it, Temble accepts it. This is
enforced, not a convention — otherwise either side could close its own
requirements and carry an unreviewed case forward.

**`target` is yours.** `ubo:1`, `director:0`, `field:registration_number` — we
store it and hand it back untouched. The party that raised a requirement is the
party that knows what it points at, so we do not interpret it.

### Whole-case rejection also carries a reason now

Previously `verification.rejected` said only that a case failed. It now carries
`rejection_reason` from a closed list: `documents_illegible`,
`documents_missing`, `documents_expired`, `industry_not_accepted`,
`entity_unverifiable`, `ownership_unclear`, `sanctions_or_pep`,
`duplicate_application`, `other`.

Two of those are **not** fixable by resubmitting —
`industry_not_accepted` and `sanctions_or_pep` — so your UI should not offer a
retry on them.

---

## 3. Dynamic rendering from an external schema — no, and the honest reason

We cannot render Temble's schema. Niftipay's onboarding is a fixed zod schema
with fixed enums and fixed steps; there is no field engine, no place to store
answers to fields we do not have columns for, and no conditional-display system.
Building one is a project, not a change.

What we did instead is the **inverse**, and it may serve the same purpose:

<span class="badge get">GET</span> `/api/v1/partner/onboarding/schema`

returns *our* field set as data — every enum inline, `required_at_submit` per
field, repeating groups with their shapes, the document rules. If Temble renders
Niftipay onboarding inside Temble's product, build the form from that response
rather than transcribing our docs, and you will not drift when we add an
industry.

See [Onboarding schema](/api/onboarding-schema.html). It opens by saying what it
is not, because "we published a schema endpoint" reads like the thing you asked
for and is not it.

---

## 4. Do we have dynamic / custom / conditional fields, repeating groups, dynamic document requirements?

Point by point, and the response payload answers this too under `dynamic`:

| Concept | Niftipay | Detail |
|---|---|---|
| Dynamic fields | ✗ | Fixed schema. Unknown keys are `422`, not stored. |
| Custom fields | ✗ | No `custom_fields` bag anywhere. |
| Conditional fields | ✗ | No "show B if A" rules exist to express. |
| **Repeating groups** | **✓** | `directors[]` and `ubos[]`, max 20 each. Fixed element shape — more people, never more fields. |
| Dynamic document requirements | **partly** | A requirement can ask for a document, but `document_type` must be one of five fixed types. You cannot define a sixth. |

If Temble needs a field we do not have, the options today are: map it onto an
existing one, keep it on your side, or ask us to add it — a schema change with a
`schema_version` bump, not a runtime one.

---

## 5. Our schema, in full

Machine-readable: [`GET /onboarding/schema`](/api/onboarding-schema.html).
Prose with the reasoning: [KYB field reference](/api/verifications/fields.html).

The headline values, so this document stands alone:

**Industry** (17, and the selection *is* the risk classification):
`ecommerce_retail` · `cannabis` · `cbd` · `hemp` · `seeds` · `growshops` ·
`cannabis_clubs` · `standard_wellness_products` · `peptides` · `kratom` ·
`higher_risk_supplements` · `difficult_to_place_ecommerce` ·
`merchants_requiring_expensive_payment_routes` ·
`merchants_with_elevated_refund_or_chargeback_exposure` · `functional_mushrooms` ·
`adult` · `other`

**Expected monthly volume** — a **band, not a number**. Sending `50000` is a
`422`: `range_0_1k` · `range_1k_10k` · `range_10k_50k` · `range_50k_250k` ·
`range_250k_plus`

**Other enums:** `card_type` (`eea` · `non_eea` · `mixed`) · `settlement_option`
(`fiat_eur_iban` · `crypto_usdt`) · `fee_handling` (`customer_pays` ·
`niftipay_absorbs`) · `requested_payment_methods` (`card` · `bank_transfer` ·
`crypto` · `other`)

**Documents** — all five required, `application/pdf` · `image/jpeg` ·
`image/png`, 15 MB max: `certificate_of_incorporation` · `proof_of_address` ·
`director_id` · `bank_statement` · `processing_statement`

**There is no document delete.** Uploads append and submission takes the latest
of each type, so a second upload of the same type is the supported correction.
Reviewed evidence stays in the record.

**People.** `directors[]` and `ubos[]`, max 20 each, `full_name` +
`date_of_birth` + `nationality` required per person. A UBO adds
`ownership_percent`, **25–100**, decimals fine.

Three UBO rules that are easy to guess wrong:

- Percentages **do not have to total 100**. The 25% floor is the whole rule.
- `directors` and `ubos` are independent — **no cross-check, no dedup**. A
  founder who is both belongs in both.
- A company with nobody at 25% sends `"ubos": []` with
  `"ubo_declaration": "no_qualifying_ubo"`. This was impossible before your
  questions; it is a declaration rather than an inference from an empty array,
  because "not filled in yet" and "genuinely nobody" are different facts.

---

## 6. Suggested contract shape

Rather than inventing a parallel model, we suggest Temble expose the mirror of
what we already do — the two callbacks are all we would need to drive the
underwriting loop from our side:

```
POST   {temble}/partner/v1/cases                 case submitted, our payload
POST   {temble}/partner/v1/cases/{id}/documents  evidence, or a signed pull link
```

and consume ours:

```
POST   /v1/partner/customers/{id}/requirements       raise one
PATCH  /v1/partner/customers/{id}/requirements/{id}  accept or cancel
GET    /v1/partner/customers/{id}/verifications      current state
```

with your decisions arriving as `verification.*` status changes.

If Temble genuinely needs Niftipay to render **Temble-defined** fields, that is a
roadmap conversation rather than a contract alignment — say so and we will scope
it honestly instead of implying it exists.

---

## What changed because you asked

- `verification.rejected` now carries `rejection_reason`
- Requirements: raise, list, fulfil, satisfy, cancel — with a reopen rule
- `ubo_declaration: "no_qualifying_ubo"` for widely-held companies
- `GET /onboarding/schema`
- Document upload was live but undocumented; it is documented now
- `event_id` and clock-skew answers corrected in the webhook reference
