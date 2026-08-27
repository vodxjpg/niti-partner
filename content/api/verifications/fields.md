---
title: KYB field reference
section: API Reference / Verifications
---
# KYB field reference

Every enum, every required field, and the rules that are only enforced at
submission. [Create a verification](/api/verifications/create.html) accepts
partial data — this page is what "complete" means.

## Enums

Send the exact string. Anything else is `422`.

### `business.industry`

The selection **is** the risk classification, so there is no free-text option
beyond `other`.

`ecommerce_retail` · `cannabis` · `cbd` · `hemp` · `seeds` · `growshops` ·
`cannabis_clubs` · `standard_wellness_products` · `peptides` · `kratom` ·
`higher_risk_supplements` · `difficult_to_place_ecommerce` ·
`merchants_requiring_expensive_payment_routes` ·
`merchants_with_elevated_refund_or_chargeback_exposure` · `functional_mushrooms` ·
`adult` · `other`

### `commercial.expected_monthly_processing_volume`

A **band, not a number**. Sending `50000` is `422`.

| Value | Range (EUR / month) |
|---|---|
| `range_0_1k` | up to 1,000 |
| `range_1k_10k` | 1,000 – 10,000 |
| `range_10k_50k` | 10,000 – 50,000 |
| `range_50k_250k` | 50,000 – 250,000 |
| `range_250k_plus` | 250,000 and above |

### The rest

| Field | Values |
|---|---|
| `commercial.card_type` | `eea` · `non_eea` · `mixed` |
| `commercial.settlement_option` | `fiat_eur_iban` · `crypto_usdt` |
| `commercial.fee_handling` | `customer_pays` · `niftipay_absorbs` |
| `commercial.requested_payment_methods` | array of `card` · `bank_transfer` · `crypto` · `other` (max 10, **at least 1** at submit) |
| `document_type` (on upload) | `certificate_of_incorporation` · `proof_of_address` · `director_id` · `bank_statement` · `processing_statement` |

## Required documents

**All five**, and submission is blocked until every one is present:

`certificate_of_incorporation` · `proof_of_address` · `director_id` ·
`bank_statement` · `processing_statement`

Upload them with [Upload a document](/api/documents/upload.html).

**There is no delete.** Uploads append, and submission takes the **latest of
each type** — so replacing a rejected document means uploading a new one of the
same type, and the old one stays in the record. That is deliberate: evidence
that was reviewed is part of the audit trail, and a partner able to remove it
could quietly rewrite what a decision was made on.

Practically: never wait for a delete that is not coming, and do not treat a
second upload of the same type as an error. It is the supported way to correct
one.

While any are missing, `POST /verifications` answers `200` with
`"blocked_by": "missing_documents"` and lists exactly which in
`missing_documents`. That is the expected middle of the flow, not an error.

## Directors and UBOs

Both are arrays of the same person shape, max 20 each.

```json
{ "full_name": "Ada Lovelace", "date_of_birth": "1815-12-10", "nationality": "GB",
  "country": "GB", "email": "ada@example.com", "phone": "+44…",
  "address_line1": "…", "city": "…", "postal_code": "…" }
```

`full_name`, `date_of_birth` and `nationality` are required on every person.
Everything else is optional. `date_of_birth` must parse as a date.

A UBO carries one extra field:

| Field | Rule |
|---|---|
| `ownership_percent` | number, **25 to 100**. Decimals are accepted (`33.3`). |

### The rules you asked about, stated plainly

**Percentages do not have to total 100.** There is no sum check. The 25% floor
is the whole rule — a UBO *is* a 25%-or-more shareholder, so anyone below that
threshold is not a UBO and should not be listed. A company whose ownership is
spread across five 20% holders therefore has no UBOs to report — see the next
rule for how to say so.

**A company with no qualifying UBO declares it.** If nobody holds 25% or more —
five 20% holders, a foundation, a widely-held entity — send:

```json
{ "ubos": [], "ubo_declaration": "no_qualifying_ubo" }
```

`ubo_declaration` is `has_ubos` by default, and that default is what requires at
least one UBO. It is a **declaration, not an inference from an empty list**: "not
filled in yet" and "genuinely nobody" are different facts, and a file that cannot
tell them apart is worth nothing to the reviewer. Declaring none *and* listing
someone is refused as the contradiction it is.

At least one **director** is required either way — with no UBO to report, the
senior managing officials are what the file rests on.

The value is returned on reads as `ubo_declaration`, beside `ubos`.

**Overlap is allowed and expected.** `directors` and `ubos` are independent
lists with no cross-check and no deduplication. A founder who is both a director
and a 100% shareholder belongs in **both** arrays, with the same details. We do
not infer one from the other.

## Required at submission

A verification can be created and updated with any subset. These are what must
be present before the case leaves draft:

| Group | Fields |
|---|---|
| Business | `legal_name`, `registration_number`, `industry`, `business_registration_country`, `incorporation_country`, `incorporation_date` |
| Registered address | `line1`, `city`, `postal_code`, `country` |
| Contact | `first_name`, `last_name`, `email` (must be a valid email) |
| Commercial | `expected_monthly_processing_volume`, `card_type`, `settlement_option`, `fee_handling`, `requested_payment_methods` (≥1) |
| People | `directors` (≥1); `ubos` (≥1) **unless** `ubo_declaration` is `no_qualifying_ubo` |
| Consent | `consent.version` |
| Evidence | all five document types |

Optional throughout: `trading_name`, `website` (must be a valid URL if sent),
`registered_address.line2`, `contact.phone`.

`incorporation_date` must parse **and not be in the future**.

`consent.marketing_opt_in` is genuinely optional and defaults to `false`. It is
deliberately not a precondition of onboarding — consent that is required is not
freely given, and a partner submitting on a customer's behalf cannot honestly
assert it. The mandatory gate is
[agreement acceptance](/api/agreements/accept.html), recorded at submit.

## How completeness is reported

You never have to guess what is outstanding. Every `POST /verifications` attempts
submission and tells you what stopped it:

```json
{ "data": { "verification": { … },
            "submitted": false,
            "blocked_by": "validation_failed",
            "missing_documents": [],
            "incomplete_fields": [ { "path": ["ubos"],
                                     "message": "At least one UBO is required, or declare uboDeclaration = no_qualifying_ubo if no person holds 25% or more" } ] } }
```

So the integration loop is: send what you have, read `incomplete_fields` and
`missing_documents`, send more. An empty POST is a valid way to re-attempt
submission once evidence is uploaded.
