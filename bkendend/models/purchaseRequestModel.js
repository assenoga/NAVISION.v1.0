const sequelize = require('../config/database')
const { DataTypes, idAttributes, makeJsonColumn } = require('./modelUtils')

const STATUSES = [
  'Draft',
  'Submitted',
  'Pending ED Approval',
  'Pending CFO Approval',
  'Pending MD Approval',
  'Approved',
  'Rejected',
  'Rejected by ED',
  'Rejected by CFO',
  'Rejected by MD',
  'Returned for Correction',
  'Completed'
]

const STAGES = ['PO', 'ED', 'CFO', 'MD', 'Completed', 'Rejected']
const CBS_STATUSES = ['Not Triggered', 'Queued', 'Skipped', 'Failed', 'Success']
const PAYMENT_STATUSES = ['Not Ready', 'Ready for Payment', 'Payment Link Opened', 'Paid']

const PurchaseRequest = sequelize.define('PurchaseRequest', {
  ...idAttributes(),
  referenceNo: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vendor: makeJsonColumn('vendor', {}),
  vendorName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  purchaseDescription: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  requestDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  requiredDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  items: makeJsonColumn('items', []),
  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: { min: 0 }
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'UGX',
    set(value) {
      this.setDataValue('currency', String(value || 'UGX').trim().toUpperCase())
    }
  },
  currencyMeta: makeJsonColumn('currencyMeta', { code: 'UGX', name: 'Ugandan Shilling' }),
  status: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'Draft',
    validate: { isIn: [STATUSES] }
  },
  currentStage: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'PO',
    validate: { isIn: [STAGES] }
  },
  attachments: makeJsonColumn('attachments', []),
  generatedPurchaseOrder: {
    type: DataTypes.STRING(160),
    allowNull: false,
    defaultValue: ''
  },
  approvalCertificate: {
    type: DataTypes.STRING(160),
    allowNull: false,
    defaultValue: ''
  },
  cbsIntegrationStatus: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'Not Triggered',
    validate: { isIn: [CBS_STATUSES] }
  },
  bankPaymentStatus: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'Not Ready',
    validate: { isIn: [PAYMENT_STATUSES] }
  },
  bankPaymentUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  paymentInitiatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentInitiatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  history: makeJsonColumn('history', []),
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  rejectedByRole: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  returnReason: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  }
}, {
  tableName: 'PurchaseRequests',
  timestamps: true
})

module.exports = PurchaseRequest
