const sequelize = require('../config/database')
const { DataTypes, idAttributes, makeJsonColumn } = require('./modelUtils')

const AuditLog = sequelize.define('AuditLog', {
  ...idAttributes(),
  actor: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  actorName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'System'
  },
  actorRole: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'System'
  },
  action: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  entityId: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  details: makeJsonColumn('details', {}),
  ipAddress: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  }
}, {
  tableName: 'AuditLogs',
  timestamps: true
})

module.exports = AuditLog
