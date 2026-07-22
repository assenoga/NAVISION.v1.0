const express = require('express')
const uploadDocumentFile = require('../middleware/documentUpload')
const requireAuth = require('../middleware/requireAuth')
const csrfProtection = require('../middleware/csrfProtection')
const {
  uploadDocument,
  listDocuments,
  downloadDocument,
  replaceDocument,
  deleteDocument,
  getDocumentVersions
} = require('../controllers/documentController')

const router = express.Router()

const upload = (req, res, next) => {
  uploadDocumentFile(req, res, (error) => {
    if (!error) return next()

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Document must be 10 MB or smaller' })
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Only one document can be uploaded at a time' })
    }

    return res.status(error.statusCode || 400).json({ error: error.message || 'Invalid document upload' })
  })
}

router.use(requireAuth)

router.post('/', csrfProtection, upload, uploadDocument)
router.get('/', listDocuments)
router.get('/:id', downloadDocument)
router.get('/:id/versions', getDocumentVersions)
router.put('/:id', csrfProtection, upload, replaceDocument)
router.delete('/:id', csrfProtection, deleteDocument)

module.exports = router
