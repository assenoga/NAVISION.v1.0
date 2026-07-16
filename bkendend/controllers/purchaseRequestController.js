const PurchaseRequest = require('../models/purchaseRequestModel')
const AuditLog = require('../models/auditLogModel')
const Notification = require('../models/notificationModel')
const Document = require('../models/documentModel')
const { Op } = require('sequelize')
const { isValidId } = require('../models/modelUtils')

const CURRENCIES = [
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' }
]

const BANK_PAYMENT_URL = process.env.T24_PAYMENT_URL || process.env.BANK_PAYMENT_URL || process.env.NAVISION_PAYMENT_URL || process.env.NAVISION_API_URL || ''

const APPROVAL_STAGE_BY_ROLE = {
  'Executive Director': 'ED',
  'Chief Finance Officer': 'CFO',
  'Managing Director': 'MD'
}

const ROLE_LABEL = {
  'Executive Director': 'ED',
  'Chief Finance Officer': 'CFO',
  'Managing Director': 'MD'
}

const allowedAttachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
const maxAttachmentSize = 10 * 1024 * 1024

const logAudit = async (req, action, entityType, entityId, details = {}) => {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: req.user?.fullName || req.user?.email || 'System',
      actorRole: req.user?.role || 'System',
      action,
      entityType,
      entityId: String(entityId || ''),
      details,
      ipAddress: req.ip || ''
    })
  } catch (error) {
    console.log('Audit log skipped:', error.message)
  }
}

const createReferenceNo = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const count = await PurchaseRequest.count({
    where: { createdAt: { [Op.gte]: new Date(year, 0, 1) } }
  })
  const sequence = String(count + 1).padStart(5, '0')
  return `NAV-${year}-${sequence}`
}

const normalizeCurrency = (currency) => {
  const code = String(currency || 'UGX').trim().toUpperCase()
  const match = CURRENCIES.find((item) => item.code === code)
  return match || { code, name: code }
}

const normalizeAttachments = (attachments = []) => {
  return attachments.map((attachment) => {
    const raw = typeof attachment === 'string' ? attachment : (attachment?.url || attachment?.dataUrl || attachment?.path || '')
    const normalized = {
      name: typeof attachment === 'string' ? attachment : (attachment.name || attachment.fileName || 'Document'),
      url: raw,
      documentId: typeof attachment === 'string' ? '' : (attachment.documentId || attachment.id || ''),
      storedFilename: typeof attachment === 'string' ? '' : (attachment.storedFilename || attachment.stored_filename || ''),
      filePath: typeof attachment === 'string' ? '' : (attachment.filePath || attachment.file_path || ''),
      type: typeof attachment === 'string' ? '' : (attachment.type || ''),
      size: typeof attachment === 'string' ? 0 : (Number(attachment.size) || 0)
    }

    const fullName = normalized.name
    const extension = fullName.split('.').pop()?.toLowerCase()
    if (!fullName || !allowedAttachmentExtensions.includes(extension)) {
      throw Error(`Attachment ${fullName || 'file'} must be PDF, DOC, DOCX, XLS, XLSX, JPG, or PNG`)
    }

    if (normalized.size > maxAttachmentSize) {
      throw Error(`Attachment ${fullName} exceeds the 10 MB limit`)
    }

    return normalized
  })
}

const linkRequestDocuments = async (attachments, requestId, userId) => {
  const documentIds = (attachments || [])
    .map((attachment) => attachment.documentId)
    .filter(Boolean)

  if (!documentIds.length) return

  try {
    await Document.linkDocumentsToPurchase({
      documentIds,
      purchaseId: requestId,
      uploadedBy: userId
    })
  } catch (error) {
    console.log('Document purchase link skipped:', error.message)
  }
}

const buildBankPaymentUrl = (request) => {
  if (!BANK_PAYMENT_URL) {
    return ''
  }

  try {
    const url = new URL(BANK_PAYMENT_URL)
    url.searchParams.set('referenceNo', request.referenceNo)
    url.searchParams.set('requestId', String(request._id))
    url.searchParams.set('vendorName', request.vendorName || '')
    url.searchParams.set('amount', String(request.totalAmount || 0))
    url.searchParams.set('currency', request.currency || 'UGX')
    return url.toString()
  } catch (error) {
    const separator = BANK_PAYMENT_URL.includes('?') ? '&' : '?'
    return `${BANK_PAYMENT_URL}${separator}referenceNo=${encodeURIComponent(request.referenceNo)}&requestId=${encodeURIComponent(String(request._id))}`
  }
}

