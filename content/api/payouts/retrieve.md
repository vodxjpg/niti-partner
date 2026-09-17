---
title: Retrieve a payout
section: API Reference / Payouts
---
# Retrieve a payout

<span class="badge get">GET</span> `/api/v1/partner/payouts/{payoutId}`

> Required scope: `payouts:read`. Capability: `payouts`.

Top-level, not nested under the customer — matching
`/api/v1/partner/orders/{orderId}`: a payout id is globally unique, so requiring
the caller to also know which customer it belongs to would add a lookup the
caller often cannot do.

`{payoutId}` accepts **either** id form the list endpoint hands out:

- a real payout id, opaque — treat it as a token, not a value to construct or
  parse, or
- a forecast id, `upcoming_<customerId>_<YYYY-MM-DD>_<CURRENCY>` — a projection
  that has no row of its own yet. Its owner and date are parsed out of the id
  itself and carried through the identical relationship and capability checks
  as a real payout.

```bash
curl https://www.niftipay.com/api/v1/partner/payouts/7d1dcdd4-9f3a-4c21-8f0e-2b1c9a5d4e10 \
  -H "Authorization: Bearer <partner_api_key>"
```

## Response `200`
```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "payout": {
      "id": "7d1dcdd4-9f3a-4c21-8f0e-2b1c9a5d4e10",
      "status": "paid",
      "currency": "EUR",
      "net_cents": 483210,
      "net_eur_cents": 483210,
      "payout_due_at": "2026-09-30T00:00:00.000Z",
      "paid_at": "2026-09-30T08:12:44.000Z",
      "created_at": "2026-09-23T00:00:05.000Z",
      "updated_at": "2026-09-30T08:12:44.000Z",
      "orders_count": 3,
      "payout_asset": "USDT",
      "payout_asset_amount": "5232.45",
      "payout_asset_rate_eur": 0.9238,
      "payout_asset_decimals": 6,
      "orders": [
        { "id": "9c1f2b3a-4d5e-6f70-8192-a3b4c5d6e7f8",
          "order_key": "CRY-1042",
          "merchant_reference": "INV-2026-0091",
          "currency": "EUR",
          "amount_cents": 210000,
          "subtotal_cents": 205000,
          "payable_now_cents": 210000,
          "created_at": "2026-09-24T11:02:00.000Z",
          "completed_at": "2026-09-24T11:08:41.000Z" }
      ],
      "calculation": {
        "orders_count": 3,
        "gross_cents": 512000,
        "fee_cents": 15360,
        "retention_hold_cents": 10000,
        "matured_retention_cents": null,
        "deductions_cents": 3430,
        "deduction_items": [
          { "reason": "chargeback",
            "cents": 3430,
            "currency": "EUR",
            "source_id": "cb_2f1a9c",
            "forfeited_at": "2026-09-27T09:15:00.000Z" }
        ],
        "period_start": "2026-09-16T00:00:00.000Z",
        "period_end": "2026-09-23T00:00:00.000Z",
        "settlement_days": 7,
        "settlement_cutoff": "2026-09-23T23:59:59.999Z"
      }
    }
  } }
```

## What a payout covers

**This is the merchant's entire settlement for the period, not just this
partner's business.** `orders[]` and every total in `calculation` are computed
across the merchant's whole account — their direct sales, this partner's
orders, and any other partner's orders — summed against one retention hold and
one fee total. A partner granted `payouts` on a shared merchant will see orders,
and `merchant_reference` values, it did not itself create. There is no way to
narrow this response to "this partner's share"; see [the list
endpoint](/api/payouts/list) for the full reasoning. The instrument for a
merchant who must not be exposed this way is revoking `payouts` on that
relationship.

## One answer for every miss

Every failure to read a payout — the id does not exist, it belongs to a
merchant this partner has no relationship with, the relationship was revoked,
or the `payouts` capability is not granted on it — comes back as the same
`404 resource_not_found`, deliberately. A distinguishable response for any one
of those cases would confirm to the caller which payout ids exist for a
merchant it cannot otherwise see.

## Errors

| Status | code                     | Meaning                                                   |
|--------|--------------------------|------------------------------------------------------------|
| 403    | insufficient_scope       | Token was not minted with `payouts:read`.                  |
| 404    | resource_not_found       | No payout with that id is available to this partner (see above — covers a missing id, no relationship, a revoked relationship, and a capability not granted). |
| 503    | temporarily_unavailable  | Read failed transiently; retry shortly.                    |
| 500    | internal_error           | Unknown failure. **Not** an invitation to retry.            |
