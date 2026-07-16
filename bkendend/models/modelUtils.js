const { DataTypes } = require('sequelize')

const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

const makeJsonColumn = (attributeName, fallback) => ({
  type: DataTypes.TEXT,
  allowNull: false,
  defaultValue: JSON.stringify(fallback),
  get() {
    return parseJson(this.getDataValue(attributeName), fallback)
  },
  set(value) {
    this.setDataValue(attributeName, JSON.stringify(value ?? fallback))
  }
})

const idAttributes = () => ({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      const id = this.getDataValue('id')
      return id === null || id === undefined ? null : String(id)
    }
  }
})

const isValidId = (id) => {
  const value = String(id || '').trim()
  return /^[1-9]\d*$/.test(value)
}

const normalizeId = (id) => {
  if (!isValidId(id)) return null
  return Number(id)
}

const toPlain = (record) => (record?.toJSON ? record.toJSON() : record)

module.exports = {
  DataTypes,
  makeJsonColumn,
  idAttributes,
  isValidId,
  normalizeId,
  toPlain
}