const buildItems = (items, requestCurrency) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw Error('At least one purchase item is required')
  }

  return items.map((item) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)

    if (!item.itemName || quantity < 1 || unitPrice < 0) {
      throw Error('Each item requires a name, quantity of at least 1, and a valid unit price')
    }

    const itemCurrency = normalizeCurrency(item.currency || requestCurrency.code)
    const lineTotal = quantity * unitPrice

    return {
      itemName: item.itemName,
      description: item.description || '',
      itemCategory: item.itemCategory || '',
      unitOfMeasure: item.unitOfMeasure || '',
      quantity,
      unitPrice,
      currency: itemCurrency,
      lineTotal
    }
  })
}

const scopedQueryForRole = (user) => {
  if (user.role === 'System Administrator' || user.role === 'Internal Auditor') {
    return {}
  }

  if (user.role === 'Procurement Officer') {
    return { createdBy: user._id }
  }

  if (user.role === 'Executive Director') {
    return { [Op.or]: [{ currentStage: 'ED' }, { history: { [Op.like]: '%"actorRole":"Executive Director"%' } }] }
  }

  if (user.role === 'Chief Finance Officer') {
    return { [Op.or]: [{ currentStage: 'CFO' }, { history: { [Op.like]: '%"actorRole":"Chief Finance Officer"%' } }] }
  }

  if (user.role === 'Managing Director') {
    return { [Op.or]: [{ currentStage: 'MD' }, { history: { [Op.like]: '%"actorRole":"Managing Director"%' } }] }
  }

  if (user.role === 'Finance Officer') {
    return { status: { [Op.in]: ['Approved', 'Completed'] } }
  }

  return { id: null }
}

