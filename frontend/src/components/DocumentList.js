import { useEffect, useRef, useState } from 'react'
import { deleteDocument, downloadDocumentBlob, replaceDocument } from '../services/documentApi'

const formatSize = (bytes) => {
  const size = Number(bytes || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

const canPreview = (document) => {
  return document.file_type === 'application/pdf' || document.file_type?.startsWith('image/')
}

const DocumentPreviewModal = ({ preview, onClose }) => {
  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  if (!preview) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content document-preview-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{preview.name}</h2>
          <button type="button" className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          {preview.type?.startsWith('image/') ? (
            <img className="document-preview-image" src={preview.url} alt={preview.name} />
          ) : (
            <iframe className="document-preview-frame" src={preview.url} title={preview.name} />
          )}
        </div>
      </div>
    </div>
  )
}

const DocumentList = ({ token, documents, onDeleted, onReplaced }) => {
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [replaceState, setReplaceState] = useState({})
  const inputRefs = useRef({})

  const handleDownload = async (document) => {
    setError('')
    try {
      const blob = await downloadDocumentBlob(token, document.id)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.original_filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to download document.')
    }
  }

  const handlePreview = async (document) => {
    setError('')
    try {
      const blob = await downloadDocumentBlob(token, document.id)
      setPreview({
        name: document.original_filename,
        type: document.file_type,
        url: URL.createObjectURL(blob)
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to preview document.')
    }
  }

  const handleDelete = async (document) => {
    setError('')
    const confirmed = window.confirm(`Delete ${document.document_name}?`)
    if (!confirmed) return

    try {
      await deleteDocument(token, document.id)
      onDeleted?.(document.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete document.')
    }
  }

  const handleReplaceClick = (document) => {
    inputRefs.current[document.id]?.click()
  }

  const handleReplacement = async (document, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setReplaceState((prev) => ({ ...prev, [document.id]: { progress: 0, busy: true } }))

    try {
      const replaced = await replaceDocument(token, document.id, {
        file,
        documentName: document.document_name,
        purchaseId: document.purchase_id || ''
      }, (progress) => {
        setReplaceState((prev) => ({ ...prev, [document.id]: { progress, busy: true } }))
      })

      onReplaced?.(replaced)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to replace document.')
    } finally {
      setReplaceState((prev) => ({ ...prev, [document.id]: { progress: 0, busy: false } }))
      event.target.value = ''
    }
  }

  if (!documents.length) {
    return (
      <section className="panel documents-panel">
        <h3>Uploaded Documents</h3>
        <p>No documents have been uploaded yet.</p>
      </section>
    )
  }

  return (
    <section className="panel documents-panel">
      <h3>Uploaded Documents</h3>
      {error && <div className="error">{error}</div>}

      <div className="documents-table-wrap">
        <table className="documents-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Uploaded</th>
              <th>Size</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const replacing = replaceState[document.id]?.busy
              return (
                <tr key={document.id}>
                  <td>
                    <strong>{document.document_name}</strong>
                    <small>{document.original_filename}</small>
                    {document.purchase_id && <small>Purchase: {document.purchase_id}</small>}
                  </td>
                  <td>{formatDate(document.uploaded_at)}</td>
                  <td>{formatSize(document.file_size)}</td>
                  <td>
                    <span>{document.uploaded_by_name || document.uploaded_by}</span>
                    <small>{document.uploaded_by_role}</small>
                  </td>
                  <td>
                    <div className="document-row-actions">
                      {canPreview(document) && (
                        <button type="button" className="btn-secondary" onClick={() => handlePreview(document)}>
                          Preview
                        </button>
                      )}
                      <button type="button" className="btn-secondary" onClick={() => handleDownload(document)}>
                        Download
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => handleReplaceClick(document)} disabled={replacing}>
                        {replacing ? `${replaceState[document.id]?.progress || 0}%` : 'Replace'}
                      </button>
                      <button type="button" className="remove-link" onClick={() => handleDelete(document)}>
                        Delete
                      </button>
                      <input
                        ref={(node) => {
                          inputRefs.current[document.id] = node
                        }}
                        type="file"
                        className="document-hidden-input"
                        accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                        onChange={(event) => handleReplacement(document, event)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </section>
  )
}

export default DocumentList
