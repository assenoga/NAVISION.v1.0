require('dotenv').config()

const { sequelize } = require('../models')

const verifyMigration = async () => {
  try {
    await sequelize.authenticate()

    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)

    console.log(tables.map((table) => table.TABLE_NAME).join(', '))
  } finally {
    await sequelize.close()
  }
}

verifyMigration().catch((error) => {
  console.error('Verification failed:', error.message)
  process.exit(1)
})
