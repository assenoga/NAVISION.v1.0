import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import Sidebar from '../components/Sidebar'

const roleOptions = [
  'System Administrator',
  'Procurement Officer',
  'Executive Director',
  'Chief Finance Officer',
  'Managing Director',
  'Finance Officer',
  'Internal Auditor'
]

const positionOptions = [
  'System Administrator',
  'Procurement Officer',
  'Procurement Manager',
  'Executive Director',
  'Chief Finance Officer',
  'Managing Director',
  'Finance Officer',
  'Finance Manager',
  'Internal Auditor',
  'Operations Officer',
  'Department Head',
  'IT Administrator'
]

const accountStatuses = ['Active', 'Inactive', 'Suspended', 'Locked']

const getMemberId = (member) => member?._id || member?.id

const getPositionOptions = (currentPosition = '') => {
  return currentPosition && !positionOptions.includes(currentPosition)
    ? [currentPosition, ...positionOptions]
    : positionOptions
}

const Settings = () => {
  const { user } = useAuthContext()
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRemovingUser, setIsRemovingUser] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState('')
  const [activeTab, setActiveTab] = useState('users')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetType, setResetType] = useState('') // 'password' or 'pin'
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    department: '',
    position: '',
    employeeNumber: '',
    phoneNumber: ''
  })
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [loginHistory, setLoginHistory] = useState([])
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    firstName: '',
    lastName: '',
    role: 'Procurement Officer',
    department: 'Operations',
    employeeNumber: '',
    phoneNumber: '',
    position: '',
    accountStatus: 'Active',
    mustChangePassword: true
  })
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const loadUsers = useCallback(async () => {
    if (!user?.token || user?.role !== 'System Administrator') return

    setIsLoading(true)
    const response = await fetch('/api/user', {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await response.json()

    if (!response.ok) {
      setUsersError(data.error || 'Unable to load users')
      setIsLoading(false)
      return
    }

    setUsers(data)
    setUsersError('')
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const loadAuditLogs = useCallback(async () => {
    if (!user?.token || user?.role !== 'System Administrator') return
    const response = await fetch('/api/user/audit-logs', {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await response.json()
    if (response.ok) {
      setAuditLogs(data)
    }
  }, [user])

  const loadLoginHistory = useCallback(async () => {
    if (!user?.token || user?.role !== 'System Administrator') return
    const response = await fetch('/api/user/login-history', {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await response.json()
    if (response.ok) {
      setLoginHistory(data)
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs()
    }
    if (activeTab === 'history') {
      loadLoginHistory()
    }
  }, [activeTab, loadAuditLogs, loadLoginHistory])

  const filteredUsers = users.filter((member) => {
    const term = searchTerm.toLowerCase()
    const matchesTerm =
      !term ||
      member.fullName?.toLowerCase().includes(term) ||
      member.email?.toLowerCase().includes(term) ||
      member.username?.toLowerCase().includes(term) ||
      member.employeeNumber?.toLowerCase().includes(term) ||
      member.department?.toLowerCase().includes(term) ||
      member.position?.toLowerCase().includes(term)

    const matchesRole = filterRole === 'all' || member.role === filterRole
    const matchesStatus = filterStatus === 'all' || member.accountStatus === filterStatus

    return matchesTerm && matchesRole && matchesStatus
  })

  const handleStatusUpdate = async (userId, status) => {
    if (!userId) {
      setUsersError('Unable to update user status: missing user id')
      return
    }

    setUpdatingStatusId(userId)
    try {
      const response = await fetch(`/api/user/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ status })
      })
      const data = await response.json()

      if (!response.ok) {
        setUsersError(data.error || 'Unable to update user status')
        return
      }

      setUsers((currentUsers) => currentUsers.map((member) => (
        getMemberId(member) === userId ? { ...member, ...(data.user || {}), accountStatus: status } : member
      )))
      setUsersError('')
      await loadUsers()
    } catch (error) {
      setUsersError(error.message || 'Unable to update user status')
    } finally {
      setUpdatingStatusId('')
    }
  }

  const handleExportUsers = () => {
    const header = ['Employee Number', 'Full Name', 'Username', 'Email', 'Role', 'Department', 'Position', 'Status']
    const rows = filteredUsers.map((member) => [
      member.employeeNumber || '',
      member.fullName || '',
      member.username || '',
      member.email || '',
      member.role || '',
      member.department || '',
      member.position || '',
      member.accountStatus || ''
    ])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'navision-users.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Remove this user from the system?')) return

    setIsRemovingUser(true)
    const response = await fetch(`/api/user/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await response.json()

    if (!response.ok) {
      setUsersError(data.error || 'Unable to remove user')
      setIsRemovingUser(false)
      return
    }

    setUsers((currentUsers) => currentUsers.filter((member) => getMemberId(member) !== userId))
    setUsersError('')
    setIsRemovingUser(false)
  }

  const openResetModal = (userId, userName, type) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName)
    setResetType(type)
    setNewValue('')
    setResetError('')
    setResetSuccess('')
    setShowResetModal(true)
  }

  const openEditModal = (member) => {
    setEditingUser(member)
    setEditForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      fullName: member.fullName || '',
      email: member.email || '',
      department: member.department || '',
      position: member.position || '',
      employeeNumber: member.employeeNumber || '',
      phoneNumber: member.phoneNumber || ''
    })
    setEditError('')
    setEditSuccess('')
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess('')

    const employeeNumber = editForm.employeeNumber.trim()
    const duplicateEmployeeNumber = employeeNumber && users.some((member) => (
      member.employeeNumber?.trim() === employeeNumber && getMemberId(member) !== getMemberId(editingUser)
    ))

    if (duplicateEmployeeNumber) {
      setEditError('Employee number is already assigned to another user')
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/user/${getMemberId(editingUser)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ ...editForm, employeeNumber })
      })
      const data = await response.json()

      if (!response.ok) {
        setEditError(data.error || 'Unable to update user')
      } else {
        setEditSuccess('User updated successfully')
        setShowEditModal(false)
        setEditingUser(null)
        await loadUsers()
        setTimeout(() => setEditSuccess(''), 3000)
      }
    } catch (error) {
      setEditError(error.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    const employeeNumber = createForm.employeeNumber.trim()
    const duplicateEmployeeNumber = employeeNumber && users.some((member) => member.employeeNumber?.trim() === employeeNumber)

    if (duplicateEmployeeNumber) {
      setCreateError('Employee number is already assigned to another user')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...createForm,
          employeeNumber,
          mustChangePassword: true,
          fullName: createForm.fullName || `${createForm.firstName} ${createForm.lastName}`.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setCreateError(data.error || 'Unable to create user')
      } else {
        setCreateSuccess(`User ${createForm.fullName} created successfully`)
        setCreateForm({
          username: '',
          email: '',
          password: '',
          fullName: '',
          firstName: '',
          lastName: '',
          role: 'Procurement Officer',
          department: 'Operations',
          employeeNumber: '',
          phoneNumber: '',
          position: '',
          accountStatus: 'Active',
          mustChangePassword: true
        })
        await loadUsers()
      }
    } catch (error) {
      setCreateError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')
    setIsResetting(true)

    try {
      const endpoint = resetType === 'password' ? '/api/user/reset-password' : '/api/user/reset-pin'
      
      // Validate input
      if (resetType === 'password' && newValue.length < 8) {
        setResetError('Password must be at least 8 characters')
        setIsResetting(false)
        return
      }

      if (resetType === 'pin' && (!/^\d{6}$/.test(newValue) || newValue.length !== 6)) {
        setResetError('PIN must be exactly 6 digits')
        setIsResetting(false)
        return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          [resetType === 'password' ? 'newPassword' : 'newPin']: newValue
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setResetError(data.error || `Failed to reset ${resetType}`)
      } else {
        setResetSuccess(data.message)
        setTimeout(() => {
          setShowResetModal(false)
          setNewValue('')
        }, 1500)
      }
    } catch (error) {
      setResetError(error.message)
    } finally {
      setIsResetting(false)
    }
  }

  if (user?.role !== 'System Administrator') {
    return (
      <div className="dashboard-shell admin">
        <Sidebar />
        <main className="dashboard-main">
          <div className="error">Access Denied: Only System Administrators can access this page.</div>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-shell admin">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h2>System Settings</h2>
            <p>Manage users, roles, and system configuration</p>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Roles & Permissions
          </button>
          <button
            className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System Configuration
          </button>
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Login History
          </button>
          <button
            className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Logs
          </button>
        </div>

        {activeTab === 'users' && (
          <section className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>User Management</h3>
                <div className="filters-row">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="all">All Roles</option>
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
                Create User
              </button>
              <button type="button" className="btn-secondary" onClick={handleExportUsers}>
                Export Users
              </button>
            </div>
            {usersError && <div className="error">{usersError}</div>}
            {isLoading ? (
              <p>Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <div className="user-management-table">
                <table>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((member) => {
                      const memberId = getMemberId(member)
                      const isStatusUpdating = updatingStatusId === memberId

                      return (
                      <tr key={memberId}>
                        <td>{member.fullName}</td>
                        <td>{member.email}</td>
                        <td>
                          <span className="readonly-field">{member.role || 'Unassigned'}</span>
                        </td>
                        <td>
                          <span className={`status-badge status-${member.accountStatus?.toLowerCase()}`}>
                            {member.accountStatus || 'Unknown'}
                          </span>
                        </td>
                        <td>{member.department}</td>
                        <td>{member.position}</td>
                        <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={() => openEditModal(member)}
                                title="Edit User"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={() => openResetModal(memberId, member.fullName, 'password')}
                                title="Reset Password"
                              >
                                Reset Password
                              </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => openResetModal(memberId, member.fullName, 'pin')}
                              title="Reset PIN"
                            >
                              Reset PIN
                            </button>
                            {member.accountStatus === 'Active' ? (
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => handleStatusUpdate(memberId, 'Inactive')}
                                disabled={isStatusUpdating}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={() => handleStatusUpdate(memberId, 'Active')}
                                disabled={isStatusUpdating}
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleStatusUpdate(memberId, 'Suspended')}
                              disabled={isStatusUpdating || member.accountStatus === 'Suspended'}
                            >
                              Suspend
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleStatusUpdate(memberId, 'Active')}
                              disabled={isStatusUpdating || member.accountStatus === 'Active'}
                            >
                              Unlock
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleStatusUpdate(memberId, 'Locked')}
                              disabled={isStatusUpdating || member.accountStatus === 'Locked'}
                            >
                              Lock
                            </button>
                            <button
                              type="button"
                              className="btn-danger btn-sm"
                              onClick={() => handleRemoveUser(memberId)}
                              disabled={isRemovingUser}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'roles' && (
          <section className="panel">
            <h3>Roles & Permissions</h3>
            <div className="roles-config">
              <div className="role-card">
                <h4>Procurement Officer</h4>
                <p>Can create and submit purchase requests</p>
                <ul>
                  <li>✓ Create purchase requests</li>
                  <li>✓ Add vendors and items</li>
                  <li>✓ Upload supporting documents</li>
                  <li>✓ Track request status</li>
                </ul>
              </div>

              <div className="role-card">
                <h4>Executive Director</h4>
                <p>First level approval authority</p>
                <ul>
                  <li>✓ Review purchase requests</li>
                  <li>✓ Approve or reject</li>
                  <li>✓ Return for correction</li>
                  <li>✓ View approval timeline</li>
                </ul>
              </div>

              <div className="role-card">
                <h4>Chief Finance Officer</h4>
                <p>Financial approval authority</p>
                <ul>
                  <li>✓ Review financial details</li>
                  <li>✓ Approve or reject (ED approved only)</li>
                  <li>✓ Add financial comments</li>
                  <li>✓ View budget impact</li>
                </ul>
              </div>

              <div className="role-card">
                <h4>Managing Director</h4>
                <p>Final approval authority</p>
                <ul>
                  <li>✓ Final approval (CFO approved only)</li>
                  <li>✓ Generate purchase orders</li>
                  <li>✓ Trigger CBS integration</li>
                  <li>✓ View approval metrics</li>
                </ul>
              </div>

              <div className="role-card">
                <h4>System Administrator</h4>
                <p>Full system control</p>
                <ul>
                  <li>✓ Manage users</li>
                  <li>✓ Assign roles</li>
                  <li>✓ Reset passwords & PINs</li>
                  <li>✓ View audit logs</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'system' && (
          <section className="panel">
            <h3>System Configuration</h3>
            <div className="config-group">
              <h4>Approval Chain Configuration</h4>
              <p>Current workflow: Procurement Officer → ED → CFO → MD</p>
              <button>Configure Workflow</button>
            </div>

            <div className="config-group">
              <h4>System Health</h4>
              <ul>
                <li>Database: <span className="status-ok">Connected</span></li>
                <li>API Server: <span className="status-ok">Running</span></li>
                <li>Authentication: <span className="status-ok">Active</span></li>
              </ul>
            </div>

            <div className="config-group">
              <h4>Backup Management</h4>
              <button>Create Backup</button>
              <button>View Backups</button>
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="panel">
            <h3>Login History</h3>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Method</th>
                    <th>Identifier</th>
                    <th>IP Address</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry, index) => (
                    <tr key={`${entry.userId}-${entry.timestamp}-${index}`}>
                      <td>{entry.fullName || entry.username}</td>
                      <td>{entry.role}</td>
                      <td>{entry.method}</td>
                      <td>{entry.identifier}</td>
                      <td>{entry.ipAddress || '-'}</td>
                      <td>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {loginHistory.length === 0 && (
                    <tr><td colSpan="6">No login history recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="panel">
            <h3>Audit Logs</h3>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Entity</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td>{log.action}</td>
                      <td>{log.actorName}</td>
                      <td>{log.actorRole}</td>
                      <td>{log.entityType}</td>
                      <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="5">No audit logs recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create User</h3>
                <button type="button" className="modal-close" onClick={() => setShowCreateModal(false)}>
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  {createError && <div className="error">{createError}</div>}
                  {createSuccess && <div className="success">{createSuccess}</div>}

                  <div className="form-group">
                    <label htmlFor="create-username">Username</label>
                    <input id="create-username" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-employeeNumber">Employee Number</label>
                    <input id="create-employeeNumber" value={createForm.employeeNumber} onChange={(e) => setCreateForm({ ...createForm, employeeNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-firstName">First Name</label>
                    <input id="create-firstName" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-lastName">Last Name</label>
                    <input id="create-lastName" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-fullName">Full Name</label>
                    <input id="create-fullName" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-email">Email</label>
                    <input id="create-email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-password">Temporary Password</label>
                    <input id="create-password" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-role">Role</label>
                    <select id="create-role" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                      {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-department">Department</label>
                    <input id="create-department" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-phoneNumber">Phone Number</label>
                    <input id="create-phoneNumber" value={createForm.phoneNumber} onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-position">Position</label>
                    <select id="create-position" value={createForm.position} onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}>
                      <option value="">Select Position</option>
                      {getPositionOptions(createForm.position).map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-accountStatus">Account Status</label>
                    <select id="create-accountStatus" value={createForm.accountStatus} onChange={(e) => setCreateForm({ ...createForm, accountStatus: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Locked">Locked</option>
                    </select>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      readOnly
                    />
                    First login password change is required
                  </label>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password/PIN Modal */}
        {showResetModal && (
          <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reset {resetType === 'password' ? 'Password' : 'PIN'}</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowResetModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleResetSubmit}>
                <div className="modal-body">
                  <p>
                    <strong>User:</strong> {selectedUserName}
                  </p>

                  {resetError && <div className="error">{resetError}</div>}
                  {resetSuccess && <div className="success">{resetSuccess}</div>}

                  <div className="form-group">
                    <label htmlFor="newValue">
                      New {resetType === 'password' ? 'Password' : 'PIN'}
                    </label>
                    <input
                      id="newValue"
                      type={resetType === 'pin' ? 'password' : 'password'}
                      placeholder={
                        resetType === 'password'
                          ? 'Enter new password (min 8 characters)'
                          : 'Enter 6-digit PIN'
                      }
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      maxLength={resetType === 'pin' ? 6 : undefined}
                      required
                    />
                  </div>

                  {resetType === 'pin' && (
                    <p className="help-text">PIN must be 6 digits only</p>
                  )}
                  {resetType === 'password' && (
                    <p className="help-text">Password must be at least 8 characters</p>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowResetModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isResetting || !newValue}
                  >
                    {isResetting ? 'Resetting...' : 'Reset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit User</h3>
                <button type="button" className="modal-close" onClick={() => setShowEditModal(false)}>
                  ×
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  {editError && <div className="error">{editError}</div>}
                  {editSuccess && <div className="success">{editSuccess}</div>}

                  <div className="form-group">
                    <label>First Name</label>
                    <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Employee Number</label>
                    <input value={editForm.employeeNumber} onChange={(e) => setEditForm({ ...editForm, employeeNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <select value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}>
                      <option value="">Select Position</option>
                      {getPositionOptions(editForm.position).map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isEditing}>
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Settings
