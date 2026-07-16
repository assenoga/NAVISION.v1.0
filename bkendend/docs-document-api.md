# Document Management API

## Project Structure

```text
bkendend/
  controllers/documentController.js
  middleware/documentUpload.js
  models/documentModel.js
  routes/documents.js
  uploads/documents/
  utils/documentSecurity.js
```

The module uses the existing MongoDB/Mongoose connection. Files are stored on disk under `bkendend/uploads/documents/`; MongoDB stores only metadata and purchase request attachment references.

## Endpoints

All endpoints require `Authorization: Bearer <jwt>`.

### POST /api/documents

Multipart form fields:

```text
document=<file>
document_name=Invoice April
purchase_id=optional-purchase-request-id
```

Response:

```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": 1,
    "document_name": "Invoice April",
    "original_filename": "invoice.pdf",
    "stored_filename": "1745678435_uuid_invoice.pdf",
    "file_path": "uploads/documents/1745678435_uuid_invoice.pdf",
    "file_size": 582340,
    "file_type": "application/pdf",
    "uploaded_by": "5",
    "purchase_id": null,
    "uploaded_at": "2026-07-13T09:00:00.000Z"
  }
}
```

### GET /api/documents

Returns documents visible to the authenticated user. Elevated roles can see all documents; regular owners see their uploads.

### GET /api/documents/:id

Streams the stored file with `res.sendFile()`. Returns `404` if the database record or physical file is missing.

### PUT /api/documents/:id

Multipart form replacement using the same fields as upload. The old file is deleted and its metadata is recorded in `document_versions`.

### DELETE /api/documents/:id

Deletes the physical file and database row.
