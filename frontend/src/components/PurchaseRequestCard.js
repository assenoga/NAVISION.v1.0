import { useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import AttachmentViewer from './AttachmentViewer'

const getStatusClass = (status = '') => {
  if (status.includes('Approved')) return 'status-approved'
  if (status.includes('Rejected')) return 'status-rejected'
  if (status.includes('Returned')) return 'status-returned'
  return 'status-pending'
}

const PurchaseRequestCard = ({ request, onUpdated, onDeleted, showActions = false }) => {
  const { updateRequest, deleteRequest, openPaymentLink, isLoading } = usePurchaseRequests()
  const { user } = useAuthContext()
  const [showDetails, setShowDetails] = useState(false)
  const [actionType, setActionType] = useState('')
  const [comment, setComment] = useState('')
  const [paymentError, setPaymentError] = useState('')

  const roleStage = {
    'Executive Director': 'ED',
    'Chief Finance Officer': 'CFO',
    'Managing Director': 'MD'
  }[user?.role]

  const canApprove = showActions && roleStage && request.currentStage === roleStage
  const canPayVendor = user?.role === 'Procurement Officer' &&
    (request.status === 'Approved' || request.status === 'Completed') &&
    request.currentStage === 'Completed' &&
    request.bankPaymentStatus !== 'Paid'

  const handleAction = async (action) => {
    if ((action === 'reject' || action === 'return') && !comment.trim()) {
      alert(action === 'reject' ? 'Please enter a reason for rejection.' : 'Please enter correction instructions.')
      return
    }

    const updated = await updateRequest(request._id, action, comment)
    if (updated) {
      onUpdated?.(updated)
      setActionType('')
      setComment('')
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this purchase request permanently?')
    if (!confirmed) return
    const deleted = await deleteRequest(request._id)
    if (deleted) {
      onDeleted?.(request._id)
    }
  }

  const handleOpenPayment = async () => {
    setPaymentError('')
    const result = await openPaymentLink(request._id)
    if (!result?.paymentUrl) {
      setPaymentError('T24 payment link is not configured or could not be opened.')
      return
    }

    onUpdated?.(result.request)
    window.open(result.paymentUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="workout-details">
      <div className="request-card-head">
        <h4>{request.referenceNo}</h4>
        <span className={`status-badge ${getStatusClass(request.status)}`}>{request.status}</span>
      </div>
      <p><strong>Vendor:</strong> {request.vendorName}</p>
      <p><strong>Department:</strong> {request.department}</p>
      <p><strong>Total Amount:</strong> {request.currency} {request.totalAmount?.toLocaleString()}</p>
      <p><strong>Created:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
      {canPayVendor && (
        <div className="payment-ready-banner">
          <strong>Ready for Payment</strong>
          <span>Final approval is complete. Open T24 to pay this vendor.</span>
        </div>
      )}
      {paymentError && <div className="error">{paymentError}</div>}
      <div className="actions">
        <button type="button" onClick={() => setShowDetails(true)}>View Details</button>
        {canPayVendor && (
          <button type="button" className="btn-primary" onClick={handleOpenPayment} disabled={isLoading}>
            Pay Vendor in T24
          </button>
        )}
        {user?.role === 'System Administrator' && (
          <button type="button" className="secondary danger" onClick={handleDelete} disabled={isLoading}>Delete</button>
        )}
      </div>

      {showDetails && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{request.referenceNo}</h2>
              <button type="button" className="close-btn" onClick={() => setShowDetails(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Vendor</label>
                  <p>{request.vendorName}</p>
                </div>
                <div className="detail-item">
                  <label>Vendor Number</label>
                  <p>{request.vendor?.number || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Contact Person</label>
                  <p>{request.vendor?.contactPerson || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>TIN</label>
                  <p>{request.vendor?.tin || '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Department</label>
                  <p>{request.department}</p>
                </div>
                <div className="detail-item">
                  <label>Required Delivery</label>
                  <p>{request.requiredDeliveryDate ? new Date(request.requiredDeliveryDate).toLocaleDateString() : '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <p><span className={`status-badge ${getStatusClass(request.status)}`}>{request.status}</span></p>
                </div>
                <div className="detail-item">
                  <label>Total Cost</label>
                  <p className="highlight">{request.currency} {request.totalAmount?.toLocaleString()}</p>
                </div>
              </div>

              <div className="items-section">
                <h3>Line Items</h3>
                <div className="table-responsive">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Currency</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.itemName}</td>
                          <td>{item.description || item.itemCategory || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{(item.currency?.code || request.currency)} {item.unitPrice?.toLocaleString()}</td>
                          <td>{item.currency?.code || request.currency}</td>
                          <td>{(item.currency?.code || request.currency)} {item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="attachments-section">
                <h4>Supporting Documents</h4>
                <AttachmentViewer attachments={request.attachments || []} />
              </div>

              {(request.generatedPurchaseOrder || request.approvalCertificate) && (
                <div className="generated-docs">
                  <h4>Generated Documents</h4>
                  <p><strong>Purchase Order:</strong> {request.generatedPurchaseOrder || '-'}</p>
                  <p><strong>Approval Certificate:</strong> {request.approvalCertificate || '-'}</p>
                  <p><strong>CBS Status:</strong> {request.cbsIntegrationStatus || 'Not Triggered'}</p>
                  <p><strong>Bank Payment:</strong> {request.bankPaymentStatus || 'Not Ready'}</p>
                  {canPayVendor && (
                    <button type="button" className="btn-primary" onClick={handleOpenPayment} disabled={isLoading}>
                      Pay Vendor in T24
                    </button>
                  )}
                </div>
              )}

              <div className="approval-history">
                <h4>Approval Timeline</h4>
                {request.history?.length ? (
                  <ul className="history-list">
                    {request.history.map((entry, idx) => (
                      <li key={idx}>
                        <strong>{entry.actorRole}</strong> - {entry.action}
                        <div>{entry.actorName || 'User'}</div>
                        {entry.reason ? <div>Reason: {entry.reason}</div> : null}
                        {entry.comment ? <div>Comment: {entry.comment}</div> : null}
                        <div>{new Date(entry.timestamp || entry.createdAt || Date.now()).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No history yet.</p>
                )}
              </div>

              {canApprove && (
                <div className="approval-section">
                  {!actionType ? (
                    <div className="action-buttons">
                      <button className="btn btn-approve" type="button" onClick={() => handleAction('approve')} disabled={isLoading}>
                        Approve
                      </button>
                      <button className="btn btn-return" type="button" onClick={() => setActionType('return')} disabled={isLoading}>
                        Return for Correction
                      </button>
                      <button className="btn btn-reject" type="button" onClick={() => setActionType('reject')} disabled={isLoading}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label>{actionType === 'reject' ? 'Reason for Rejection' : 'Correction Required'}</label>
                      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="4" required />
                      <div className="action-buttons">
                        <button className="btn btn-primary" type="button" onClick={() => handleAction(actionType)} disabled={isLoading || !comment.trim()}>
                          Confirm
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => { setActionType(''); setComment('') }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseRequestCard
