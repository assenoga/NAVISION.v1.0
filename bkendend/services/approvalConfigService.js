const ApprovalConfig = require('../models/approvalConfigModel')
const User = require('../models/userModel')

const STAGE_BY_ROLE = {
  'Executive Director': 'ED',
  'Chief Finance Officer': 'CFO',
  'Managing Director': 'MD'
}

const ROLE_BY_STAGE = {
  ED: 'Executive Director',
  CFO: 'Chief Finance Officer',
  MD: 'Managing Director'
}

const isDelegateWindowActive = (config, now = new Date()) => {
  if (!config?.delegateUser || !config.isActive) return false
  const from = config.delegateFrom ? new Date(config.delegateFrom) : null
  const to = config.delegateTo ? new Date(config.delegateTo) : null
  if (from && now < from) return false
  if (to && now > to) return false
  return true
}

const getApprovalConfigs = async () => {
  await ApprovalConfig.ensureDefaults()
  return ApprovalConfig.findAll({
    include: [{ model: User, as: 'delegate', attributes: ['id', 'username', 'fullName', 'role', 'email'] }],
    order: [['stage', 'ASC']]
  })
}

const getConfigByStage = async (stage) => {
  await ApprovalConfig.ensureDefaults()
  return ApprovalConfig.findOne({
    where: { stage },
    include: [{ model: User, as: 'delegate', attributes: ['id', 'username', 'fullName', 'role', 'email'] }]
  })
}

const getStagesForUser = async (user) => {
  const stages = new Set()
  const directStage = STAGE_BY_ROLE[user?.role]
  if (directStage) stages.add(directStage)

  const configs = await ApprovalConfig.findAll({ where: { delegateUser: user?._id, isActive: true } })
  configs.forEach((config) => {
    if (isDelegateWindowActive(config)) {
      stages.add(config.stage)
    }
  })

  return [...stages]
}

const resolveApprovalAuthority = async (user, stage) => {
  const config = await getConfigByStage(stage)
  const primaryRole = config?.primaryRole || ROLE_BY_STAGE[stage]

  if (user?.role === primaryRole) {
    return { allowed: true, primaryRole, delegated: false, stage }
  }

  if (
    isDelegateWindowActive(config) &&
    String(config.delegate?._id || config.delegateUser) === String(user?._id)
  ) {
    return { allowed: true, primaryRole, delegated: true, stage }
  }

  return { allowed: false, primaryRole, delegated: false, stage }
}

module.exports = {
  STAGE_BY_ROLE,
  ROLE_BY_STAGE,
  getApprovalConfigs,
  getStagesForUser,
  resolveApprovalAuthority
}
