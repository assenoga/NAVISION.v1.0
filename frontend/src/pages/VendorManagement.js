import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import Sidebar from '../components/Sidebar'

const VendorManagement = () => {
  const { user } = useAuthContext()
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [form, setForm] = useState({
    vendorName: '',
    vendorNumber: '',
    address: '',
    phoneNumber: '',
    email: '',
    tin: '',
    contactPerson: ''
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadVendors = useCallback(async () => {
    if (!user?.token) return
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/vendors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Unable to load vendors')
        return
      }
      setVendors(data)
    } catch {
      setError('The server is unavailable right now.')
    } finally {
      setIsLoading(false)
    }
  }, [user, searchTerm])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setIsSubmitting(true)

    try {
      const method = editingVendor ? 'PATCH' : 'POST'
      const url = editingVendor ? `/api/vendors/${editingVendor._id}` : '/api/vendors'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(form)
      })
      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || 'Unable to save vendor')
      } else {
        setFormSuccess(editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully')
        setShowCreateModal(false)
        setEditingVendor(null)
        setForm({
          vendorName: '',
          vendorNumber: '',
          address: '',
          phoneNumber: '',
          email: '',
          tin: '',
          contactPerson: ''
        })
        loadVendors()
        setTimeout(() => setFormSuccess(''), 4000)
      }
    } catch {
      setFormError('The server is unavailable right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (vendor) => {
    setEditingVendor(vendor)
    setForm({
      vendorName: vendor.vendorName || '',
      vendorNumber: vendor.vendorNumber || '',
      address: vendor.address || '',
      phoneNumber: vendor.phoneNumber || '',
      email: vendor.email || '',
      tin: vendor.tin || '',
      contactPerson: vendor.contactPerson || ''
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor permanently?')) return
    const response = await fetch(`/api/vendors/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.token}` }
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Unable to delete vendor')
      return
    }
    setVendors((prev) => prev.filter((v) => v._id !== id))
  }

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors
    const term = searchTerm.toLowerCase()
    return vendors.filter((v) =>
      v.vendorName?.toLowerCase().includes(term) ||
      v.vendorNumber?.toLowerCase().includes(term) ||
      v.tin?.toLowerCase().includes(term) ||
      v.contactPerson?.toLowerCase().includes(term)
    )
  }, [vendors, searchTerm])

  const openCreate = () => {
    setEditingVendor(null)
    setForm({
      vendorName: '',
      vendorNumber: '',
      address: '',
      phoneNumber: '',
      email: '',
      tin: '',
      contactPerson: ''
    })
    setFormError('')
    setFormSuccess('')
    setShowCreateModal(true)
  }

  return (
    <div className="dashboard-shell procurement">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h2>Vendor Management</h2>
            <p>Register and manage approved vendors</p>
          </div>
          <button className="btn-primary" onClick={openCreate}>Register Vendor</button>
        </div>

        {error && <div className="error">{error}</div>}
        {isLoading && <p>Loading vendors...</p>}

        <section className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isLoading ? (
            <p>Loading vendors...</p>
          ) : filteredVendors.length === 0 ? (
            <p>No vendors found.</p>
          ) : (
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Vendor Number</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>TIN</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor._id}>
                      <td>{vendor.vendorName}</td>
                      <td>{vendor.vendorNumber}</td>
                      <td>{vendor.contactPerson}</td>
                      <td>{vendor.phoneNumber}</td>
                      <td>{vendor.email}</td>
                      <td>{vendor.tin}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-primary btn-sm" onClick={() => handleEdit(vendor)}>Edit</button>
                          <button className="btn-danger btn-sm" onClick={() => handleDelete(vendor._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingVendor ? 'Edit Vendor' : 'Register Vendor'}</h3>
                <button type="button" className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {formError && <div className="error">{formError}</div>}
                  {formSuccess && <div className="success">{formSuccess}</div>}

                  <div className="form-group">
                    <label>Vendor Name</label>
                    <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Vendor Number</label>
                    <input value={form.vendorNumber} onChange={(e) => setForm({ ...form, vendorNumber: e.target.value })} required disabled={!!editingVendor} />
                  </div>
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Tax Identification Number (TIN)</label>
                    <input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows="2" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
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

export default VendorManagement
