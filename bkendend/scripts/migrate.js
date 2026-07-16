require('dotenv').config()

const { sequelize, User, ApprovalConfig } = require('../models')

const shouldAlter = process.argv.includes('--alter') || process.env.DB_SYNC_ALTER === 'true'

const migrate = async () => {
  try {
    await sequelize.authenticate()
    console.log(`Connected to SQL Server database ${sequelize.config.database}`)

    await sequelize.sync({ alter: shouldAlter })
    console.log(`Database synchronized${shouldAlter ? ' with alter' : ''}`)

    await User.ensureDefaultAdmin()
    await User.normalizeLegacyValues()
    await ApprovalConfig.ensureDefaults()
    console.log('Default data ensured')
  } finally {
    await sequelize.close()
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})
