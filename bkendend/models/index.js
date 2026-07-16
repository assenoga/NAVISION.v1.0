const sequelize = require('../config/database')
const User = require('./userModel')
const PurchaseRequest = require('./purchaseRequestModel')
const Vendor = require('./vendorModel')
const Notification = require('./notificationModel')
const { DocumentRecord } = require('./documentModel')
const AuditLog = require('./auditLogModel')
const ApprovalConfig = require('./approvalConfigModel')
const Workout = require('./workoutsmodels')

const fk = { onDelete: 'NO ACTION', onUpdate: 'CASCADE' }

User.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', ...fk })
User.hasMany(User, { as: 'createdUsers', foreignKey: 'createdBy', ...fk })

User.hasMany(PurchaseRequest, { as: 'purchaseRequests', foreignKey: 'createdBy', ...fk })
PurchaseRequest.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', ...fk })
PurchaseRequest.belongsTo(User, { as: 'paymentInitiator', foreignKey: 'paymentInitiatedBy', ...fk })

User.hasMany(Vendor, { as: 'vendors', foreignKey: 'createdBy', ...fk })
Vendor.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', ...fk })

User.hasMany(Notification, { as: 'notifications', foreignKey: 'recipient', ...fk })
Notification.belongsTo(User, { as: 'recipientUser', foreignKey: 'recipient', ...fk })

User.hasMany(DocumentRecord, { as: 'documents', foreignKey: 'uploaded_by', ...fk })
DocumentRecord.belongsTo(User, { as: 'uploader', foreignKey: 'uploaded_by', ...fk })
PurchaseRequest.hasMany(DocumentRecord, { as: 'documents', foreignKey: 'purchase_id', ...fk })
DocumentRecord.belongsTo(PurchaseRequest, { as: 'purchaseRequest', foreignKey: 'purchase_id', ...fk })

User.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'actor', ...fk })
AuditLog.belongsTo(User, { as: 'actorUser', foreignKey: 'actor', ...fk })

User.hasMany(ApprovalConfig, { as: 'approvalDelegations', foreignKey: 'delegateUser', ...fk })
ApprovalConfig.belongsTo(User, { as: 'delegate', foreignKey: 'delegateUser', ...fk })

User.hasMany(Workout, { as: 'workouts', foreignKey: 'user_id', ...fk })
Workout.belongsTo(User, { as: 'user', foreignKey: 'user_id', ...fk })

module.exports = {
  sequelize,
  User,
  PurchaseRequest,
  Vendor,
  Notification,
  DocumentRecord,
  AuditLog,
  ApprovalConfig,
  Workout
}
