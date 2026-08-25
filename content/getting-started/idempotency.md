---
title: Idempotency
section: Getting Started
---
# Idempotency

Every state-changing request must carry a unique `Idempotency-Key` header
(a UUID). Replaying the same key returns the original result instead of
creating a duplicate.

- The key is required; omitting it is a `400 invalid_request`.
- A key is **released back to you** when the request is refused *before* the
  service runs (for example a wrong-typed field or a missing required URL),
  so you can fix the payload and retry with the same key.
- A key is **consumed** once the request reaches the service; a later replay
  with the same key returns the first outcome.
