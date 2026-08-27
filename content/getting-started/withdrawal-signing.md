---
title: Signing withdrawals
section: Getting Started
---
# Signing withdrawals

The two money-out endpoints —
[Register a withdrawal wallet](/api/withdrawal-wallets/create.html) and
[Create a withdrawal](/api/withdrawals/create.html) — need a second credential
beyond your bearer token: an Ed25519 assertion in `X-Withdrawal-Signature`.

Everything else in this API needs only the token.

## Why

A bearer token crosses TLS terminators, proxies, log aggregators and your own
HTTP client's memory. It is the credential that realistically leaks.

This one does not travel. You hold the private key; Niftipay holds only the
public half and can never produce a signature with it. Someone who steals your
token still cannot move money — they would also need code execution wherever
your private key lives.

## Setup, once

1. Generate an **Ed25519** keypair.

   ```bash
   openssl genpkey -algorithm ed25519 -out withdrawal-key.pem
   openssl pkey -in withdrawal-key.pem -pubout -out withdrawal-key.pub
   ```

2. Send us `withdrawal-key.pub` — the public half only. Never the private one;
   we have no use for it and no way to ask for it.

3. We register it and reply with a **fingerprint**. Compare it against what you
   deployed. That fingerprint is the only representation of the key that appears
   in our responses, logs or screens.

Keep the private key wherever your other server-side secrets live. It signs
money movement, so it warrants the same handling as your database credentials —
and it should never reach a browser.

## Building the assertion, per request

```
target    = sha256hex(rawBody)
canonical = JSON.stringify(["partner.withdrawal", target, clientId, nonce, iat, exp])
signature = ed25519_sign(privateKey, utf8Bytes(canonical))
header    = base64url(canonical) + "." + base64url(signature)
```

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| action      | The literal `"partner.withdrawal"`, for **both** endpoints.           |
| target      | Lowercase hex SHA-256 of the request body, as bytes sent.             |
| clientId    | Your OAuth client id. Must match the token's caller.                  |
| nonce       | Unique per assertion. Single-use.                                     |
| iat / exp   | **Seconds** since epoch. `exp - iat` ≤ 120. `iat` ≤ now + 30s.        |

Ed25519 as specified — no prehash, no context string. Sign the canonical string's
UTF-8 bytes directly.

### The canonical form is a positional array

Not an object. You will reimplement this in another language, and two
implementations that agree on every field can still disagree on key ordering,
whitespace, or how a number serialises. A positional array leaves nothing to
disagree about.

We verify against our **own** recomputation of that array, never against the
bytes you sent. A payload reshaped in transit cannot ride its original
signature.

## Example

```js
import { createHash, sign, randomUUID } from "node:crypto";

function withdrawalSignature(privateKey, clientId, rawBody) {
  const iat = Math.floor(Date.now() / 1000);
  const canonical = JSON.stringify([
    "partner.withdrawal",
    createHash("sha256").update(rawBody, "utf8").digest("hex"),
    clientId,
    randomUUID(),
    iat,
    iat + 60,
  ]);
  const sig = sign(null, Buffer.from(canonical, "utf8"), privateKey);
  return `${Buffer.from(canonical).toString("base64url")}.${sig.toString("base64url")}`;
}

// Serialise ONCE. Sign that string, and send that same string.
const rawBody = JSON.stringify({ chain: "BTC", asset: "BTC", amount: "0.5", to: "bc1q…" });

await fetch(`${BASE}/customers/${customerId}/withdrawals`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
    "X-Withdrawal-Signature": withdrawalSignature(privateKey, clientId, rawBody),
  },
  body: rawBody,
});
```

## Three things that will catch you out

**Sign the bytes you send.** `target` hashes the raw body. If anything
re-serialises it after you sign — a pretty-printer, a middleware that reorders
keys, a client that re-encodes JSON — you get `target_mismatch` on a payload
that looks correct. Serialise once, hash that string, send that string.

**One assertion per request.** The nonce is single-use, and `exp - iat` cannot
exceed 120 seconds. Do not cache an assertion across calls.

**On a retry, reuse the same `Idempotency-Key`.** The idempotency check runs
*before* signature verification, so a retried key replays the recorded response
without needing a fresh signature. If a first attempt burned its nonce but its
response was lost to you, mint a new assertion with a new nonce and keep the
same `Idempotency-Key`.

## Rotation

Send us a new public key. The outgoing one keeps verifying for a grace window —
24 hours by default — so a partner mid-redeploy is never locked out of its own
money. Both keys are accepted during the window; sign with whichever you have.

If a private key is compromised, tell us and ask for a **zero grace** rotation.
The old key stops verifying on the very next request.

## Failure reasons

`401 signature_required` covers all of these. The specific reason is logged on
our side and quoted against your `request_id`, rather than returned — telling a
caller *which* check failed is a hint we would rather not hand to someone
probing:

| Reason | What it means |
|--------|----------------|
| `missing` | No header. |
| `no_key` | We hold no usable key for you. Registration has not happened. |
| `bad_signature` | Malformed token, or no registered key verifies it. |
| `expired` / `issued_in_future` / `ttl_too_long` | Clock or TTL bounds. Check `exp - iat ≤ 120` and your clock. |
| `target_mismatch` | The body hash does not match the body received. |
| `client_mismatch` | `clientId` is not the authenticated caller. |
| `action_mismatch` | `action` is not `partner.withdrawal`. |
| `nonce_replayed` | That nonce was already used. |
