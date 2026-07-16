require('dotenv').config()

const express = require('express')
const { sequelize, User, ApprovalConfig } = require('./models')
const purchaseRequestRoutes = require('./routes/purchaseRequests')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const vendorRoutes = require('./routes/vendors')
const notificationRoutes = require('./routes/notifications')
const documentRoutes = require('./routes/documents')

const app = express()
const port = process.env.PORT || 4000

app.use(express.json({ limit: '25mb' }))

app.use((req, res, next) => {
  if (!['/api/health'].includes(req.path)) {
    console.log(req.path, req.method)
  }
  next()
})

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: 'connected' })
})

app.use('/api/purchase-requests', purchaseRequestRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/vendors', vendorRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/export', require('./routes/exports'))
app.use('/api/upload', require('./routes/uploads'))

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded files are too large. Each supporting document must be 10 MB or smaller.' })
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  next(error)
})

const startServer = async () => {
  try {
    await sequelize.authenticate()
    console.log('connected to SQL Server')

    await sequelize.sync()
    console.log('database synchronized')

    try {
      await User.ensureDefaultAdmin()
      await User.normalizeLegacyValues()
      await ApprovalConfig.ensureDefaults()
    } catch (seedError) {
      console.log('Default admin seed skipped:', seedError.message)
    }
  } catch (error) {
    console.error('SQL Server connection failed:', error.message)
    process.exit(1)
  }

  app.listen(port, () => {
    console.log('listening on port', port)
  })
}

startServer()
