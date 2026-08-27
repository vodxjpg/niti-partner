---
title: Retrieve a verification
section: API Reference / Verifications
---
# Retrieve a verification

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/verifications/{verificationId}`

> Required scope: `kyb:read` (global tier).

Returns one KYB case and its status-transition history.

A customer has exactly **one** KYB case, so this and
[List verifications](/api/verifications/list.html) return the same case — the
list wraps it in an array, this returns it directly. Use whichever fits how you
stored it: the list if you only kept the customer id, this if you kept the
`verification_id`.

> Earlier revisions of this page noted that no per-id route existed and told you
> to use the collection instead. It exists now. The collection has not changed.

## Request

```bash
curl -X GET https://www.niftipay.com/api/v1/partner/customers/pc-1/verifications/app-1 \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "verification":
      { "verification_id": "app-1", "partner_customer_id": "pc-1", "type": "kyb",
        "status": "approved", "submitted_at": "2026-08-10T10:00:00.000Z",
        "verified_at": "2026-08-12T14:08:00.000Z", "valid_until": null,
        "source": "niftipay", "reusable": false, "reuse_policy": "none",
        "document_access": "restricted", "created_at": "2026-08-01T00:00:00.000Z",
        "updated_at": "2026-08-12T14:08:00.000Z",
        "attributes": { "legal_name": "Example SL", "registration_number": "B123",
                        "trading_name": null, "website": null, "industry": null,
                        "registered_address_line1": null, "registered_address_line2": null,
                        "registered_city": null, "registered_postal_code": null,
                        "registered_country": null, "incorporation_country": null,
                        "incorporation_date": null, "business_registration_country": null },
        "directors": [], "ubos": [] },
    "history": [
      { "status": "kyb_submitted", "occurred_at": "2026-08-10T10:00:00.000Z" },
      { "status": "kyb_approved", "occurred_at": "2026-08-12T14:08:00.000Z" } ] } }
```

Note the shape difference from the collection: `verification` (an object) rather
than `verifications` (an array). `history` is identical in both.

`status` is one of `unverified` | `pending` | `approved` | `rejected`. `expired` is
never returned; a past-due case shows `valid_until: null`. `history` carries only
the transition status and its timestamp — reviewer notes and reason codes are
withheld.

## Why a case was rejected

When `status` is `rejected`, `rejection_reason` carries one of a closed list.
It is `null` on every other status, and `null` on a rejection we were given no
reason for — absent rather than guessed.

| Reason | What the merchant should do |
|---|---|
| `documents_illegible` | Re-upload clearer scans. |
| `documents_missing` | Something required was absent or unreadable. |
| `documents_expired` | Provide current versions. |
| `industry_not_accepted` | The declared industry cannot be onboarded. Not fixable by resubmitting. |
| `entity_unverifiable` | The company could not be matched in the registry. Check the legal name and registration number. |
| `ownership_unclear` | The director/UBO structure did not reconcile. |
| `sanctions_or_pep` | A screening hit. Contact us; do not resubmit. |
| `duplicate_application` | This entity already exists on Niftipay. |
| `other` | A reason outside the list. Contact us with the `verification_id`. |

The same value arrives on the `verification.rejected` webhook, so listening and
polling agree. Reviewer notes are **not** exposed on any surface — the list is
deliberately coarse, and free text is never forwarded.

For a rejected **document** rather than a whole case, `document.reviewed` and
[List documents](/api/documents/list.html) carry a per-document
`rejection_reason` with more detail.

## Every miss is the same `404`

Three different situations answer identically:

- no verification has been started for this customer
- a case exists and `verificationId` names a different one
- `verificationId` is another merchant's real case

The third is why the first two share its wording. Distinguishing it would confirm
that a case id exists and belongs to somebody, which is the merchant discovery
the relationship guard exists to prevent. The case is resolved from the
**relationship**, and the id you supply is only ever compared against it.

## Errors

| Status | code                    | Meaning                                              |
|--------|-------------------------|------------------------------------------------------|
| 403    | insufficient_scope      | Token was not minted with `kyb:read`.                |
| 404    | resource_not_found      | No such case on this customer — see above.           |
| 503    | temporarily_unavailable | Transient database failure. Retry.                   |
