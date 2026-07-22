const path = require('path')
const sequelize = require('../config/database')
const { DataTypes, idAttributes, makeJsonColumn, isValidId, normalizeId, toPlain } = require('./modelUtils')

const DocumentRecord = sequelize.define('Document', {
  ...idAttributes(),
  name: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('original_filename')
    },
    set(value) {
      const filename = String(value || '').trim()
      this.setDataValue('original_filename', filename)
      if (!this.getDataValue('document_name')) {
        this.setDataValue('document_name', path.parse(filename).name || filename)
      }
    }
  },
  path: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('file_path')
    },
    set(value) {
      this.setDataValue('file_path', String(value || ''))
    }
  },
  size: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('file_size')
    },
    set(value) {
      this.setDataValue('file_size', Number(value) || 0)
    }
  },
  document_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  stored_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  uploaded_by_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: ''
  },
  uploaded_by_role: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  purchase_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_ip: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  versions: makeJsonColumn('versions', [])
}, {
  tableName: 'Documents',
  timestamps: true,
  createdAt: 'uploaded_at',
  updatedAt: 'updated_at'
})

const serialize = (document) => {
  if (!document) return null
  const raw = toPlain(document)
  return {
    id: String(raw._id || raw.id),
    name: raw.name || raw.original_filename,
    path: raw.path || raw.file_path,
    size: raw.size || raw.file_size,
    document_name: raw.document_name,
    original_filename: raw.original_filename,
    stored_filename: raw.stored_filename,
    file_path: raw.file_path,
    file_size: raw.file_size,
    file_type: raw.file_type,
    uploaded_by: String(raw.uploaded_by),
    uploaded_by_name: raw.uploaded_by_name,
    uploaded_by_role: raw.uploaded_by_role,
    purchase_id: raw.purchase_id ? String(raw.purchase_id) : null,
    uploaded_at: raw.uploaded_at,
    updated_at: raw.updated_at
  }
}

const createDocument = async (document) => {
  const created = await DocumentRecord.create({
    ...document,
    uploaded_by: normalizeId(document.uploaded_by),
    purchase_id: document.purchase_id ? normalizeId(document.purchase_id) : null
  })
  return serialize(created)
}

const findDuplicate = async ({ uploaded_by, original_filename, file_size, purchase_id }) => {
  const duplicate = await DocumentRecord.findOne({
    where: {
      uploaded_by: normalizeId(uploaded_by),
      original_filename,
      file_size,
      purchase_id: purchase_id ? normalizeId(purchase_id) : null
    }
  })

  return serialize(duplicate)
}

const findDocumentById = async (id) => {
  if (!isValidId(id)) return null
  return serialize(await DocumentRecord.findByPk(normalizeId(id)))
}

const listDocuments = async ({ purchaseId, role, userId }) => {
  const where = {}

  if (purchaseId) {
    where.purchase_id = normalizeId(purchaseId)
  }

  if (!['System Administrator', 'Managing Director', 'Executive Director', 'Chief Finance Officer', 'Internal Auditor'].includes(role)) {
    where.uploaded_by = normalizeId(userId)
  }

  const documents = await DocumentRecord.findAll({ where, order: [['uploaded_at', 'DESC']] })
  return documents.map(serialize)
}

const replaceDocument = async (id, nextDocument, actor) => {
  if (!isValidId(id)) return null
  const existing = await DocumentRecord.findByPk(normalizeId(id))
  if (!existing) return null

  const previous = serialize(existing)
  const versions = [
    ...(existing.versions || []),
    {
      id: `${Date.now()}-${existing.id}`,
      original_filename: existing.original_filename,
      stored_filename: existing.stored_filename,
      file_path: existing.file_path,
      file_size: existing.file_size,
      file_type: existing.file_type,
      replaced_by: actor.id,
      replaced_by_name: actor.name,
      file_deleted: true,
      replaced_at: new Date()
    }
  ]

  await existing.update({
    versions,
    document_name: nextDocument.document_name,
    original_filename: nextDocument.original_filename,
    stored_filename: nextDocument.stored_filename,
    file_path: nextDocument.file_path,
    file_size: nextDocument.file_size,
    file_type: nextDocument.file_type,
    purchase_id: nextDocument.purchase_id ? normalizeId(nextDocument.purchase_id) : existing.purchase_id || null
  })

  return { previous, current: serialize(existing) }
}

const deleteDocument = async (id) => {
  if (!isValidId(id)) return null
  const document = await DocumentRecord.findByPk(normalizeId(id))
  if (!document) return null
  await document.destroy()
  return serialize(document)
}

const listVersions = async (documentId) => {
  if (!isValidId(documentId)) return []
  const document = await DocumentRecord.findByPk(normalizeId(documentId))
  if (!document) return []

  return (document.versions || [])
    .map((version) => ({
      id: String(version.id),
      document_id: String(document.id),
      original_filename: version.original_filename,
      stored_filename: version.stored_filename,
      file_path: version.file_path,
      file_size: version.file_size,
      file_type: version.file_type,
      replaced_by: version.replaced_by,
      replaced_by_name: version.replaced_by_name,
      file_deleted: version.file_deleted,
      replaced_at: version.replaced_at
    }))
    .sort((a, b) => new Date(b.replaced_at) - new Date(a.replaced_at))
}

const linkDocumentsToPurchase = async ({ documentIds, purchaseId, uploadedBy }) => {
  const validIds = (documentIds || []).filter(isValidId).map(normalizeId)
  if (!validIds.length || !purchaseId) return { modifiedCount: 0 }

  const [modifiedCount] = await DocumentRecord.update(
    { purchase_id: normalizeId(purchaseId) },
    {
      where: {
        id: validIds,
        uploaded_by: normalizeId(uploadedBy)
      }
    }
  )

  return { modifiedCount }
}

module.exports = {
  DocumentRecord,
  createDocument,
  findDuplicate,
  findDocumentById,
  listDocuments,
  replaceDocument,
  deleteDocument,
  listVersions,
  linkDocumentsToPurchase
}
