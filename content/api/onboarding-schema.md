---
title: Onboarding schema
section: API Reference / Onboarding schema
---
# Onboarding schema

<span class="badge get">GET</span> `/api/v1/partner/onboarding/schema`

> Required scope: `partner:read`. No customer in the path — the contract is
> identical for every partner.

Our KYB field set, as data. Build your onboarding form from this response
instead of hardcoding seventeen industry strings that drift the day we add one.

## Read this first: it describes a fixed schema, it does not accept one

The response says so itself:

```json
"dynamic": {
  "custom_fields": false,
  "conditional_fields": false,
  "partner_defined_fields": false,
  "partner_defined_documents": false,
  "repeating_groups": true
}
```

If you are looking for a system where **you** define the fields and Niftipay
renders them, that is not this and does not exist. This is the opposite
direction: we publish our fixed contract so you can render it.

`repeating_groups: true` is the one honest yes — `directors[]` and `ubos[]` are
repeating groups. Their **shape** is fixed; you may send more people, never more
fields. Anything outside this schema is `422`, not stored.

## Shape

```json
{ "schema_version": "2026-08-27",
  "dynamic": { … },
  "groups": [
    { "key": "business",   "fields": [ … ] },
    { "key": "contact",    "fields": [ … ] },
    { "key": "commercial", "fields": [ … ] }
  ],
  "repeating_groups": [
    { "key": "directors", "max_items": 20, "min_items_at_submit": 1, "fields": [ … ] },
    { "key": "ubos",      "max_items": 20, "min_items_at_submit": 1, "fields": [ … ] }
  ],
  "declarations": [ … ],
  "documents": { "required_at_submit": [ … ], "delete_supported": false, … },
  "requirements": { "supported": true, … } }
```

A field:

```json
{ "key": "industry",
  "type": "enum",
  "required_at_submit": true,
  "options": ["ecommerce_retail", "cannabis", … ],
  "notes": "The selection IS the risk classification. No free text beyond `other`." }
```

| Property | Meaning |
|---|---|
| `type` | `string` · `enum` · `boolean` · `number` · `date` · `url` · `email` · `array` |
| `required_at_submit` | Whether it must be present before the case leaves draft. Everything is optional on the way there — `POST /verifications` takes any subset. |
| `options` | Present for `enum`, and for `array` whose items are enum values. |
| `max_length` | For strings. |
| `notes` | Rules a type cannot express. Read them. |

## Version it, do not poll it

`schema_version` is a date, and it changes only when a partner could **notice** —
a field added or removed, an enum value gained or lost, a rule tightened. Never
for wording.

Cache the response against it. Re-fetch on deploy, or when a `422` surprises
you.

## What it will not tell you

- **Nothing merchant-specific.** No per-customer requirements, no progress. Use
  [Retrieve a verification](/api/verifications/retrieve.html) and
  [Requirements](/api/requirements/list.html) for those.
- **Nothing about layout.** No ordering hints, no field groupings beyond the
  three coarse ones, no labels. The `key` is a key, not a caption — you write
  merchant-facing wording in your own language and voice.
- **Nothing conditional.** There are no "show B only if A" rules to express,
  because we have none.

The prose version of the same contract, with the reasoning, is the
[KYB field reference](/api/verifications/fields.html). The endpoint is the one to
build against; the page is the one to read.
