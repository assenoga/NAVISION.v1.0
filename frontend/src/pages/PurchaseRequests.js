import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import PurchaseRequestCard from '../components/PurchaseRequestCard'
import PurchaseRequestForm from '../components/PurchaseRequestForm'
import Sidebar from '../components/Sidebar'
import Icon from '../components/Icon'

const PurchaseRequests = () => {
  const { user } = useAuthContext()
  const { fetchRequests, isLoading, error } = usePurchaseRequests()
  const [requests, setRequests] = useState([])
  const [filters, setFilters] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [success, setSuccess] = useState('')

  const loadRequests = useCallback(async () => {
    const data = await fetchRequests()
    setRequests(data)
  }, [fetchRequests])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const filteredRequests = useMemo(() => {
    let filtered = requests
    
    if (filters !== 'all') {
      filtered = filtered.filter((request) => request.status === filters)
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((request) => {
        return (
          request.vendorName?.toLowerCase().includes(term) ||
          request.department?.toLowerCase().includes(term) ||
          request.referenceNo?.toLowerCase().includes(term) ||
          request.items?.some((item) => item.itemName?.toLowerCase().includes(term))
        )
      })
    }
    
    return filtered
  }, [filters, requests, searchTerm])

  const handleCreated = (created) => {
    setRequests((prevRequests) => [created, ...prevRequests])
    setSuccess('Purchase request created successfully.')
    setTimeout(() => setSuccess(''), 4000)
  }

  const handleUpdated = (updated) => {
    setRequests((prevRequests) => prevRequests.map((request) => request._id === updated._id ? updated : request))
    setSuccess('Purchase request updated successfully.')
    setTimeout(() => setSuccess(''), 4000)
  }

  const summary = useMemo(() => {
    const totalValue = requests.reduce((sum, request) => sum + (request.totalAmount || 0), 0)
    const pending = requests.filter((request) => request.status?.includes('Pending')).length
    const approved = requests.filter((request) => request.status === 'Approved' || request.status === 'Completed').length
    const rejected = requests.filter((request) => request.status?.includes('Rejected')).length
    const currencies = [...new Set(requests.map((r) => r.currency || 'UGX'))]
    const currencyDisplay = currencies.length === 1 ? currencies[0] : 'Multi'
    return { totalValue, pending, approved, rejected, currencyDisplay }
  }, [requests])

  const theme = user?.role === 'Procurement Officer' ? 'procurement' : 'default'

  return (
    <div className={`dashboard-shell ${theme}`}>
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-kicker">Procurement workspace</span>
            <h2>Purchase Requests</h2>
            <p>Manage and track procurement requests</p>
          </div>
          <div className="dashboard-actions">
            <select value={filters} onChange={(e) => setFilters(e.target.value)}>
              <option value="all">All Requests</option>
              <option value="Pending ED Approval">Pending ED Approval</option>
              <option value="Pending CFO Approval">Pending CFO Approval</option>
              <option value="Pending MD Approval">Pending MD Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Returned for Correction">Returned for Correction</option>
            </select>
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon-wrap"><Icon name="approvals" /></span>
            <span className="stat-copy"><strong>{summary.pending}</strong><span>Pending</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-icon-wrap"><Icon name="shield" /></span>
            <span className="stat-copy"><strong>{summary.approved}</strong><span>Approved</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-icon-wrap"><Icon name="x" /></span>
            <span className="stat-copy"><strong>{summary.rejected}</strong><span>Rejected</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-icon-wrap"><Icon name="value" /></span>
            <span className="stat-copy"><strong>{summary.currencyDisplay} {summary.totalValue.toLocaleString()}</strong><span>Total Value</span></span>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {isLoading && <p>Loading purchase requests...</p>}
        {user?.role === 'System Administrator' && (
          <div className="success" style={{ marginTop: 0 }}>
            System Administrators can view and delete purchase requests here. Creation remains reserved for Procurement Officers.
          </div>
        )}

        <div className="dashboard-grid">
          <section className="panel">
            <h3>Request List</h3>
              {success && <div className="success">{success}</div>}
              {filteredRequests.length === 0 ? (
                <p>No requests found for this view.</p>
              ) : (
                filteredRequests.map((request) => (
                  <PurchaseRequestCard
                    key={request._id}
                    request={request}
                    onUpdated={handleUpdated}
                    onDeleted={(deletedId) => {
                      setRequests((prevRequests) => prevRequests.filter((r) => r._id !== deletedId))
                      setSuccess('Purchase request deleted successfully.')
                      setTimeout(() => setSuccess(''), 4000)
                    }}
                    showActions={user?.role !== 'Procurement Officer'}
                  />
                ))
              )}
            </section>
            {user?.role === 'Procurement Officer' && (
              <section className="panel">
                <PurchaseRequestForm onCreated={handleCreated} />
              </section>
            )}
        </div>
      </main>
    </div>
  )
}

export default PurchaseRequests
