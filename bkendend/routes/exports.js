const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const csrfProtection = require('../middleware/csrfProtection')
const PurchaseRequest = require('../models/purchaseRequestModel')
const User = require('../models/userModel')
const { Op } = require('sequelize')

const router = express.Router()
router.use(requireAuth)

router.get('/purchase-requests', csrfProtection, requireRole('System Administrator', 'Executive Director', 'Chief Finance Officer', 'Managing Director', 'Finance Officer', 'Internal Auditor', 'Procurement Officer'), async (req, res) => {
  try {
    const user = req.user
    const { status, vendor, department, currency, startDate, endDate, role } = req.query

    let query = {}

    if (user.role === 'Procurement Officer') {
      query.createdBy = user._id
    } else if (user.role === 'Internal Auditor') {
      query.status = { [Op.in]: ['Approved', 'Rejected', 'Returned for Correction'] }
    }

    if (status) {
      query.status = status
    }
    if (vendor) {
      query.vendorName = { [Op.like]: `%${vendor}%` }
    }
    if (department) {
      query.department = { [Op.like]: `%${department}%` }
    }
    if (currency) {
      query.currency = currency
    }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt[Op.gte] = new Date(startDate)
      if (endDate) query.createdAt[Op.lte] = new Date(endDate)
    }

    const requests = await PurchaseRequest.findAll({ where: query, order: [['createdAt', 'DESC']] })

    const headers = {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="purchase-requests-${Date.now()}.csv"`
    }

    const rows = [
      ['Reference No', 'Vendor', 'Department', 'Currency', 'Total Amount', 'Status', 'Created By', 'Created At'].join(',')
    ]

    for (const r of requests) {
      const createdByName = r.createdBy ? String(r.createdBy) : 'System'
      rows.push([
        r.referenceNo,
        `"${(r.vendorName || '').replace(/"/g, '""')}"`,
        `"${(r.department || '').replace(/"/g, '""')}"`,
        r.currency || 'UGX',
        r.totalAmount || 0,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        `"${createdByName.replace(/"/g, '""')}"`,
        new Date(r.createdAt).toISOString()
      ].join(','))
    }

    res.set(headers)
    res.send(rows.join('\n'))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/users', requireRole('System Administrator'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'fullName', 'firstName', 'lastName', 'role', 'department', 'employeeNumber', 'phoneNumber', 'position', 'accountStatus', 'createdAt']
    })

    const headers = {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="users-${Date.now()}.csv"`
    }

    const rows = [
      ['Employee Number', 'Full Name', 'Username', 'Email', 'Role', 'Department', 'Position', 'Status', 'Created At'].join(',')
    ]

    for (const u of users) {
      rows.push([
        (u.employeeNumber || '').replace(/"/g, '""'),
        `"${(u.fullName || '').replace(/"/g, '""')}"`,
        (u.username || '').replace(/"/g, '""'),
        (u.email || '').replace(/"/g, '""'),
        (u.role || '').replace(/"/g, '""'),
        `"${(u.department || '').replace(/"/g, '""')}"`,
        `"${(u.position || '').replace(/"/g, '""')}"`,
        (u.accountStatus || '').replace(/"/g, '""'),
        new Date(u.createdAt).toISOString()
      ].join(','))
    }

    res.set(headers)
    res.send(rows.join('\n'))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
