const Vendor = require('../models/vendorModel')
const AuditLog = require('../models/auditLogModel')
const { Op } = require('sequelize')
const { isValidId } = require('../models/modelUtils')

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

const getVendors = async (req, res) => {
  try {
    const { search, isActive } = req.query
    const where = {}

    if (search) {
      const term = `%${search}%`
      where[Op.or] = [
        { vendorName: { [Op.like]: term } },
        { vendorNumber: { [Op.like]: term } },
        { tin: { [Op.like]: term } },
        { contactPerson: { [Op.like]: term } }
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const vendors = await Vendor.findAll({ where, order: [['createdAt', 'DESC']] })
    res.status(200).json(vendors)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const createVendor = async (req, res) => {
  const {
    vendorName,
    vendorNumber,
    address,
    phoneNumber,
    email,
    tin,
    contactPerson
  } = req.body

  try {
    if (!vendorName || !vendorNumber) {
      return res.status(400).json({ error: 'Vendor name and vendor number are required' })
    }

    const existing = await Vendor.findOne({
      where: {
        [Op.or]: [
          { vendorNumber: vendorNumber.toUpperCase() },
          { vendorName: { [Op.like]: vendorName } }
        ]
      }
    })

    if (existing) {
      return res.status(400).json({ error: 'A vendor with this name or number already exists' })
    }

    const vendor = await Vendor.create({
      vendorName,
      vendorNumber: vendorNumber.toUpperCase(),
      address,
      phoneNumber,
      email,
      tin,
      contactPerson,
      createdBy: req.user._id
    })

    await logAudit(req, 'CREATE_VENDOR', 'Vendor', vendor._id, { vendorName, vendorNumber })

    res.status(201).json(vendor)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const updateVendor = async (req, res) => {
  const { id } = req.params
  const updates = req.body

  try {
    if (!isValidId(id)) {
      return res.status(404).json({ error: 'Invalid vendor id' })
    }

    if (updates.vendorNumber) {
      updates.vendorNumber = updates.vendorNumber.toUpperCase()
    }

    const vendor = await Vendor.findByPk(id)

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }

    await vendor.update(updates)

    await logAudit(req, 'UPDATE_VENDOR', 'Vendor', vendor._id, { updates: Object.keys(updates) })
    res.status(200).json(vendor)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const deleteVendor = async (req, res) => {
  const { id } = req.params

  try {
    if (!isValidId(id)) {
      return res.status(404).json({ error: 'Invalid vendor id' })
    }

    const vendor = await Vendor.findByPk(id)

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }

    await vendor.destroy()

    await logAudit(req, 'DELETE_VENDOR', 'Vendor', id, { vendorName: vendor.vendorName })
    res.status(200).json({ message: 'Vendor deleted successfully', id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
}
