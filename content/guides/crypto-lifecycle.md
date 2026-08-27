---
title: Crypto payments, end to end
section: Guides
---
# Crypto payments, end to end

Every call from "we have a new merchant" to "the buyer paid", in order.

The first three steps are identical to
[Card payments](/guides/fiat-lifecycle.html) — same customer, same agreements,
same KYB loop. This page covers them briefly and then diverges.

---

## The shape of it

```
1  create the customer                ← once per merchant
2  accept the agreements              ← once per merchant
3  run the KYB loop                   ← once per merchant, and see below
4  (optional) provision wallets       ← once per merchant
5  create an order                    ← per purchase
6  follow it to paid                  ← per purchase
```

## Crypto does not wait for KYB

The important difference. `payments.crypto` is granted **at customer creation**,
alongside `wallets`, `payouts` and `refunds`. Only `payments.fiat_card` and
`withdrawals` are KYB-gated.

So a merchant can take crypto **immediately** — steps 1, 2 and 5, and you are
live. Step 3 still matters if they will ever take cards or withdraw, and it is
worth starting early, but it does not block this rail.

```json
{ "capability": "payments.crypto",    "enabled": true,  "available": true }
{ "capability": "payments.fiat_card", "enabled": false, "available": false,
  "reason": "kyb_required" }
```

That is a brand-new customer, before any verification.

---

## 0. Get a token

```bash
curl -X POST https://www.niftipay.com/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{ "grant_type": "client_credentials",
        "client_id": "<partner_client_id>",
        "client_secret": "<partner_client_secret>",
        "scope": "customers:write orders:create orders:read wallets:read wallets:write" }'
```

Token is at **`data.access_token`**. Scope requests are all-or-nothing.

## 1–3. Customer, agreements, KYB

Identical to the card rail — see
[Card payments, steps 1–3](/guides/fiat-lifecycle.html). In short:

```bash
POST $BASE/customers                                       → partner_customer_id
GET  $BASE/customers/pc_…/agreements                       → two required
POST $BASE/customers/pc_…/agreements/{id}/acceptances      → accept each
POST $BASE/customers/pc_…/verifications                    → the KYB loop
```

You can start selling crypto after step 1 and 2. KYB can run in parallel.

## 4. Wallets (optional)

Every customer is provisioned with deposit wallets. You rarely need to touch
them — `POST /orders` mints a per-order address by itself — but you can read or
create them:

```bash
curl $BASE/customers/pc_…/wallets -H "Authorization: Bearer $TOKEN"
```

```json
{ "data": { "wallets": [
  { "chain": "BTC", "address": "bc1q…", "balance": "0", "network": "mainnet" },
  { "chain": "ETH", "address": "0x…",  "balance": "0",
    "tokens": { "USDT": "0", "USDC": "0" }, "network": "mainnet" } ] } }
```

`POST /customers/{id}/wallets` provisions any chain that is missing and returns
the full set. It is safe to call repeatedly.

## 5. Create the order

```bash
curl -X POST $BASE/customers/pc_…/orders \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "CRY-1042", "network": "ETH", "asset": "USDT",
        "amount": 100, "currency": "EUR",
        "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com" }'
```

```json
{ "data": { "order": {
    "id": "7d1dcdd4-…", "reference": "CRY-1042",
    "network": "ETH", "asset": "USDT",
    "amount": "116.751879", "totalToSend": "116.751879",
    "currency": "EUR", "fiatAmount": "100",
    "address": "0x49d83b0d…",
    "paymentUri": "ethereum:0x49d83b0d…?contract=0xdAC17F…&amount=116.751879",
    "qrUrl": "https://www.niftipay.com/api/qr?data=…",
    "status": "pending",
    "expiresAt": "2026-08-27T21:12:02.923Z" },
  "replayed": false } }
```

### Reading that response

**You price in fiat; the buyer pays in crypto.** You send `amount: 100` with
`currency: "EUR"`; we return `amount` as the **token** amount at the current
rate. `fiatAmount` echoes what you asked for.

**Show `totalToSend`, not `amount`.** They are equal when there are no network
fees and differ when there are. `totalToSend` is what actually has to arrive.

**Three ways to present it**, all equivalent — `address` for copy-paste,
`paymentUri` for a wallet deep link, `qrUrl` for a scannable code.

**`expiresAt` is a real deadline** — typically twelve hours. The rate is held
until then. After it, create a new order.

### Duplicate `reference` behaves differently here

The card rail refuses a duplicate `reference` with `409 reference_conflict`.
This rail **replays** it: you get `201` with the **original** order and
`"replayed": true`.

That is deliberate — a crypto order holds a rate and an address, and minting a
second one for the same purchase would split the payment across two addresses.
Check `replayed` if you care whether you just created something.

`Idempotency-Key` is still required, and still the right thing to reuse on a
retry.

## 6. Follow it

**Listen** for `payment.confirmed` and `payment.expired`, or **poll**:

```bash
curl $BASE/orders/7d1dcdd4-… -H "Authorization: Bearer $TOKEN"
```

Note the shape difference from the card rail: a crypto order is read by its
**uuid** at `/orders/{orderId}`, while a fiat order is read by its short integer
`order_key` at `/fiat-orders/{orderKey}`.

`status` runs `pending` → `confirmed`, or `expired`. An underpayment is its own
state rather than a silent failure.

---

## What goes wrong, and what it means

| Response | Cause | Do |
|---|---|---|
| `403 capability_not_enabled` | `payments.crypto` off for this customer | Rare — it is granted at creation. Check [capabilities](/api/capabilities.html). |
| `400 invalid_request` | Bad `network`/`asset` pair, or a missing field | The message names which. `network` is the chain, `asset` is the token. |
| `400 idempotency_key_required` | No key on the POST | Always send one. |
| `409 idempotency_key_reuse` | Same key, different body | Use a new key for a genuinely different order. |
| `503 temporarily_unavailable` | Transient | **The only code that means retry.** |

---

## Card or crypto: how they differ

| | Card | Crypto |
|---|---|---|
| Capability | `payments.fiat_card` — **KYB-gated** | `payments.crypto` — **granted at creation** |
| Scope | `payments:create` | `orders:create` |
| Needs an integration | **Yes** | No |
| Endpoint | `POST /customers/{id}/fiat-orders` | `POST /customers/{id}/orders` |
| Read by | `order_key` (integer) at `/fiat-orders/{key}` | `id` (uuid) at `/orders/{id}` |
| Amount | `amount_cents`, minor units | `amount`, major units, fiat-priced |
| Buyer pays via | `pay_url` — a hosted page | An address, URI or QR |
| Duplicate `reference` | `409 reference_conflict` | Replayed, `201` with the original |
| Expiry | Set by the payment link | `expiresAt`, ~12 hours, holds the rate |

Both rails share the customer, the agreements, the KYB case, the webhooks and
the error envelope. If you are integrating both, do steps 1–3 once.
