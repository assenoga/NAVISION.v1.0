const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const requireAuth = async (req, res, next) => {
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header is required' })
  }

  const token = authorization.split(' ')[1]

  try {
    const { _id } = jwt.verify(token, process.env.SECRET)

    req.user = await User.findByPk(_id, {
      attributes: ['id', 'username', 'email', 'fullName', 'role', 'department', 'accountStatus']
    })
    if (!req.user || req.user.accountStatus !== 'Active') {
      return res.status(401).json({ error: 'Account is not active' })
    }
    next()
  } catch (error) {
    console.log(error)
    res.status(401).json({ error: 'Request is not authorized' })
  }
}

module.exports = requireAuth
