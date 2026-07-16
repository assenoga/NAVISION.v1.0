const sequelize = require('../config/database')
const { DataTypes, idAttributes } = require('./modelUtils')

const Notification = sequelize.define('Notification', {
  ...idAttributes(),
  recipient: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  recipientRole: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  entityId: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'Notifications',
  timestamps: true
})

module.exports = Notification
