const { Sequelize } = require('sequelize')

const parseServer = (server) => {
  const raw = String(server || '(localdb)\\MSSQLLocalDB').trim()
  const [serverName, instanceName] = raw.split('\\')

  if (instanceName) {
    return {
      host: serverName.toLowerCase() === '(localdb)' ? 'localhost' : serverName,
      instanceName
    }
  }

  return {
    host: raw,
    instanceName: process.env.DB_INSTANCE || undefined
  }
}

const { host, instanceName } = parseServer(process.env.DB_SERVER)
const trustedConnection = process.env.DB_TRUSTED_CONNECTION === 'true' || (!process.env.DB_USERNAME && !process.env.DB_PASSWORD)

const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'MERNAPP',
  trustedConnection ? '' : process.env.DB_USERNAME || '',
  trustedConnection ? '' : process.env.DB_PASSWORD || '',
  {
    dialect: 'mssql',
    host,
    dialectOptions: {
      options: {
        instanceName,
        trustedConnection,
        trustServerCertificate: true,
        encrypt: false
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.SQL_LOGGING === 'true' ? console.log : false
  }
)

module.exports = sequelize
