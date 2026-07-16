const fs = require('fs')
const multer = require('multer')
const {
  DOCUMENT_UPLOAD_ROOT,
  MAX_DOCUMENT_SIZE,
  createStoredFilename,
  validateDocumentFile
} = require('../utils/documentSecurity')

fs.mkdirSync(DOCUMENT_UPLOAD_ROOT, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENT_UPLOAD_ROOT)
  },
  filename: (req, file, cb) => {
    cb(null, createStoredFilename(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  try {
    validateDocumentFile(file)
    cb(null, true)
  } catch (error) {
    cb(error)
  }
}

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1
  }
}).single('document')

module.exports = uploadDocument
