require('dotenv').config()

const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const { sequelize, User } = require('../models')

const newPassword = process.argv[2] || 'Admin@123'

const run = async () => {
  try {
    await sequelize.authenticate()

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: 'admin' }, { email: 'admin@tropicalbank.co.ug' }]
      }
    })

    if (!user) {
      console.error('Admin user not found')
      process.exit(1)
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(newPassword, salt)

    user.password = hash
    user.mustChangePassword = true
    user.temporaryPasswordAssignedAt = new Date()
    await user.save()

    console.log(`Admin password updated for user '${user.username}'. New password: ${newPassword}`)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

run()
