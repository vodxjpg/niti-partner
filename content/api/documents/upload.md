---
title: Upload a document
section: API Reference / Documents
---
# Upload a document

<span class="badge post">POST</span> `/api/v1/partner/customers/{customerId}/documents`

> Required scope: `documents:write`. **No** `Idempotency-Key`.

Contributes one piece of KYB evidence for your customer. This is the endpoint
that carries [Flow A](/guides/quickstart.html) from "the business fields are
filled in" to "the case can be reviewed": a verification is only submitted once
the required documents exist.

## multipart/form-data, not base64 JSON

The body is `multipart/form-data`. Evidence is routinely a 15 MB scan, and
base64 inflates it by a third before it reaches a body parser.

```bash
curl -X POST https://www.niftipay.com/api/v1/partner/customers/pc-1/documents \
  -H "Authorization: Bearer <partner_api_key>" \
  -F "document_type=certificate_of_incorporation" \
  -F "file=@/path/to/incorporation.pdf;type=application/pdf"
```

| Part            | Required | Notes                                                     |
|-----------------|----------|-----------------------------------------------------------|
| `document_type` | yes      | One of the five types below.                               |
| `file`          | yes      | The bytes. 1 byte to 15 MB.                                |
| `file_name`     | no       | Overrides the uploaded part's filename. Basename only — directory segments are stripped. |

**`document_type`** — `certificate_of_incorporation` · `proof_of_address` ·
`director_id` · `bank_statement` · `processing_statement` · `other`

`other` is for evidence with no name of its own — a shareholder register, a
licence, a bank letter — usually in response to a
[requirement](/api/requirements/list.html) that asked for one. It is accepted on
upload and is **not** required at submit, so uploading one never changes what
completeness means.

**Content type** must be `application/pdf`, `image/jpeg` or `image/png`.
Anything else is `415`.

## Uploading twice is safe

Uploads **append**; they do not replace. Multiple documents of the same type are
allowed and submission takes the latest of each. That is also why the endpoint
needs no `Idempotency-Key` — a retried upload leaves the newest row winning,
which is the same outcome as the one that did not need retrying.

To replace a rejected document, upload a new one of the same type. There is no
delete.

## Response `201`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": { "document": {
    "document_id": "ba189d7e-702d-4139-9a46-8c0a8e8a1c00",
    "document_type": "certificate_of_incorporation",
    "file_name": "incorporation.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 459,
    "status": "uploaded",
    "rejection_reason": null,
    "submitted_by_partner_id": "client-1",
    "uploaded_at": "2026-08-27T09:44:52.433Z" } } }
```

## Order of operations

A verification must exist before evidence can attach to it. Uploading to a
customer whose case has never been started is `404`, with a message that says so
— call [Create a verification](/api/verifications/create.html) first, even with
only partial business fields.

Once the case is **under review** the endpoint is `409`: evidence cannot change
underneath a reviewer. Wait for the outcome, then upload again if something was
rejected.

## Errors

| Status | code                    | Meaning                                                        |
|--------|-------------------------|----------------------------------------------------------------|
| 400    | invalid_request         | Body was not multipart/form-data.                              |
| 403    | insufficient_scope      | Token was not minted with `documents:write`.                   |
| 404    | resource_not_found      | Customer is not yours, or no verification has been started yet. |
| 409    | verification_in_progress | The case is under review and cannot accept new evidence.      |
| 413    | invalid_request         | Empty file, or larger than 15 MB.                              |
| 415    | unsupported_media_type  | Content type is not PDF, JPEG or PNG.                          |
| 422    | invalid_request         | Unknown `document_type`, or no `file` part.                    |
