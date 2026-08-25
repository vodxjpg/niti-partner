---
title: List documents
section: API Reference / Documents
---
# List documents

<span class="badge get">GET</span> `/api/v1/partner/customers/{customerId}/documents`

> Required scope: `documents:read` (global tier).

Returns evidence **metadata** for the customer. Bytes require the same
`documents:read` scope **and** a separate download call (see *Download a document*).
The `blobUrl` is never returned here. An empty list is a valid answer — it means
the customer has contributed no evidence yet.

## Request

```bash
curl -X GET https://api.niftipay.com/api/v1/partner/customers/pc-1/documents \
  -H "Authorization: Bearer <partner_api_key>"
```

No request body.

## Response `200`

```json
{ "request_id": "req-1", "api_version": "2026-08-01",
  "data": {
    "documents": [
      { "document_id": "doc-1", "document_type": "proof_of_address",
        "file_name": "poa.pdf", "mime_type": "application/pdf",
        "file_size_bytes": 1024, "status": "uploaded",
        "rejection_reason": "Illegible scan", "submitted_by_partner_id": "client-1",
        "uploaded_at": "2026-08-18T09:00:00.000Z" } ] } }
```

| Field                    | Type   | Notes                                            |
|--------------------------|--------|--------------------------------------------------|
| `document_id`            | string |                                                  |
| `document_type`          | string | Enum (see *Download a document* allowed types).   |
| `file_name`              | string |                                                  |
| `mime_type`              | string |                                                  |
| `file_size_bytes`        | number |                                                  |
| `status`                 | string | e.g. `uploaded` \| `rejected`.                   |
| `rejection_reason`       | string\|null | Shared so you know which file to replace.  |
| `submitted_by_partner_id`| string\|null | The contributing partner's client id.       |
| `uploaded_at`            | string | ISO-8601 timestamp.                              |

## Errors

| Status | code                | Meaning                                  |
|--------|---------------------|------------------------------------------|
| 404    | not_found           | Customer is not yours / relationship missing. |
