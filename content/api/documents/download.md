---
title: Download a document
section: API Reference / Documents
---
# Download a document

<span class="badge get">GET</span> `/api/v1/partner/documents/{documentId}/download`

> Required scope: `documents:read` (separate from `kyb:read`).

Returns a **short-lived URL** to the bytes rather than the bytes themselves. The
URL is scoped to the calling partner: a document belonging to another partner (or
an unknown id) returns the same `404`, so existence cannot be probed.

## Request

```bash
curl -X GET https://api.niftipay.com/api/v1/partner/documents/doc-1/download \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "document": {
      "document_id": "doc-1", "document_type": "certificate_of_incorporation",
      "file_name": "cert.pdf", "mime_type": "application/pdf",
      "file_size_bytes": 1024, "status": "uploaded", "rejection_reason": null,
      "submitted_by_partner_id": "client-1", "uploaded_at": "2026-08-18T09:00:00.000Z" },
    "download_url": "https://www.trapyfy.com/api/platform/onboarding/documents/download?applicationId=app-1&documentId=doc-1&token=tok",
    "expires_at": "2026-08-19T10:15:00.000Z" } }
```

`download_url` is time-limited; fetch it promptly. The `document` object mirrors
*List documents*. `blobUrl` is never returned.

## Errors

| Status | code                | Meaning                                                  |
|--------|---------------------|----------------------------------------------------------|
| 404    | resource_not_found  | No partner-visible document exists for this id (covers "not yours" and "unknown" identically). |
