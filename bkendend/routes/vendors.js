const express = require('express')
const {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} = require('../controllers/vendorController')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const csrfProtection = require('../middleware/csrfProtection')

const router = express.Router()
router.use(requireAuth)

router.get('/', requireRole('System Administrator', 'Procurement Officer'), getVendors)
router.post('/', csrfProtection, requireRole('System Administrator', 'Procurement Officer'), createVendor)
router.patch('/:id', csrfProtection, requireRole('System Administrator', 'Procurement Officer'), updateVendor)
router.delete('/:id', csrfProtection, requireRole('System Administrator'), deleteVendor)

module.exports = router
