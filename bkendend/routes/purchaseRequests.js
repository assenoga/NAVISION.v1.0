const express = require('express')
const {
  getPurchaseRequests,
  getAllPurchaseRequests,
  createPurchaseRequest,
  resubmitPurchaseRequest,
  updatePurchaseRequest,
  getBankPaymentLink,
  deletePurchaseRequest
} = require('../controllers/purchaseRequestController')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const csrfProtection = require('../middleware/csrfProtection')

const router = express.Router()
router.use(requireAuth)

router.get('/', getPurchaseRequests)
router.get('/all', requireRole('Executive Director', 'Chief Finance Officer', 'Managing Director', 'System Administrator', 'Finance Officer', 'Internal Auditor'), getAllPurchaseRequests)
router.post('/', csrfProtection, requireRole('Procurement Officer'), createPurchaseRequest)
router.patch('/:id/resubmit', csrfProtection, requireRole('Procurement Officer'), resubmitPurchaseRequest)
router.post('/:id/payment-link', csrfProtection, requireRole('Procurement Officer'), getBankPaymentLink)
router.patch('/:id', csrfProtection, requireRole('Executive Director', 'Chief Finance Officer', 'Managing Director'), updatePurchaseRequest)
router.delete('/:id', csrfProtection, requireRole('System Administrator'), deletePurchaseRequest)

module.exports = router
