const fs = require('fs/promises')
const path = require('path')
const AuditLog = require('../models/auditLogModel')
const Document = require('../models/documentModel')
const {
  sanitizeDocumentName,
  toRelativeDocumentPath,
  resolveDocumentPath,
  parsePositiveId,
  parseDocumentId,
  validateStoredFileSignature
} = require('../utils/documentSecurity')

const elevatedReadRoles = new Set([
  'System Administrator',
  'Managing Director',
  'Executive Director',
  'Chief Finance Officer',
  'Internal Auditor'
])

const ownerRoles = new Set(['Procurement Officer', 'User'])

const userId = (user) => String(user?._id || user?.id || '')

const logAudit = async (req, action, entityId, details = {}) => {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: req.user?.fullName || req.user?.email || 'System',
      actorRole: req.user?.role || 'System',
      action,
      entityType: 'Document',
      entityId: String(entityId || ''),
      details,
      ipAddress: req.ip || ''
    })
  } catch (error) {
    console.log('Document audit log skipped:', error.message)
  }
}

const removeUploadedFile = async (file) => {
  if (!file?.filename) return
  try {
    await fs.unlink(resolveDocumentPath(file.filename))
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log('Uploaded document cleanup skipped:', error.message)
    }
  }
}

const removeStoredFile = async (storedFilename) => {
  try {
    await fs.unlink(resolveDocumentPath(storedFilename))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

const canReadDocument = (user, document) => {
  if (!user || !document) return false
  if (elevatedReadRoles.has(user.role)) return true
  return String(document.uploaded_by) === userId(user)
}

const canWriteDocument = (user, document = null) => {
  if (!user) return false
  if (user.role === 'System Administrator') return true
  if (!ownerRoles.has(user.role)) return false
  return !document || String(document.uploaded_by) === userId(user)
}

const normalizeDocumentPayload = (req) => {
  const originalFilename = path.basename(req.file.originalname)
  const documentName = sanitizeDocumentName(req.body.document_name || req.body.documentName || path.parse(originalFilename).name)
  const rawPurchaseId = req.body.purchase_id || req.body.purchaseId || ''
  const purchaseId = rawPurchaseId ? parsePositiveId(rawPurchaseId) : null

  if (!documentName) {
    const error = new Error('Document name is required')
    error.statusCode = 400
    throw error
  }

  if (rawPurchaseId && !purchaseId) {
    const error = new Error('purchase_id must be a valid positive id')
    error.statusCode = 400
    throw error
  }

  return {
    name: originalFilename,
    path: toRelativeDocumentPath(req.file.filename),
    size: req.file.size,
    document_name: documentName,
    original_filename: originalFilename,
    stored_filename: req.file.filename,
    file_path: toRelativeDocumentPath(req.file.filename),
    file_size: req.file.size,
    file_type: req.file.mimetype,
    uploaded_by: userId(req.user),
    uploaded_by_name: req.user?.fullName || req.user?.email || '',
    uploaded_by_role: req.user?.role || '',
    purchase_id: purchaseId,
    created_ip: req.ip || ''
  }
}

const handleControllerError = async (req, res, error) => {
  await removeUploadedFile(req.file)
  const isDatabaseError = String(error?.name || '').startsWith('Sequelize')
  const status = error.statusCode || (isDatabaseError ? 400 : 500)
  if (status >= 500) {
    console.error('Document upload failed:', error)
  }
  res.status(status).json({
    error: status >= 500 ? 'Document operation failed. Please try again later.' : error.message
  })
}

const uploadDocument = async (req, res) => {
  try {
    if (!canWriteDocument(req.user)) {
      await removeUploadedFile(req.file)
      return res.status(403).json({ error: 'You do not have permission to upload documents' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A document file is required' })
    }

    await validateStoredFileSignature(req.file)
    const payload = normalizeDocumentPayload(req)
    const duplicate = await Document.findDuplicate({
      uploaded_by: payload.uploaded_by,
      original_filename: payload.original_filename,
      file_size: payload.file_size,
      purchase_id: payload.purchase_id
    })

    if (duplicate) {
      await removeUploadedFile(req.file)
      return res.status(409).json({
        error: 'This document appears to have already been uploaded',
        document: duplicate
      })
    }

    const document = await Document.createDocument(payload)
    await logAudit(req, 'UPLOAD_DOCUMENT', document.id, {
      documentName: document.document_name,
      storedFilename: document.stored_filename,
      fileSize: document.file_size,
      purchaseId: document.purchase_id
    })

    res.status(201).json({
      message: 'Document uploaded successfully',
      ...document,
      document
    })
  } catch (error) {
    await handleControllerError(req, res, error)
  }
}

const listDocuments = async (req, res) => {
  try {
    const documents = await Document.listDocuments({
      purchaseId: sanitizeDocumentName(req.query.purchase_id || req.query.purchaseId || ''),
      role: req.user?.role,
      userId: userId(req.user)
    })

    res.status(200).json({ documents })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ error: status >= 500 ? 'Unable to load documents' : error.message })
  }
}

const downloadDocument = async (req, res) => {
  const id = parseDocumentId(req.params.id)
  if (!id) {
    return res.status(404).json({ error: 'Invalid document id' })
  }

  try {
    const document = await Document.findDocumentById(id)
    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (!canReadDocument(req.user, document)) {
      return res.status(403).json({ error: 'You do not have permission to access this document' })
    }

    const fullPath = resolveDocumentPath(document.stored_filename)
    try {
      await fs.access(fullPath)
    } catch (error) {
      return res.status(404).json({ error: 'The document file no longer exists on the server' })
    }

    await logAudit(req, 'DOWNLOAD_DOCUMENT', document.id, {
      documentName: document.document_name,
      storedFilename: document.stored_filename
    })

    res.setHeader('Content-Type', document.file_type)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.original_filename)}"`)
    res.sendFile(fullPath)
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ error: status >= 500 ? 'Unable to download document' : error.message })
  }
}