const getPurchaseRequests = async (req, res) => {
  try {
    const requests = await PurchaseRequest.findAll({
      where: scopedQueryForRole(req.user),
      order: [['createdAt', 'DESC']]
    })
    res.status(200).json(requests)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getAllPurchaseRequests = async (req, res) => {
  return getPurchaseRequests(req, res)
}

const createPurchaseRequest = async (req, res) => {
  const {
    vendor,
    vendorName,
    vendorNumber,
    vendorAddress,
    vendorPhoneNumber,
    vendorEmail,
    vendorTin,
    vendorContactPerson,
    department,
    purchaseDescription,
    requiredDeliveryDate,
    remarks,
    items,
    attachments,
    currency
  } = req.body

  if (req.user.role !== 'Procurement Officer') {
    return res.status(403).json({ error: 'Only Procurement Officers can create purchase requests' })
  }

  const finalVendor = {
    name: vendor?.name || vendorName,
    number: vendor?.number || vendorNumber || '',
    address: vendor?.address || vendorAddress || '',
    phoneNumber: vendor?.phoneNumber || vendorPhoneNumber || '',
    email: vendor?.email || vendorEmail || '',
    tin: vendor?.tin || vendorTin || '',
    contactPerson: vendor?.contactPerson || vendorContactPerson || ''
  }

  if (!finalVendor.name || !department || !purchaseDescription || !requiredDeliveryDate) {
    return res.status(400).json({ error: 'Vendor, department, purchase description, and required delivery date are required' })
  }

  try {
    const currencyMeta = normalizeCurrency(currency)
    const computedItems = buildItems(items, currencyMeta)
    const totalAmount = computedItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const normalizedAttachments = normalizeAttachments(attachments || [])

    const request = await PurchaseRequest.create({
      referenceNo: await createReferenceNo(),
      createdBy: req.user._id,
      vendor: finalVendor,
      vendorName: finalVendor.name,
      department,
      purchaseDescription,
      requiredDeliveryDate: new Date(requiredDeliveryDate),
      remarks,
      items: computedItems,
      totalAmount,
      currency: currencyMeta.code,
      currencyMeta,
      status: 'Pending ED Approval',
      currentStage: 'ED',
      attachments: normalizedAttachments,
      history: [{
        action: 'Submitted',
        actor: req.user._id,
        actorName: req.user.fullName || req.user.email,
        actorRole: req.user.role || 'Procurement Officer',
        decision: 'submitted',
        comment: 'Purchase request submitted for ED approval',
        timestamp: new Date()
      }]
    })

    await Notification.create({
      recipientRole: 'Executive Director',
      title: 'Purchase request pending ED approval',
      message: `${request.referenceNo} from ${request.department} is ready for review.`,
      entityType: 'PurchaseRequest',
      entityId: request._id
    })
    await linkRequestDocuments(normalizedAttachments, request._id, req.user._id)
    await logAudit(req, 'CREATE_PURCHASE_REQUEST', 'PurchaseRequest', request._id, { referenceNo: request.referenceNo, totalAmount, currency: currencyMeta.code })

    res.status(201).json(request)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const resubmitPurchaseRequest = async (req, res) => {
  const { id } = req.params

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Invalid purchase request id' })
  }

  try {
    const request = await PurchaseRequest.findByPk(id)
    if (!request) {
      return res.status(404).json({ error: 'Purchase request not found' })
    }

    if (String(request.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only resubmit your own requests' })
    }

    if (!['Returned for Correction', 'Rejected by ED', 'Rejected by CFO', 'Rejected by MD', 'Rejected'].includes(request.status)) {
      return res.status(400).json({ error: 'Only returned or rejected requests can be resubmitted' })
    }

    const currencyMeta = normalizeCurrency(req.body.currency || request.currency)
    const nextItems = req.body.items ? buildItems(req.body.items, currencyMeta) : request.items
    const totalAmount = nextItems.reduce((sum, item) => sum + item.lineTotal, 0)

    request.vendor = {
      ...request.vendor,
      ...(req.body.vendor || {}),
      name: req.body.vendor?.name || req.body.vendorName || request.vendorName
    }
    request.vendorName = request.vendor.name
    request.department = req.body.department || request.department
    request.purchaseDescription = req.body.purchaseDescription || request.purchaseDescription
    request.requiredDeliveryDate = req.body.requiredDeliveryDate ? new Date(req.body.requiredDeliveryDate) : request.requiredDeliveryDate
    request.remarks = req.body.remarks || request.remarks
    request.items = nextItems
    request.totalAmount = totalAmount
    request.currency = currencyMeta.code
    request.currencyMeta = currencyMeta
    request.attachments = req.body.attachments ? normalizeAttachments(req.body.attachments) : request.attachments
    request.status = 'Pending ED Approval'
    request.currentStage = 'ED'
    request.rejectionReason = ''
    request.returnReason = ''
    request.rejectedByRole = ''
    request.history = [...(request.history || []), {
      action: 'Resubmitted',
      actor: req.user._id,
      actorName: req.user.fullName || req.user.email,
      actorRole: req.user.role,
      decision: 'submitted',
      comment: req.body.comment || 'Corrected request resubmitted for approval',
      timestamp: new Date()
    }]

    await request.save()
    await linkRequestDocuments(request.attachments, request._id, req.user._id)
    await logAudit(req, 'RESUBMIT_PURCHASE_REQUEST', 'PurchaseRequest', request._id, { referenceNo: request.referenceNo })
    res.status(200).json(request)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const updatePurchaseRequest = async (req, res) => {
  const { id } = req.params
  const { action, comment, financialComments, additionalComments } = req.body

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Invalid purchase request id' })
  }

  if (!action) {
    return res.status(400).json({ error: 'Action is required' })
  }

  try {
    const request = await PurchaseRequest.findByPk(id)
    if (!request) {
      return res.status(404).json({ error: 'Purchase request not found' })
    }

    const role = req.user.role || 'Approver'
    const expectedStage = APPROVAL_STAGE_BY_ROLE[role]

    if (!expectedStage || request.currentStage !== expectedStage) {
      return res.status(400).json({ error: 'You cannot act on this request at the current approval stage' })
    }

    if (String(request.createdBy) === String(req.user._id)) {
      return res.status(403).json({ error: 'You cannot approve your own request' })
    }

    let nextStatus = request.status
    let nextStage = request.currentStage
    let actionLabel = ''
    let notificationRole = ''

    if (action === 'approve') {
      actionLabel = 'Approved'

      if (role === 'Executive Director') {
        nextStatus = 'Pending CFO Approval'
        nextStage = 'CFO'
        notificationRole = 'Chief Finance Officer'
      } else if (role === 'Chief Finance Officer') {
        nextStatus = 'Pending MD Approval'
        nextStage = 'MD'
        notificationRole = 'Managing Director'
      } else if (role === 'Managing Director') {
        nextStatus = 'Approved'
        nextStage = 'Completed'
        request.generatedPurchaseOrder = `PO-${request.referenceNo}`
        request.approvalCertificate = `CERT-${request.referenceNo}`
        request.cbsIntegrationStatus = 'Queued'
        request.bankPaymentStatus = 'Ready for Payment'
        request.bankPaymentUrl = buildBankPaymentUrl(request)
        notificationRole = 'Procurement Officer'
      }
    } else if (action === 'reject') {
      const reason = String(comment || '').trim()
      if (!reason) {
        return res.status(400).json({ error: 'A reason for rejection is required' })
      }
      actionLabel = 'Rejected'
      nextStatus = `Rejected by ${ROLE_LABEL[role]}`
      nextStage = 'Rejected'
      request.rejectionReason = reason
      request.rejectedByRole = role
      notificationRole = 'Procurement Officer'
    } else if (action === 'return') {
      const reason = String(comment || '').trim()
      if (!reason) {
        return res.status(400).json({ error: 'A correction reason is required' })
      }
      actionLabel = 'Returned for Correction'
      nextStatus = 'Returned for Correction'
      nextStage = 'PO'
      request.returnReason = reason
      notificationRole = 'Procurement Officer'
    } else {
      return res.status(400).json({ error: 'Unsupported action' })
    }

    request.status = nextStatus
    request.currentStage = nextStage
    request.comments = [comment, financialComments, additionalComments].filter(Boolean).join('\n')
    request.history = [...(request.history || []), {
      action: actionLabel,
      actor: req.user._id,
      actorName: req.user.fullName || req.user.email,
      actorRole: role,
      decision: action,
      comment: request.comments,
      reason: action === 'reject' ? request.rejectionReason : action === 'return' ? request.returnReason : '',
      timestamp: new Date()
    }]

    await request.save()

    await Notification.create({
      recipient: action === 'reject' || action === 'return' || (action === 'approve' && role === 'Managing Director') ? request.createdBy : null,
      recipientRole: notificationRole,
      title: `${request.referenceNo} ${actionLabel}`,
      message: action === 'approve' && role === 'Managing Director'
        ? `${request.referenceNo} is fully approved and ready for vendor payment in T24.`
        : action === 'approve'
        ? `${role} approved ${request.referenceNo}.`
        : `${role} ${action === 'reject' ? 'rejected' : 'returned'} ${request.referenceNo}: ${comment}`,
      entityType: 'PurchaseRequest',
      entityId: request._id
    })
    await logAudit(req, `PURCHASE_REQUEST_${action.toUpperCase()}`, 'PurchaseRequest', request._id, { referenceNo: request.referenceNo, status: nextStatus })

    res.status(200).json(request)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const getBankPaymentLink = async (req, res) => {
  const { id } = req.params

  if (req.user?.role !== 'Procurement Officer') {
    return res.status(403).json({ error: 'Only Procurement Officers can open vendor payment links' })
  }

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Invalid purchase request id' })
  }

  try {
    const request = await PurchaseRequest.findByPk(id)
    if (!request) {
      return res.status(404).json({ error: 'Purchase request not found' })
    }

    if (String(request.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only pay vendors for your own requests' })
    }

    if (!(request.status === 'Approved' || request.status === 'Completed') || request.currentStage !== 'Completed') {
      return res.status(400).json({ error: 'This request is not fully approved for payment yet' })
    }

    const paymentUrl = request.bankPaymentUrl || buildBankPaymentUrl(request)
    if (!paymentUrl) {
      return res.status(400).json({ error: 'T24 payment URL is not configured. Set T24_PAYMENT_URL on the backend.' })
    }

    request.bankPaymentStatus = 'Payment Link Opened'
    request.bankPaymentUrl = paymentUrl
    request.paymentInitiatedAt = new Date()
    request.paymentInitiatedBy = req.user._id
    request.history = [...(request.history || []), {
      action: 'T24 Payment Link Opened',
      actor: req.user._id,
      actorName: req.user.fullName || req.user.email,
      actorRole: req.user.role,
      decision: 'payment-link-opened',
      comment: 'Procurement Officer opened the T24 payment link',
      timestamp: new Date()
    }]
    await request.save()

    await logAudit(req, 'OPEN_T24_PAYMENT_LINK', 'PurchaseRequest', request._id, {
      referenceNo: request.referenceNo,
      bankPaymentStatus: request.bankPaymentStatus
    })

    res.status(200).json({ paymentUrl, request })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const deletePurchaseRequest = async (req, res) => {
  const { id } = req.params

  if (req.user?.role !== 'System Administrator') {
    return res.status(403).json({ error: 'Only system administrators can delete purchase requests' })
  }

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Invalid purchase request id' })
  }

  try {
    const deleted = await PurchaseRequest.findByPk(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Purchase request not found' })
    }
    await deleted.destroy()
    await logAudit(req, 'DELETE_PURCHASE_REQUEST', 'PurchaseRequest', id, { referenceNo: deleted.referenceNo })
    res.status(200).json({ message: 'Purchase request deleted successfully', id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

module.exports = {
  CURRENCIES,
  getPurchaseRequests,
  getAllPurchaseRequests,
  createPurchaseRequest,
  resubmitPurchaseRequest,
  updatePurchaseRequest,
  getBankPaymentLink,
  deletePurchaseRequest
}
