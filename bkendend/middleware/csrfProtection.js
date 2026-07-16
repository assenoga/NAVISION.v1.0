const csrfProtection = (req, res, next) => {
  const method = req.method
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']

  if (safeMethods.includes(method)) {
    return next()
  }

  const contentType = (req.get('content-type') || '').toLowerCase()
  const hasJsonContent = contentType.includes('application/json')
  const hasCustomHeader = req.get('x-requested-with') === 'XMLHttpRequest'

  if (!hasJsonContent && !hasCustomHeader) {
    return res.status(403).json({ error: 'Invalid request origin' })
  }

  next()
}

module.exports = csrfProtection