const replaceDocument = async (req, res) => {
  const id = parseDocumentId(req.params.id)
  if (!id) {
    await removeUploadedFile(req.file)
    return res.status(404).json({ error: 'Invalid document id' })
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A replacement document file is required' })
    }

    await validateStoredFileSignature(req.file)
    const existing = await Document.findDocumentById(id)
    if (!existing) {
      await removeUploadedFile(req.file)
      return res.status(404).json({ error: 'Document not found' })
    }

    if (!canWriteDocument(req.user, existing)) {
      await removeUploadedFile(req.file)
      return res.status(403).json({ error: 'You do not have permission to replace this document' })
    }

    const nextPayload = normalizeDocumentPayload(req)
    const result = await Document.replaceDocument(id, nextPayload, {
      id: userId(req.user),
      name: req.user?.fullName || req.user?.email || ''
    })

    if (!result) {
      await removeUploadedFile(req.file)
      return res.status(404).json({ error: 'Document not found' })
    }

    const oldFileDeleted = await removeStoredFile(result.previous.stored_filename)
    await logAudit(req, 'REPLACE_DOCUMENT', id, {
      previousStoredFilename: result.previous.stored_filename,
      storedFilename: result.current.stored_filename,
      oldFileDeleted
    })

    res.status(200).json({
      message: 'Document replaced successfully',
      oldFileDeleted,
      document: result.current
    })
  } catch (error) {
    await handleControllerError(req, res, error)
  }
}

const deleteDocument = async (req, res) => {
  const id = parseDocumentId(req.params.id)
  if (!id) {
    return res.status(404).json({ error: 'Invalid document id' })
  }

  try {
    const existing = await Document.findDocumentById(id)
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (!canWriteDocument(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to delete this document' })
    }

    const fileDeleted = await removeStoredFile(existing.stored_filename)
    const deleted = await Document.deleteDocument(id)

    await logAudit(req, 'DELETE_DOCUMENT', id, {
      documentName: existing.document_name,
      storedFilename: existing.stored_filename,
      fileDeleted
    })

    res.status(200).json({
      message: 'Document deleted successfully',
      fileDeleted,
      document: deleted
    })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ error: status >= 500 ? 'Unable to delete document' : error.message })
  }
}

const getDocumentVersions = async (req, res) => {
  const id = parseDocumentId(req.params.id)
  if (!id) {
    return res.status(404).json({ error: 'Invalid document id' })
  }

  try {
    const document = await Document.findDocumentById(id)
    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (!canReadDocument(req.user, document)) {
      return res.status(403).json({ error: 'You do not have permission to access this document history' })
    }

    const versions = await Document.listVersions(id)
    res.status(200).json({ versions })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ error: status >= 500 ? 'Unable to load document history' : error.message })
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  replaceDocument,
  deleteDocument,
  getDocumentVersions
}
