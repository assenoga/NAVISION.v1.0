const path = require('path')
const fs = require('fs/promises')

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const DOCUMENT_UPLOAD_RELATIVE_DIR = path.join('uploads', 'documents')
const DOCUMENT_UPLOAD_ROOT = path.resolve(__dirname, '..', DOCUMENT_UPLOAD_RELATIVE_DIR)

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'])
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg'
])

const sanitizeBaseName = (name = 'document') => {
  const parsed = path.parse(String(name))
  const base = parsed.name || 'document'
  return base
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 80) || 'document'
}

const sanitizeDocumentName = (name) => {
  return String(name || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 255)
}

const getSafeExtension = (filename = '') => {
  return path.extname(String(filename)).toLowerCase()
}

const validateDocumentFile = (file) => {
  if (!file) {
    const error = new Error('A document file is required')
    error.statusCode = 400
    throw error
  }

  const extension = getSafeExtension(file.originalname)
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only PDF, DOC, DOCX, XLSX, PNG, JPG, and JPEG files are allowed')
    error.statusCode = 400
    throw error
  }
}

const createStoredFilename = (originalName) => {
  const extension = getSafeExtension(originalName)
  const timestamp = Date.now()
  const safeBase = sanitizeBaseName(originalName)
  return `${timestamp}_${safeBase}${extension}`
}

const toRelativeDocumentPath = (storedFilename) => {
  return path.join(DOCUMENT_UPLOAD_RELATIVE_DIR, storedFilename).replace(/\\/g, '/')
}

const resolveDocumentPath = (storedFilename) => {
  const fullPath = path.resolve(DOCUMENT_UPLOAD_ROOT, storedFilename)
  if (!fullPath.startsWith(`${DOCUMENT_UPLOAD_ROOT}${path.sep}`)) {
    const error = new Error('Invalid document path')
    error.statusCode = 400
    throw error
  }
  return fullPath
}

const parsePositiveId = (id) => {
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const parseDocumentId = (id) => {
  const value = String(id || '').trim()
  return /^[1-9]\d*$/.test(value) ? value : null
}

const validateStoredFileSignature = async (file) => {
  const extension = getSafeExtension(file.originalname)
  const handle = await fs.open(file.path, 'r')
  try {
    const buffer = Buffer.alloc(8)
    await handle.read(buffer, 0, 8, 0)

    const isPdf = extension === '.pdf' && buffer.subarray(0, 4).toString() === '%PDF'
    const isPng = extension === '.png' && buffer.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    const isJpeg = ['.jpg', '.jpeg'].includes(extension) && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    const isCompoundOffice = ['.doc', '.xls'].includes(extension) && buffer.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
    const isZipOffice = ['.docx', '.xlsx'].includes(extension) && buffer[0] === 0x50 && buffer[1] === 0x4b

    if (!(isPdf || isPng || isJpeg || isCompoundOffice || isZipOffice)) {
      const error = new Error('The uploaded file content does not match its document type')
      error.statusCode = 400
      throw error
    }
  } finally {
    await handle.close()
  }
}

module.exports = {
  MAX_DOCUMENT_SIZE,
  DOCUMENT_UPLOAD_ROOT,
  allowedExtensions,
  allowedMimeTypes,
  sanitizeDocumentName,
  validateDocumentFile,
  createStoredFilename,
  toRelativeDocumentPath,
  resolveDocumentPath,
  parsePositiveId,
  parseDocumentId,
  validateStoredFileSignature
}
