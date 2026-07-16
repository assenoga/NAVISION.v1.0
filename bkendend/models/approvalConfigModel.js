const sequelize = require('../config/database')
const { DataTypes, idAttributes } = require('./modelUtils')

const STAGES = ['ED', 'CFO', 'MD']
const PRIMARY_ROLES = ['Executive Director', 'Chief Finance Officer', 'Managing Director']

const ApprovalConfig = sequelize.define('ApprovalConfig', {
  ...idAttributes(),
  stage: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: { isIn: [STAGES] }
  },
  primaryRole: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: { isIn: [PRIMARY_ROLES] }
  },
  delegateUser: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  delegateFrom: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delegateTo: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  }
}, {
  tableName: 'ApprovalConfigs',
  timestamps: true
})

ApprovalConfig.ensureDefaults = async function() {
  const defaults = [
    { stage: 'ED', primaryRole: 'Executive Director' },
    { stage: 'CFO', primaryRole: 'Chief Finance Officer' },
    { stage: 'MD', primaryRole: 'Managing Director' }
  ]

  for (const config of defaults) {
    await this.findOrCreate({
      where: { stage: config.stage },
      defaults: config
    })
  }
}

module.exports = ApprovalConfig
