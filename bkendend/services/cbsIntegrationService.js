const http = require('http')
const https = require('https')
const { URL } = require('url')
const PurchaseRequest = require('../models/purchaseRequestModel')
const AuditLog = require('../models/auditLogModel')
const Notification = require('../models/notificationModel')

const NAVISION_API_URL = process.env.NAVISION_API_URL || ''
const NAVISION_API_KEY = process.env.NAVISION_API_KEY || ''

const sendJson = (targetUrl, payload) => {
  return new Promise((resolve, reject) => {
    if (!targetUrl) return reject(new Error('No Navision API URL configured'))

    const urlObj = new URL(targetUrl)
    const data = JSON.stringify(payload)

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }

    // If API key provided, attach as header
    if (NAVISION_API_KEY) {
      options.headers['Authorization'] = `Bearer ${NAVISION_API_KEY}`
    }

    const lib = urlObj.protocol === 'https:' ? https : http

    const req = lib.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        const statusCode = res.statusCode || 0
        if (statusCode >= 200 && statusCode < 300) {
          resolve({ statusCode, body })
        } else {
          reject(new Error(`Navision API returned status ${statusCode}: ${body}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.write(data)
    req.end()
  })
}

const buildNavisionPayload = (request) => {
  return {
    referenceNo: request.referenceNo,
    vendor: request.vendor,
    vendorName: request.vendorName,
    department: request.department,
    totalAmount: request.totalAmount,
    currency: request.currency,
    items: request.items.map(i => ({
      name: i.itemName,
      description: i.description,
      quantity: i.quantity,
      unitOfMeasure: i.unitOfMeasure,
      unitPrice: i.unitPrice,
      currency: i.currency.code,
      lineTotal: i.lineTotal
    })),
    requestedBy: request.createdBy,
    requestId: request._id
  }
}

const processSingle = async (request, actorId = null) => {
  try {
    if (!NAVISION_API_URL) {
      // No integration configured, mark as Skipped
      request.cbsIntegrationStatus = 'Skipped'
      request.history = [...(request.history || []), {
        action: 'CBS Integration Skipped',
        actor: actorId,
        actorName: 'System',
        actorRole: 'System',
        decision: 'skipped',
        comment: 'Navision API URL not configured',
        timestamp: new Date()
      }]
      await request.save()
      await AuditLog.create({ action: 'CBS_INTEGRATION_SKIPPED', actor: actorId || null, actorRole: 'System', entityType: 'PurchaseRequest', entityId: String(request._id), details: { reason: 'No NAVISION_API_URL configured' } })
      return
    }

    const payload = buildNavisionPayload(request)
    await sendJson(NAVISION_API_URL, payload)

    request.cbsIntegrationStatus = 'Success'
    request.history = [...(request.history || []), {
      action: 'CBS Integration Sent',
      actor: actorId,
      actorName: 'System',
      actorRole: 'System',
      decision: 'sent',
      comment: 'Sent to Navision/CBS',
      timestamp: new Date()
    }]
    await request.save()

    // notify Finance Officer that integration was queued/sent
    await Notification.create({
      recipientRole: 'Finance Officer',
      title: `CBS Integration Sent: ${request.referenceNo}`,
      message: `Purchase request ${request.referenceNo} was pushed to Navision/CBS.`,
      entityType: 'PurchaseRequest',
      entityId: request._id
    })

    await AuditLog.create({ action: 'CBS_INTEGRATION_SENT', actor: actorId || null, actorRole: 'System', entityType: 'PurchaseRequest', entityId: String(request._id), details: { referenceNo: request.referenceNo } })
  } catch (error) {
    request.cbsIntegrationStatus = 'Failed'
    request.history = [...(request.history || []), {
      action: 'CBS Integration Failed',
      actor: actorId,
      actorName: 'System',
      actorRole: 'System',
      decision: 'failed',
      comment: error.message,
      timestamp: new Date()
    }]
    await request.save()
    await AuditLog.create({ action: 'CBS_INTEGRATION_FAILED', actor: actorId || null, actorRole: 'System', entityType: 'PurchaseRequest', entityId: String(request._id), details: { error: error.message } })
  }
}

const processQueue = async (actorId = null, limit = 10) => {
  try {
    const queued = await PurchaseRequest.findAll({
      where: { cbsIntegrationStatus: 'Queued' },
      limit
    })
    if (!queued || queued.length === 0) return { processed: 0 }

    let processed = 0
    for (const req of queued) {
      // attempt processing each
      // set a transient flag to avoid concurrent processing collisions
      try {
        await processSingle(req, actorId)
      } catch (err) {
        // continue to next
        console.log('Error processing request', req.referenceNo, err.message)
      }
      processed += 1
    }

    return { processed }
  } catch (error) {
    console.log('CBS processQueue error:', error.message)
    return { processed: 0, error: error.message }
  }
}

module.exports = { processQueue, processSingle }
