import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import Sidebar from '../components/Sidebar'
import Icon from '../components/Icon'

const Reports = () => {
  const { fetchRequests, isLoading, error } = usePurchaseRequests()
  const [requests, setRequests] = useState([])
  const [reportType, setReportType] = useState('summary')
  const [dateRange, setDateRange] = useState('all')
  const [exporting, setExporting] = useState(false)

  const loadRequests = useCallback(async () => {
    const data = await fetchRequests()
    setRequests(data)
  }, [fetchRequests])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const reportData = useMemo(() => {
    const filtered = requests.filter((r) => {
      if (dateRange === 'all') return true
      const createdAt = new Date(r.createdAt)
      const now = new Date()
      if (dateRange === '30') {
        return createdAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      }
      if (dateRange === '90') {
        return createdAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
      }
      return true
    })

    const totalValue = filtered.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    const totalRequests = filtered.length
    const approved = filtered.filter((r) => String(r.status).toLowerCase().includes('approved')).length
    const pending = filtered.filter((r) => String(r.status).toLowerCase().includes('pending')).length
    const rejected = filtered.filter((r) => String(r.status).toLowerCase().includes('rejected')).length

    const byVendor = {}
    requests.forEach((r) => {
      const vendor = r.vendorName || 'Unknown'
      byVendor[vendor] = (byVendor[vendor] || 0) + (r.totalAmount || 0)
    })

    const byCategory = {}
    filtered.forEach((r) => {
      const category = r.items?.[0]?.itemCategory || 'Other'
      byCategory[category] = (byCategory[category] || 0) + 1
    })

    const currencies = [...new Set(filtered.map((r) => r.currency || 'UGX'))]
    const currency = currencies.length === 1 ? currencies[0] : 'Multi'

    return {
      currency,
      totalValue,
      totalRequests,
      approved,
      pending,
      rejected,
      byVendor,
      byCategory,
      currencyDisplay: currency,
      avgRequestValue: totalRequests > 0 ? (totalValue / totalRequests).toFixed(2) : 0
    }
  }, [requests, dateRange])

  const handleExportCSV = () => {
    setExporting(true)
    try {
      const headers = ['Reference No', 'Vendor', 'Department', 'Currency', 'Total Amount', 'Status', 'Created At']
      const rows = requests.map((r) => [
        r.referenceNo,
        `"${(r.vendorName || '').replace(/"/g, '""')}"`,
        `"${(r.department || '').replace(/"/g, '""')}"`,
        r.currency || 'UGX',
        r.totalAmount || 0,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        new Date(r.createdAt).toISOString()
      ])

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `navision-report-${reportType}-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = () => {
    alert('PDF export: integrate with a backend PDF generator or library like jsPDF for detailed reports.')
  }

  const handleExportExcel = () => {
    alert('Excel export: integrate with a library like xlsx for multi-sheet Excel reports.')
  }

  const theme = 'reports'

  return (
    <div className={`dashboard-shell ${theme}`}>
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-kicker">Analytics suite</span>
            <h2>Reports & Analytics</h2>
            <p>Procurement insights and audit trail</p>
          </div>
          <div className="dashboard-actions">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="summary">Summary Report</option>
              <option value="vendor">Vendor Analysis</option>
              <option value="category">Category Analysis</option>
              <option value="status">Status Analysis</option>
              <option value="audit">Audit Trail</option>
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button onClick={handleExportCSV} disabled={exporting}>{exporting ? 'Exporting...' : 'Export CSV'}</button>
            <button onClick={handleExportPDF}>Export PDF</button>
            <button onClick={handleExportExcel}>Export Excel</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {isLoading && <p>Loading reports...</p>}

        {reportType === 'summary' && (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="requests" /></span>
              <span className="stat-copy"><strong>{reportData.totalRequests}</strong><span>Total Requests</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="value" /></span>
              <span className="stat-copy"><strong>{reportData.currency || 'UGX'} {reportData.totalValue.toLocaleString()}</strong><span>Total Value</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="reports" /></span>
              <span className="stat-copy"><strong>{reportData.currency || 'UGX'} {Number(reportData.avgRequestValue).toLocaleString()}</strong><span>Average Value</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="shield" /></span>
              <span className="stat-copy"><strong>{reportData.approved}</strong><span>Approved</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="approvals" /></span>
              <span className="stat-copy"><strong>{reportData.pending}</strong><span>Pending</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon-wrap"><Icon name="x" /></span>
              <span className="stat-copy"><strong>{reportData.rejected}</strong><span>Rejected</span></span>
            </div>
          </div>
        )}

        {reportType === 'summary' && (
          <section className="panel">
            <h3>Status Breakdown</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Approved</td>
                  <td>{reportData.approved}</td>
                  <td>
                    {reportData.totalRequests > 0
                      ? ((reportData.approved / reportData.totalRequests) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td>Pending Approval</td>
                  <td>{reportData.pending}</td>
                  <td>
                    {reportData.totalRequests > 0
                      ? ((reportData.pending / reportData.totalRequests) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td>Rejected</td>
                  <td>{reportData.rejected}</td>
                  <td>
                    {reportData.totalRequests > 0
                      ? ((reportData.rejected / reportData.totalRequests) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {reportType === 'vendor' && (
          <section className="panel">
            <h3>Spending by Vendor</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportData.byVendor)
                  .sort((a, b) => b[1] - a[1])
                  .map(([vendor, value]) => (
                    <tr key={vendor}>
                      <td>{vendor}</td>
                      <td>{reportData.currencyDisplay === 'Multi' ? '' : reportData.currencyDisplay + ' '}{value.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}

        {reportType === 'category' && (
          <section className="panel">
            <h3>Requests by Category</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportData.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <tr key={category}>
                      <td>{category}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}

        {reportType === 'status' && (
          <section className="panel">
            <h3>Status Analysis</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {['Submitted','Pending ED Approval','Pending CFO Approval','Pending MD Approval','Approved','Rejected','Returned for Correction'].map((status) => {
                  const count = requests.filter((r) => r.status === status).length
                  const amount = requests.filter((r) => r.status === status).reduce((sum, r) => sum + (r.totalAmount || 0), 0)
                  return (
                    <tr key={status}>
                      <td>{status}</td>
                      <td>{count}</td>
                      <td>{reportData.currencyDisplay === 'Multi' ? '' : reportData.currencyDisplay + ' '}{amount.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {reportType === 'audit' && (
          <section className="panel">
            <h3>Audit Trail</h3>
            <p>Recent activity and approval history</p>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 10).map((request) => (
                  <tr key={request._id}>
                    <td>{request.referenceNo}</td>
                    <td>{request.status}</td>
                    <td>{request.createdBy ? request.createdBy.toString() : 'System'}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  )
}

export default Reports
