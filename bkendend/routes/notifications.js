const express = require('express')
const Notification = require('../models/notificationModel')
const requireAuth = require('../middleware/requireAuth')
const { Op } = require('sequelize')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { read } = req.query
    const where = {
      [Op.or]: [
        { recipient: req.user._id },
        { recipientRole: req.user.role }
      ]
    }

    if (read !== undefined) {
      where.read = read === 'true'
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100
    })
    res.status(200).json(notifications)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id)
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    notification.read = true
    await notification.save()
    res.status(200).json(notification)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.patch('/mark-all-read', async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      {
        where: {
          [Op.or]: [
            { recipient: req.user._id },
            { recipientRole: req.user.role }
          ],
          read: false
        }
      }
    )
    res.status(200).json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

module.exports = router
