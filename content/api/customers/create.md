---
title: Create a customer
section: API Reference / Customers
---
# Create a customer

<span class="badge post">POST</span> `/api/v1/partner/customers`

> Required scope: `customers:write`.

Links a partner's external customer to the merchant ledger.

## Request

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers \
  -H "Authorization: Bearer <partner_api_key>" \
  -H "Idempotency-Key: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{ "external_customer_id": "cust_42", "email": "buyer@example.com" }'
```

| Field                 | Type   | Required | Notes                              |
|-----------------------|--------|----------|------------------------------------|
| `external_customer_id`| string | yes      | Your id for this customer (≤200).  |
| `email`               | string | yes      | Used to link repeat customers.     |
| `name`                | string | no       | Optional display name.             |
| `phone`               | string | no       | Optional (≤32).                    |
| `telegram_handle`     | string | no       | Optional (≤64), leading `@` stripped. |

Unrecognised fields are refused, never ignored.

## Response `201`

```json
{
  "request_id": "req-1",
  "api_version": "2026-08-01",
  "data": {
    "partner_customer_id": "pc-1",
    "customer_id": "user_abc",
    "external_customer_id": "cust_42",
    "relationship_status": "active",
    "created_at": "2026-08-01T00:00:00.000Z",
    "customer": {
      "email": "buyer@example.com",
      "name": null,
      "country": null,
      "created_at": null
    }
  }
}
```

## Three outcomes, not one

The same call creates, links or refuses, depending on what the `email` already
resolves to:

| Outcome | Status | When |
|---|---|---|
| **Created** | `201` | No Niftipay account holds that email. The account and the relationship are both created. No API key is minted and no mail is sent to your customer — credential issuance stays on the provisioning rail, and we do not contact your customer behind your back. |
| **Linked** | `201` | An account holds that email, Niftipay has recorded it as originating from **you**, and you have no relationship with it yet. The existing account is linked under the `external_customer_id` you sent. These are the accounts [candidates](/api/candidates.html) lists. |
| **Already yours** | `200` | You already have an active relationship with that account under **this** `external_customer_id`, or under none at all — in which case the id you sent is claimed onto it. Nothing is created. |

So a repeated identical call is idempotent and safe: `201` the first time,
`200` after.

An `external_customer_id` is never renamed. Sending a *new* id for a
relationship that already carries a different one is not an update — it is
`409 duplicate_external_id`, because from this endpoint's side you have just
described one customer under two of your own ids. To change an id, resolve it
with Niftipay rather than re-posting.

## Errors

| Status | code | When |
|---|---|---|
| 400 | invalid_request | Unrecognised field, or a missing or wrong-typed `external_customer_id` or `email`. `external_customer_id` over 200 characters is refused here rather than truncated — a truncated id would quietly collide with another of yours. |
| 409 | duplicate_external_id | Either that `external_customer_id` already belongs to a **different** customer of yours, or that customer already carries a **different** id. Look the relationship up with [list customers](/api/customers/list.html) before picking another. |
| 409 | customer_exists | The email belongs to an identity you cannot claim. |
| 403 | relationship_not_authorized | A relationship matching the email or the `external_customer_id` exists but has been **revoked**. Calling again does not re-create it; that is a conversation with Niftipay. |

`409 customer_exists` is deliberately uninformative, and its message says
nothing about the account. It covers every "this identity is not yours to
claim" case — a direct Niftipay signup, another partner's customer, an account
linked to you under a different `external_customer_id`. Distinguishing them
would turn this endpoint into a way to test whether an arbitrary email has a
Niftipay account, so the response is identical in all of them. Do not branch on
the message, and do not retry: nothing about the call will change the answer.
