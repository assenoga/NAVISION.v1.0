const express = require('express');

//controller functions
const { loginUser, signupUser, createUser, updateUser, editUser, updateUserStatus, unlockUser, getUsers, deleteUser, resetPassword, resetPin, changePassword, normalizeLegacyValues, getAuditLogs, getLoginHistory } = require('../controllers/userController')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const csrfProtection = require('../middleware/csrfProtection')

const router = express.Router()

//login route
router.post('/login', loginUser)

//admin-only user management
router.post('/signup', csrfProtection, requireAuth, requireRole('System Administrator'), signupUser)
router.post('/create', csrfProtection, requireAuth, requireRole('System Administrator'), createUser)
router.post('/normalize-legacy-values', csrfProtection, requireAuth, requireRole('System Administrator'), normalizeLegacyValues)
router.post('/change-password', csrfProtection, requireAuth, changePassword)
router.get('/', requireAuth, requireRole('System Administrator'), getUsers)
router.get('/audit-logs', requireAuth, requireRole('System Administrator'), getAuditLogs)
router.get('/login-history', requireAuth, requireRole('System Administrator'), getLoginHistory)
router.patch('/:id', csrfProtection, requireAuth, requireRole('System Administrator'), updateUser)
router.patch('/:id/status', csrfProtection, requireAuth, requireRole('System Administrator'), updateUserStatus)
router.post('/:id/unlock', csrfProtection, requireAuth, requireRole('System Administrator'), unlockUser)
router.delete('/:id', csrfProtection, requireAuth, requireRole('System Administrator'), deleteUser)
router.post('/reset-password', csrfProtection, requireAuth, requireRole('System Administrator'), resetPassword)
router.post('/reset-pin', csrfProtection, requireAuth, requireRole('System Administrator'), resetPin)

module.exports = router
