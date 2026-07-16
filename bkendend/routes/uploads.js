const express = require('express')
const PurchaseRequest = require('../models/purchaseRequestModel')
const Vendor = require('../models/vendorModel')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')

const router = express.Router()
router.use(requireAuth)

const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024

const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'])

router.post('/attachment-to-base64', requireRole('System Administrator', 'Procurement Officer'), async (req, res) => {
  try {
    const { files } = req.body
    const fileList = Array.isArray(files) ? files : [files].filter(Boolean)

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    if (fileList.length > MAX_FILES) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES} files allowed at once` })
    }

    const parsed = fileList.map((raw) => {
      const name = String(raw?.name || '').trim()
      const dataUrl = String(raw?.data || raw?.base64 || raw?.dataUrl || '').trim()
      const type = String(raw?.type || raw?.contentType || '').trim()
      const size = Number(raw?.size || 0)

      if (!name) {
        throw new Error('File name is required')
      }

      const extension = name.split('.').pop()?.toLowerCase()
      if (!extension || !allowedExtensions.has(extension)) {
        throw new Error(`File ${name} must be PDF, DOC, DOCX, XLS, XLSX, JPG, or PNG`)
      }

      if (size > MAX_FILE_SIZE) {
        throw new Error(`File ${name} exceeds 10 MB limit`)
      }

      if (!dataUrl.startsWith('data:')) {
        throw new Error(`File ${name} must be provided as base64 data URL` )
      }

      return { name, dataUrl, type, size }
    })

    res.status(200).json({ attachments: parsed })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { entity } = req.query

    let doc = null

    if (entity === 'vendor') {
      const Vendor = require('../models/vendorModel')
      doc = await Vendor.findByPk(id)
    } else {
      doc = await PurchaseRequest.findByPk(id)
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const attachment = (doc.attachments || [])[0]
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    const base64Data = attachment.dataUrl || attachment.url || ''
    if (!base64Data.startsWith('data:')) {
      return res.status(400).json({ error: 'Attachment data is not available' })
    }

    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid attachment format' })
    }

    const contentType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')

    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.name)}"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
