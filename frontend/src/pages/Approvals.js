import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import Sidebar from '../components/Sidebar'
import AttachmentViewer from '../components/AttachmentViewer'
import Icon from '../components/Icon'
import '../styles/approvals.css'

const stageByRole = {
  'Executive Director': 'ED',
  'Chief Finance Officer': 'CFO',
  'Managing Director': 'MD'
}

const titleByRole = {
  'Executive Director': 'Executive Director Approval Queue',
  'Chief Finance Officer': 'Chief Finance Officer Approval Queue',
  'Managing Director': 'Managing Director Final Approval Queue'
}

const Approvals = () => {
  const { user } = useAuthContext()
  const { fetchRequests, updateRequest, isLoading, error } = usePurchaseRequests()
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionType, setActionType] = useState('')
  const [comment, setComment] = useState('')
  const [financialComments, setFinancialComments] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    status: 'pending',
    department: '',
    vendor: '',
    currency: '',
    date: ''
  })

  const loadRequests = useCallback(async () => {
    const data = await fetchRequests()
    setRequests(data)
  }, [fetchRequests])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const stage = stageByRole[user?.role]

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (filters.status === 'pending' && request.currentStage !== stage) return false
      if (filters.status === 'approved' && !request.history?.some((h) => h.actorRole === user?.role && h.decision === 'approve')) return false
      if (filters.status === 'rejected' && !request.history?.some((h) => h.actorRole === user?.role && h.decision === 'reject')) return false
      if (filters.status === 'returned' && !request.history?.some((h) => h.actorRole === user?.role && h.decision === 'return')) return false
      if (filters.department && request.department !== filters.department) return false
      if (filters.vendor && request.vendorName !== filters.vendor) return false
      if (filters.currency && request.currency !== filters.currency) return false
      if (filters.date && new Date(request.createdAt).toISOString().slice(0, 10) !== filters.date) return false

      const term = filters.search.toLowerCase()
      if (!term) return true
      return (
        request.referenceNo?.toLowerCase().includes(term) ||
        request.vendorName?.toLowerCase().includes(term) ||
        request.department?.toLowerCase().includes(term) ||
        request.items?.some((item) => item.itemName?.toLowerCase().includes(term))
      )
    })
  }, [requests, filters, stage, user?.role])

  const summary = useMemo(() => {
    const pending = requests.filter((request) => request.currentStage === stage).length
    const approved = requests.filter((request) => request.history?.some((h) => h.actorRole === user?.role && h.decision === 'approve')).length
    const rejected = requests.filter((request) => request.history?.some((h) => h.actorRole === user?.role && h.decision === 'reject')).length
    const returned = requests.filter((request) => request.history?.some((h) => h.actorRole === user?.role && h.decision === 'return')).length
    const totalValue = requests
      .filter((request) => request.currentStage === stage)
      .reduce((sum, request) => sum + (request.totalAmount || 0), 0)
    const currencyDisplay = [...new Set(requests.map((request) => request.currency || 'UGX'))].length === 1
      ? (requests[0]?.currency || 'UGX')
      : 'Multi'
    return { pending, approved, rejected, returned, totalValue, currencyDisplay }
  }, [requests, stage, user?.role])

  const unique = (field) => [...new Set(requests.map((request) => request[field]).filter(Boolean))]

  const openDetails = (request) => {
    setSelectedRequest(request)
    setActionType('')
    setComment('')
    setFinancialComments('')
    setAdditionalComments('')
  }

  const closeDetails = () => {
    setSelectedRequest(null)
    setActionType('')
    setComment('')
    setFinancialComments('')
    setAdditionalComments('')
  }

  const handleAction = async (action) => {
    if ((action === 'reject' || action === 'return') && !comment.trim()) {
      setValidationError(action === 'reject' ? 'Reason for rejection is required.' : 'Correction required is mandatory.')
      return
    }

    setValidationError('')
    setSubmitting(true)
    const result = await updateRequest(selectedRequest._id, action, comment, financialComments, additionalComments)
    setSubmitting(false)

    if (result) {
      setRequests((current) => current.map((request) => request._id === result._id ? result : request))
      closeDetails()
    }
  }

  const theme = user?.role === 'Executive Director' ? 'executive' : user?.role === 'Chief Finance Officer' ? 'finance' : 'md'

  return (
    <div className={`dashboard-shell ${theme}`}>
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-kicker">Approval control room</span>
            <h2>{titleByRole[user?.role]}</h2>
            <p>Only requests assigned to your approval stage appear here.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="approvals" /></span><span className="stat-copy"><strong>{summary.pending}</strong><span>Pending Approvals</span></span></div>
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="shield" /></span><span className="stat-copy"><strong>{summary.approved}</strong><span>Approved Requests</span></span></div>
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="x" /></span><span className="stat-copy"><strong>{summary.rejected}</strong><span>Rejected Requests</span></span></div>
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="requests" /></span><span className="stat-copy"><strong>{summary.returned}</strong><span>Returned for Correction</span></span></div>
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="value" /></span><span className="stat-copy"><strong>{summary.currencyDisplay} {summary.totalValue.toLocaleString()}</strong><span>Total Pending Value</span></span></div>
          <div className="stat-card"><span className="stat-icon-wrap"><Icon name="reports" /></span><span className="stat-copy"><strong>{new Date().toLocaleString('default', { month: 'short' })}</strong><span>Monthly Approval Statistics</span></span></div>
        </div>

        <section className="panel">
          <div className="filters-row approval-filters">
            <input placeholder="Search requests..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="pending">Pending My Approval</option>
              <option value="approved">Approved By Me</option>
              <option value="rejected">Rejected By Me</option>
              <option value="returned">Returned By Me</option>
              <option value="all">All Visible</option>
            </select>
            <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
              <option value="">All Departments</option>
              {unique('department').map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.vendor} onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}>
              <option value="">All Vendors</option>
              {unique('vendorName').map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.currency} onChange={(e) => setFilters({ ...filters, currency: e.target.value })}>
              <option value="">All Currencies</option>
              {unique('currency').map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          </div>

          {error && <div className="error">{error}</div>}
          {isLoading && <p>Loading approval requests...</p>}

          <div className="table-responsive">
            <table className="approval-table">
              <thead>
                <tr>
                  <th>Reference No</th>
                  <th>Vendor</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="ref-no">{request.referenceNo}</td>
                    <td>{request.vendorName}</td>
                    <td>{request.department}</td>
                    <td>{request.currency} {request.totalAmount?.toLocaleString()}</td>
                    <td><span className={`status-badge status-${request.status?.toLowerCase().replace(/\s+/g, '-')}`}>{request.status}</span></td>
                    <td className="reason-cell">{request.rejectionReason || request.returnReason || '-'}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn-details" onClick={() => openDetails(request)}>View Details</button></td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr><td colSpan="8">No requests to display.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRequest && (
          <div className="modal-overlay" onClick={closeDetails}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedRequest.referenceNo}</h2>
                <button className="close-btn" onClick={closeDetails}>x</button>
              </div>
              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-item"><label>Vendor</label><p>{selectedRequest.vendorName}</p></div>
                  <div className="detail-item"><label>Department</label><p>{selectedRequest.department}</p></div>
                  <div className="detail-item"><label>Currency</label><p>{selectedRequest.currency}</p></div>
                  <div className="detail-item"><label>Total Amount</label><p className="highlight">{selectedRequest.currency} {selectedRequest.totalAmount?.toLocaleString()}</p></div>
                  <div className="detail-item"><label>Vendor Email</label><p>{selectedRequest.vendor?.email || '-'}</p></div>
                  <div className="detail-item"><label>Contact Person</label><p>{selectedRequest.vendor?.contactPerson || '-'}</p></div>
                </div>

                <h3>Line Items</h3>
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

                <div className="attachments-section">
                  <h4>Supporting Documents</h4>
                  <AttachmentViewer attachments={selectedRequest.attachments || []} />
                </div>

                <div className="approval-history">
                  <h3>Approval Timeline</h3>
                  {selectedRequest.history?.length ? (
                    <ul className="history-list">
                      {selectedRequest.history.map((entry, idx) => (
                        <li key={idx}>
                          <strong>{entry.actorRole}</strong> - {entry.action}
                          <p>{entry.actorName || 'User'}</p>
                          {(entry.reason || entry.comment) && <p>{entry.reason || entry.comment}</p>}
                          <span className="timestamp">{new Date(entry.timestamp || Date.now()).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p>No approval history yet.</p>}
                </div>

                {selectedRequest.currentStage === stage && (
                  <div className="action-section">
                    {validationError && <div className="error">{validationError}</div>}
                    {!actionType ? (
                      <div className="action-buttons">
                        <button className="btn-approve" onClick={() => handleAction('approve')} disabled={submitting}>Approve</button>
                        <button className="btn-return" onClick={() => setActionType('return')} disabled={submitting}>Return for Correction</button>
                        <button className="btn-reject" onClick={() => setActionType('reject')} disabled={submitting}>Reject</button>
                      </div>
                    ) : (
                      <div className="comment-section">
                        <h3>{actionType === 'reject' ? 'Reject Request' : 'Return for Correction'}</h3>
                        <label>{actionType === 'reject' ? 'Reason for Rejection' : 'Correction Required'}</label>
                        <textarea className="comment-input" value={comment} onChange={(e) => setComment(e.target.value)} rows="4" required />
                        {user?.role === 'Chief Finance Officer' && actionType === 'reject' && (
                          <>
                            <label>Financial Comments</label>
                            <textarea className="comment-input" value={financialComments} onChange={(e) => setFinancialComments(e.target.value)} rows="3" />
                          </>
                        )}
                        {user?.role === 'Managing Director' && actionType === 'reject' && (
                          <>
                            <label>Additional Comments</label>
                            <textarea className="comment-input" value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} rows="3" />
                          </>
                        )}
                        <div className="action-buttons">
                          <button className="btn-confirm" onClick={() => handleAction(actionType)} disabled={submitting || !comment.trim()}>
                            {submitting ? 'Processing...' : 'Confirm'}
                          </button>
                          <button className="btn-cancel" onClick={() => setActionType('')} disabled={submitting}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Approvals
