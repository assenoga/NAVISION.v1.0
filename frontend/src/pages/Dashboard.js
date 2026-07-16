import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import Sidebar from '../components/Sidebar'
import AttachmentViewer from '../components/AttachmentViewer'
import Icon from '../components/Icon'

const roleTheme = {
  'Procurement Officer': 'procurement',
  'Executive Director': 'executive',
  'Chief Finance Officer': 'finance',
  'Managing Director': 'md',
  'System Administrator': 'admin'
}

const approvalStage = {
  'Executive Director': 'ED',
  'Chief Finance Officer': 'CFO',
  'Managing Director': 'MD'
}

const getStatusClass = (status = '') => {
  if (status.includes('Approved') || status.includes('Completed')) return 'status-approved'
  if (status.includes('Rejected')) return 'status-rejected'
  if (status.includes('Returned')) return 'status-returned'
  return 'status-pending'
}

const Dashboard = () => {
  const { user } = useAuthContext()
  const { fetchRequests, openPaymentLink, isLoading } = usePurchaseRequests()
  const [requests, setRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeView, setActiveView] = useState('recent')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    const loadRequests = async () => {
      const data = await fetchRequests()
      setRequests(data)
    }
    loadRequests()
  }, [fetchRequests])

  const filteredRequests = useMemo(() => {
    const term = searchTerm.toLowerCase()
    if (!term) return requests
    return requests.filter((request) => (
      request.referenceNo?.toLowerCase().includes(term) ||
      request.vendorName?.toLowerCase().includes(term) ||
      request.department?.toLowerCase().includes(term) ||
      request.currency?.toLowerCase().includes(term) ||
      request.status?.toLowerCase().includes(term)
    ))
  }, [requests, searchTerm])

  const summary = useMemo(() => {
    const stage = approvalStage[user?.role]
    const pendingMine = stage
      ? requests.filter((request) => request.currentStage === stage).length
      : requests.filter((request) => request.status?.includes('Pending')).length
    const approved = requests.filter((request) => request.status === 'Approved' || request.status === 'Completed').length
    const rejected = requests.filter((request) => request.status?.includes('Rejected')).length
    const returned = requests.filter((request) => request.status === 'Returned for Correction').length
    const pendingValue = requests
      .filter((request) => request.status?.includes('Pending'))
      .reduce((sum, request) => sum + (request.totalAmount || 0), 0)
    const totalValue = requests.reduce((sum, request) => sum + (request.totalAmount || 0), 0)
    const currencyDisplay = [...new Set(requests.map((request) => request.currency || 'UGX'))].length === 1
      ? (requests[0]?.currency || 'UGX')
      : 'Multi'

    return { pendingMine, approved, rejected, returned, pendingValue, totalValue, currencyDisplay }
  }, [requests, user?.role])

  const statusBars = useMemo(() => {
    const total = Math.max(requests.length, 1)
    return [
      { key: 'pending', label: 'Pending', count: requests.filter((request) => request.status?.includes('Pending')).length },
      { key: 'approved', label: 'Approved', count: requests.filter((request) => request.status === 'Approved' || request.status === 'Completed').length },
      { key: 'rejected', label: 'Rejected', count: requests.filter((request) => request.status?.includes('Rejected')).length },
      { key: 'returned', label: 'Returned', count: requests.filter((request) => request.status === 'Returned for Correction').length }
    ].map((item) => ({ ...item, width: `${Math.max(6, (item.count / total) * 100)}%` }))
  }, [requests])

  const quickLink = user?.role === 'Procurement Officer'
    ? '/purchase-requests'
    : ['Executive Director', 'Chief Finance Officer', 'Managing Director'].includes(user?.role)
      ? '/approvals'
      : user?.role === 'System Administrator'
        ? '/settings'
        : '/reports'

  const theme = roleTheme[user?.role] || 'reports'
  const statCards = useMemo(() => [
    {
      key: 'pending',
      value: summary.pendingMine,
      label: approvalStage[user?.role] ? 'Pending My Approval' : 'Pending Requests',
      icon: 'approvals'
    },
    { key: 'approved', value: summary.approved, label: 'Approved', icon: 'shield' },
    { key: 'rejected', value: summary.rejected, label: 'Rejected', icon: 'x' },
    {
      key: 'pendingValue',
      value: `${summary.currencyDisplay} ${summary.pendingValue.toLocaleString()}`,
      label: 'Pending Value',
      icon: 'value'
    }
  ], [summary, user?.role])

  const viewDetails = useMemo(() => ({
    recent: {
      label: 'Recent Activity',
      requests: filteredRequests.slice(0, 5)
    },
    pending: {
      label: approvalStage[user?.role] ? 'Pending My Approval' : 'Pending Requests',
      requests: filteredRequests.filter((request) => (
        approvalStage[user?.role]
          ? request.currentStage === approvalStage[user?.role]
          : request.status?.includes('Pending')
      ))
    },
    approved: {
      label: 'Approved Requests',
      requests: filteredRequests.filter((request) => request.status === 'Approved' || request.status === 'Completed')
    },
    rejected: {
      label: 'Rejected Requests',
      requests: filteredRequests.filter((request) => request.status?.includes('Rejected'))
    },
    returned: {
      label: 'Returned for Correction',
      requests: filteredRequests.filter((request) => request.status === 'Returned for Correction')
    },
    pendingValue: {
      label: 'Pending Value',
      requests: filteredRequests.filter((request) => request.status?.includes('Pending'))
    }
  }), [filteredRequests, user?.role])

  const activeContent = viewDetails[activeView] || viewDetails.recent
  const canPaySelectedRequest = user?.role === 'Procurement Officer' &&
    selectedRequest &&
    (selectedRequest.status === 'Approved' || selectedRequest.status === 'Completed') &&
    selectedRequest.currentStage === 'Completed' &&
    selectedRequest.bankPaymentStatus !== 'Paid'

  const handleOpenT24Payment = async () => {
    if (!selectedRequest) return
    setPaymentError('')
    const result = await openPaymentLink(selectedRequest._id)
    if (!result?.paymentUrl) {
      setPaymentError('T24 payment link is not configured or could not be opened.')
      return
    }

    if (result.request) {
      setSelectedRequest(result.request)
      setRequests((current) => current.map((request) => request._id === result.request._id ? result.request : request))
    }
    window.open(result.paymentUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`dashboard-shell ${theme}`}>
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-kicker">Operational command center</span>
            <h2>{user?.role} Dashboard</h2>
            <p>Welcome, {user?.fullName || user?.username || user?.email}</p>
          </div>
          <div className="dashboard-actions">
            <label className="search-field">
              <Icon name="search" />
              <input
                type="search"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="stats-grid">
          {statCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`stat-card stat-button ${activeView === card.key ? 'active' : ''}`}
              onClick={() => setActiveView(card.key)}
              aria-pressed={activeView === card.key}
            >
              <span className="stat-icon-wrap"><Icon name={card.icon} /></span>
              <span className="stat-copy">
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <h3>{activeContent.label}</h3>
              {activeView !== 'recent' && (
                <button type="button" className="text-button" onClick={() => setActiveView('recent')}>
                  Recent Activity
                </button>
              )}
            </div>
            {isLoading ? (
              <p>Loading...</p>
            ) : activeContent.requests.length === 0 ? (
              <p>No requests found.</p>
            ) : (
              <div className="recent-requests-list">
                {activeContent.requests.map((request) => (
                  <button
                    key={request._id}
                    type="button"
                    className="request-item clickable"
                    onClick={() => {
                      setPaymentError('')
                      setSelectedRequest(request)
                    }}
                  >
                    <div>
                      <strong>{request.referenceNo}</strong>
                      <p>{request.vendorName} - {request.department}</p>
                      <small>{new Date(request.createdAt).toLocaleString()}</small>
                    </div>
                    <div className="request-status">
                      <span className={`status-badge ${getStatusClass(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="request-amount">{request.currency} {request.totalAmount?.toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Link to={quickLink} className="view-all-link"><Icon name="dashboard" /> Open Workspace</Link>
          </section>

          <section className="panel quick-actions">
            <h3>Workflow Snapshot</h3>
            <div className="mini-chart">
              {statusBars.map((bar) => (
                <button
                  key={bar.label}
                  type="button"
                  className={`mini-chart-row mini-chart-button ${activeView === bar.key ? 'active' : ''}`}
                  onClick={() => setActiveView(bar.key)}
                  aria-pressed={activeView === bar.key}
                >
                  <div className="mini-chart-label">
                    <span>{bar.label}</span>
                    <strong>{bar.count}</strong>
                  </div>
                  <div className="mini-chart-track">
                    <div className="mini-chart-bar" style={{ width: bar.width }} />
                  </div>
                </button>
              ))}
            </div>
            <div className="actions-grid">
              {user?.role === 'Procurement Officer' && <>
                <Link to="/purchase-requests" className="action-card"><Icon name="requests" /> Create Request</Link>
                <Link to="/vendors" className="action-card"><Icon name="vendors" /> Manage Vendors</Link>
              </>}
              {['Executive Director', 'Chief Finance Officer', 'Managing Director'].includes(user?.role) && <Link to="/approvals" className="action-card"><Icon name="approvals" /> Approval Queue</Link>}
              <Link to="/reports" className="action-card"><Icon name="reports" /> Reports</Link>
              <Link to="/notifications" className="action-card"><Icon name="bell" /> Notifications</Link>
              {user?.role === 'System Administrator' && <Link to="/settings" className="action-card"><Icon name="settings" /> User Management</Link>}
            </div>
          </section>
        </div>

        {selectedRequest && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedRequest(null)}>
            <div className="modal-content dashboard-request-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedRequest.referenceNo}</h2>
                <button type="button" className="close-btn" onClick={() => setSelectedRequest(null)}>x</button>
              </div>
              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-item"><label>Vendor</label><p>{selectedRequest.vendorName}</p></div>
                  <div className="detail-item"><label>Department</label><p>{selectedRequest.department}</p></div>
                  <div className="detail-item"><label>Status</label><p><span className={`status-badge ${getStatusClass(selectedRequest.status)}`}>{selectedRequest.status}</span></p></div>
                  <div className="detail-item"><label>Total Amount</label><p className="highlight">{selectedRequest.currency} {selectedRequest.totalAmount?.toLocaleString()}</p></div>
                  <div className="detail-item"><label>Vendor Email</label><p>{selectedRequest.vendor?.email || '-'}</p></div>
                  <div className="detail-item"><label>Contact Person</label><p>{selectedRequest.vendor?.contactPerson || '-'}</p></div>
                </div>

                {canPaySelectedRequest && (
                  <div className="payment-ready-banner">
                    <strong>Ready for T24 Payment</strong>
                    <span>Final approval is complete. Open T24 to pay this vendor.</span>
                    <button type="button" className="btn-primary" onClick={handleOpenT24Payment} disabled={isLoading}>
                      Pay Vendor in T24
                    </button>
                  </div>
                )}
                {paymentError && <div className="error">{paymentError}</div>}

                <h3>Line Items</h3>
                <div className="table-responsive">
                  <table className="items-table">
                    <thead>
                      <tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.itemName}</td>
                          <td>{item.description || item.itemCategory || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.currency?.code || selectedRequest.currency} {item.unitPrice?.toLocaleString()}</td>
                          <td>{item.currency?.code || selectedRequest.currency} {item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="attachments-section">
                  <h4>Supporting Documents</h4>
                  <AttachmentViewer attachments={selectedRequest.attachments || []} />
                </div>

                <div className="approval-history">
                  <h4>Approval Timeline</h4>
                  {selectedRequest.history?.length ? (
                    <ul className="history-list">
                      {selectedRequest.history.map((entry, idx) => (
                        <li key={idx}>
                          <strong>{entry.actorRole}</strong> - {entry.action}
                          <p>{entry.actorName || 'User'}</p>
                          {(entry.reason || entry.comment) && <p>{entry.reason || entry.comment}</p>}
                          <span className="timestamp">{new Date(entry.timestamp || entry.createdAt || Date.now()).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p>No approval history yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
