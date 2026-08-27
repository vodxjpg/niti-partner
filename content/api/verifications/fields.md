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

Upload them with
[Upload a document](/api/documents/upload.html). Uploads **append**, and
submission takes the latest of each type — so replacing a rejected document
means uploading a new one of the same type, not deleting anything.

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
spread across five 20% holders therefore has no UBOs to report, and cannot
currently be submitted (see below).

**"No UBO" is not supported.** At least one UBO and at least one director are
required at submission. If a structure genuinely has none — a foundation, a
widely-held company — contact us rather than inventing an entry.

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
| People | `directors` (≥1), `ubos` (≥1) |
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
            "incomplete_fields": [ { "path": ["ubos"], "message": "At least one UBO is required" } ] } }
```

So the integration loop is: send what you have, read `incomplete_fields` and
`missing_documents`, send more. An empty POST is a valid way to re-attempt
submission once evidence is uploaded.
