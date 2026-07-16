const bcrypt = require('bcrypt')
const validator = require('validator')
const { Op } = require('sequelize')
const sequelize = require('../config/database')
const { DataTypes, idAttributes, makeJsonColumn } = require('./modelUtils')

const ROLES = [
  'Procurement Officer',
  'Executive Director',
  'Chief Finance Officer',
  'Managing Director',
  'Finance Officer',
  'Internal Auditor',
  'System Administrator'
]

const ACCOUNT_STATUSES = ['Active', 'Inactive', 'Suspended', 'Locked']

const normalizeRoleValue = (role) => {
  if (!role) return role
  const mapping = {
    'procurement officer': 'Procurement Officer',
    'executive director': 'Executive Director',
    'chief finance officer': 'Chief Finance Officer',
    'managing director': 'Managing Director',
    'finance officer': 'Finance Officer',
    'internal auditor': 'Internal Auditor',
    'system administrator': 'System Administrator'
  }
  const normalized = String(role).trim().toLowerCase().replace(/[_-]+/g, ' ')
  return mapping[normalized] || role
}

const normalizeAccountStatusValue = (status) => {
  if (!status) return status
  const mapping = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    locked: 'Locked'
  }
  const normalized = String(status).trim().toLowerCase().replace(/[_-]+/g, ' ')
  return mapping[normalized] || status
}

const normalizeUser = (user) => {
  user.username = String(user.username || '').trim().toLowerCase()
  user.email = String(user.email || '').trim().toLowerCase()
  user.role = normalizeRoleValue(user.role) || 'Procurement Officer'
  user.accountStatus = normalizeAccountStatusValue(user.accountStatus) || 'Active'

  if (!user.fullName) {
    const first = String(user.firstName || '').trim()
    const last = String(user.lastName || '').trim()
    user.fullName = `${first} ${last}`.trim()
  }
}

const User = sequelize.define('User', {
  ...idAttributes(),
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { len: [3, 100] }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  pin: {
    type: DataTypes.STRING(6),
    allowNull: false,
    defaultValue: '000000'
  },
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: ''
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: ''
  },
  role: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'Procurement Officer',
    validate: { isIn: [ROLES] }
  },
  department: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: 'Operations'
  },
  employeeNumber: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  phoneNumber: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  position: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: ''
  },
  accountStatus: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'Active',
    validate: { isIn: [ACCOUNT_STATUSES] }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  temporaryPasswordAssignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginHistory: makeJsonColumn('loginHistory', [])
}, {
  tableName: 'Users',
  timestamps: true,
  hooks: {
    beforeValidate: normalizeUser,
    beforeCreate: normalizeUser,
    beforeUpdate: normalizeUser
  }
})

User.createUser = async function(props) {
  const {
    username,
    email,
    password,
    fullName,
    firstName = '',
    lastName = '',
    role,
    department,
    employeeNumber = '',
    phoneNumber = '',
    position = '',
    accountStatus = 'Active',
    createdBy = null,
    mustChangePassword = true
  } = props || {}

  const normalizedFullName = fullName || `${firstName} ${lastName}`.trim()

  if (!username || !email || !password || !normalizedFullName) {
    throw Error('All fields must be filled')
  }

  const normalizedUsername = username.trim().toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedUsername.length < 3) {
    throw Error('Username must be at least 3 characters')
  }

  if (!validator.isEmail(normalizedEmail)) {
    throw Error('Email is not valid')
  }

  if (!validator.isStrongPassword(password)) {
    throw Error('Password not strong enough')
  }

  const exists = await this.findOne({
    where: {
      [Op.or]: [{ username: normalizedUsername }, { email: normalizedEmail }]
    }
  })

  if (exists) {
    throw Error('Username or email already in use')
  }

  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  return this.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hash,
    fullName: normalizedFullName,
    firstName,
    lastName,
    role,
    department,
    employeeNumber,
    phoneNumber,
    position,
    accountStatus,
    createdBy,
    mustChangePassword,
    temporaryPasswordAssignedAt: mustChangePassword ? new Date() : null
  })
}

