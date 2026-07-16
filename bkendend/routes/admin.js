const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const { processQueue } = require('../services/cbsIntegrationService')
const { Op } = require('sequelize')

const router = express.Router()
router.use(requireAuth)

// Manual trigger for CBS/Navision integration - System Administrator only
router.post('/process-cbs', requireRole('System Administrator'), async (req, res) => {
  try {
    const result = await processQueue(req.user?._id, 50)
    res.status(200).json({ message: 'CBS processing completed', result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reset default admin password using a one-time token (useful if admin locked out)
// Protect by X-ADMIN-RESET-TOKEN header matching ADMIN_RESET_TOKEN in env
router.post('/reset-default-admin-password', async (req, res) => {
  try {
    const token = req.get('x-admin-reset-token') || ''
    if (!process.env.ADMIN_RESET_TOKEN || token !== process.env.ADMIN_RESET_TOKEN) {
      return res.status(403).json({ error: 'Invalid or missing admin reset token' })
    }

    const newPassword = String(req.body?.newPassword || process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123')
    const User = require('../models/userModel')
    const bcrypt = require('bcrypt')

    const admin = await User.findOne({
      where: {
        [Op.or]: [{ username: 'admin' }, { role: 'System Administrator' }]
      }
    })
    if (!admin) {
      return res.status(404).json({ error: 'No admin user found to reset' })
    }

    const salt = await bcrypt.genSalt(10)
    admin.password = await bcrypt.hash(newPassword, salt)
    admin.mustChangePassword = true
    admin.temporaryPasswordAssignedAt = new Date()
    await admin.save()

    res.status(200).json({ message: 'Default admin password reset successfully', username: admin.username })
  } catch (error) {
    console.error('Admin reset error:', error && error.message)
    res.status(500).json({ error: 'Failed to reset admin password' })
  }
})

module.exports = router

