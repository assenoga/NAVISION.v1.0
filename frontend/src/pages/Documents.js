import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import DocumentList from '../components/DocumentList'
import DocumentUpload from '../components/DocumentUpload'
import { useAuthContext } from '../hooks/useAuthContext'
import { listDocuments } from '../services/documentApi'

const Documents = () => {
  const { user } = useAuthContext()
  const [documents, setDocuments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [purchaseFilter, setPurchaseFilter] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadDocuments = useCallback(async () => {
    if (!user?.token) return
    setIsLoading(true)
    setError('')

    try {
      const loaded = await listDocuments(user.token, purchaseFilter)
      setDocuments(loaded)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load documents.')
    } finally {
      setIsLoading(false)
    }
  }, [purchaseFilter, user])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const filteredDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return documents

    return documents.filter((document) => {
      return [
        document.document_name,
        document.original_filename,
        document.uploaded_by_name,
        document.uploaded_by_role,
        document.purchase_id
      ].some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [documents, searchTerm])

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, document) => sum + Number(document.file_size || 0), 0)
    const pdfs = documents.filter((document) => document.file_type === 'application/pdf').length
    const images = documents.filter((document) => document.file_type?.startsWith('image/')).length
    return { totalSize, pdfs, images }
  }, [documents])

  const handleUploaded = (document) => {
    setDocuments((prev) => [document, ...prev])
  }

  const handleDeleted = (id) => {
    setDocuments((prev) => prev.filter((document) => document.id !== id))
  }

  const handleReplaced = (updated) => {
    setDocuments((prev) => prev.map((document) => document.id === updated.id ? updated : document))
  }

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-main documents-page">
        <div className="dashboard-header">
          <div>
            <h2>Documents</h2>
            <p>Upload, preview, replace, and control procurement records.</p>
          </div>
          <div className="dashboard-actions">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <input
              type="text"
              placeholder="Filter by purchase ID"
              value={purchaseFilter}
              onChange={(event) => setPurchaseFilter(event.target.value)}
            />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <strong>{documents.length}</strong>
            <span>Total documents</span>
          </div>
          <div className="stat-card">
            <strong>{(stats.totalSize / 1024 / 1024).toFixed(2)} MB</strong>
            <span>Stored size</span>
          </div>
          <div className="stat-card">
            <strong>{stats.pdfs}</strong>
            <span>PDFs</span>
          </div>
          <div className="stat-card">
            <strong>{stats.images}</strong>
            <span>Images</span>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {isLoading && <p>Loading documents...</p>}

        <div className="dashboard-grid documents-grid">
          <DocumentList
            token={user.token}
            documents={filteredDocuments}
            onDeleted={handleDeleted}
            onReplaced={handleReplaced}
          />
          <section className="panel">
            <DocumentUpload token={user.token} onUploaded={handleUploaded} />
          </section>
        </div>
      </main>
    </div>
  )
}

export default Documents
