const sequelize = require('../config/database')
const { DataTypes, idAttributes } = require('./modelUtils')

const Vendor = sequelize.define('Vendor', {
  ...idAttributes(),
  vendorName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    set(value) {
      this.setDataValue('vendorName', String(value || '').trim())
    }
  },
  vendorNumber: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('vendorNumber', String(value || '').trim().toUpperCase())
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  phoneNumber: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: ''
  },
  tin: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  contactPerson: {
    type: DataTypes.STRING(160),
    allowNull: false,
    defaultValue: ''
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Vendors',
  timestamps: true
})

module.exports = Vendor
