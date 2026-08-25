---
title: Errors
section: Getting Started
---
# Errors

Every error uses the same envelope:

```json
{ "error": { "code": "invalid_request", "message": "…", "request_id": "req-1" } }
```

| Status | code               | Meaning                                              |
|--------|--------------------|------------------------------------------------------|
| 400    | invalid_request    | Missing/!https URL, wrong-typed field, bad body      |
| 401    | unauthorized       | Missing or invalid API key                           |
| 404    | not_found          | Resource does not exist or is not yours              |
| 409    | reference_conflict | The `reference` is already used (generic, ownerless) |
| 422    | validation_error   | Service-level validation failed                      |
| 500    | internal_error     | Unexpected server error                              |

> `reference_conflict` is deliberately generic — it does **not** reveal whose
> order holds the conflicting reference.