User.normalizeLegacyValues = async function() {
  const users = await this.findAll()
  let updatedCount = 0

  for (const user of users) {
    const normalizedRole = normalizeRoleValue(user.role)
    const normalizedStatus = normalizeAccountStatusValue(user.accountStatus)
    const normalizedFullName = user.fullName?.trim() || `${(user.firstName || 'System').trim()} ${(user.lastName || 'Administrator').trim()}`.trim() || (user.username === 'admin' ? 'System Administrator' : user.email || 'User')
    const update = {}

    if (user.role !== normalizedRole) update.role = normalizedRole
    if (user.accountStatus !== normalizedStatus) update.accountStatus = normalizedStatus
    if (user.fullName !== normalizedFullName) update.fullName = normalizedFullName

    if (Object.keys(update).length > 0) {
      await user.update(update)
      updatedCount += 1
    }
  }

  return { updatedCount, totalCount: users.length }
}

User.signup = async function() {
  throw Error('Public registration is disabled. Please contact the system administrator.')
}

User.login = async function(identifier, password) {
  if (!identifier || !password) {
    throw Error('All fields must be filled')
  }

  const normalizedIdentifier = identifier.trim()
  const isEmail = validator.isEmail(normalizedIdentifier)
  let user = null

  if (isEmail) {
    user = await this.findOne({ where: { email: normalizedIdentifier.toLowerCase() } })

    if (!user || normalizeRoleValue(user.role) !== 'System Administrator') {
      throw Error('Only the System Administrator may log in with an email address')
    }
  } else {
    user = await this.findOne({ where: { username: normalizedIdentifier.toLowerCase() } })
  }

  if (!user) {
    throw Error('Incorrect username or password')
  }

  const normalizedStatus = normalizeAccountStatusValue(user.accountStatus || '')
  if (normalizedStatus !== 'Active') {
    throw Error('This account is not active')
  }

  const match = await bcrypt.compare(password, user.password)

  if (!match) {
    throw Error('Incorrect username or password')
  }

  return user
}

User.prototype.recordLogin = async function({ identifier, method, success, ipAddress, userAgent }) {
  const history = [
    ...(this.loginHistory || []),
    {
      identifier,
      method,
      success,
      ipAddress,
      userAgent,
      timestamp: new Date()
    }
  ].slice(-50)

  this.loginHistory = history
  await this.save()
}

User.ensureDefaultAdmin = async function() {
  const existingAdmin = await this.findOne({
    where: {
      [Op.or]: [
        { username: 'admin' },
        { email: 'admin@tropicalbank.co.ug' },
        { role: 'System Administrator' }
      ]
    }
  })

  if (existingAdmin) {
    const normalizedRole = normalizeRoleValue(existingAdmin.role || 'System Administrator')
    const normalizedStatus = normalizeAccountStatusValue(existingAdmin.accountStatus || 'Active')
    const defaultFullName = `${(existingAdmin.firstName || 'System').trim()} ${(existingAdmin.lastName || 'Administrator').trim()}`.trim()
    const normalizedFullName = existingAdmin.fullName?.trim() || defaultFullName
    const updates = {}

    if (existingAdmin.role !== normalizedRole) updates.role = normalizedRole
    if (existingAdmin.accountStatus !== normalizedStatus) updates.accountStatus = normalizedStatus
    if (existingAdmin.fullName !== normalizedFullName) updates.fullName = normalizedFullName

    if (Object.keys(updates).length > 0) {
      await existingAdmin.update(updates)
    }

    return existingAdmin.reload()
  }

  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash('Admin@123', salt)

  return this.create({
    username: 'admin',
    email: 'admin@tropicalbank.co.ug',
    password: hash,
    fullName: 'System Administrator',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'System Administrator',
    department: 'IT',
    position: 'Super Admin',
    accountStatus: 'Active',
    mustChangePassword: false
  })
}

User.normalizeRoleValue = normalizeRoleValue
User.normalizeAccountStatusValue = normalizeAccountStatusValue
User.ROLES = ROLES
User.ACCOUNT_STATUSES = ACCOUNT_STATUSES

module.exports = User
