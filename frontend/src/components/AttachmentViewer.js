import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import { downloadDocumentBlob } from '../services/documentApi'

const normalizeAttachment = (doc) => {
  const name = typeof doc === 'string' ? doc : doc?.name
  const documentId = typeof doc === 'string' ? '' : (doc?.documentId || doc?.id || doc?._id || '')
  const raw = typeof doc === 'string' ? doc : (doc?.dataUrl || doc?.url || doc?.name || '')
  const type = typeof doc === 'string' ? '' : (doc?.type || '')
  const size = typeof doc === 'string' ? 0 : (Number(doc?.size) || 0)

  if (documentId) {
    return { name: name || 'Document', href: `/api/documents/${documentId}`, type, size, documentId }
  }
  if (!raw) return { name: name || 'Document', href: '#', type, size, documentId }
  const trimmed = String(raw).trim()
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
    return { name: name || trimmed, href: trimmed, type, size, documentId }
  }
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return { name: name || trimmed, href: `file:///${trimmed.replace(/\\/g, '/')}`, type, size, documentId }
  }
  if (/^\\\\/.test(trimmed)) {
    return { name: name || trimmed, href: `file://${trimmed.replace(/\\/g, '/')}`, type, size, documentId }
  }
  return { name: name || trimmed, href: trimmed, type, size, documentId }
}

const getExtension = (name = '') => name.split('.').pop()?.toLowerCase() || ''

const isPreviewableAttachment = (attachment) => {
  const extension = getExtension(attachment.name)
  return (
    attachment.type.startsWith('image/') ||
    attachment.type === 'application/pdf' ||
    ['jpg', 'jpeg', 'png', 'pdf'].includes(extension)
  )
}

const isOfficeAttachment = (attachment) => {
  const extension = getExtension(attachment.name)
  return ['doc', 'docx', 'xlsx'].includes(extension)
}

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const AttachmentPreview = ({ attachment }) => {
  const { user } = useAuthContext()
  const [objectUrl, setObjectUrl] = useState('')
  const [error, setError] = useState('')
  const extension = getExtension(attachment.name)
  const isImage = attachment.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
  const isPdf = attachment.type === 'application/pdf' || extension === 'pdf'

  useEffect(() => {
    let cancelled = false
    let createdUrl = ''
    setError('')
    setObjectUrl('')

    const load = async () => {
      try {
        if (attachment.documentId && (isImage || isPdf)) {
          const blob = await downloadDocumentBlob(user.token, attachment.documentId)
          const url = URL.createObjectURL(blob)
          createdUrl = url
          if (!cancelled) setObjectUrl(url)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to preview this document.')
      }
    }

    load()
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [attachment, isImage, isPdf, user?.token])

  if (isImage) {
    const src = objectUrl || (!attachment.documentId ? attachment.href : '')
    return error ? <div className="error">{error}</div> : src ? <img className="attachment-preview-image" src={src} alt={attachment.name} /> : <p>Loading preview...</p>
  }

  if (isPdf) {
    const src = objectUrl || (!attachment.documentId ? attachment.href : '')
    return error ? <div className="error">{error}</div> : src ? <iframe className="attachment-preview-frame" src={src} title={attachment.name} /> : <p>Loading preview...</p>
  }

  return (
    <div className="attachment-preview-empty">
      <p>This file type cannot be previewed directly in the browser.</p>
      <p>Open or download the file to view it with its native application.</p>
    </div>
  )
}

const AttachmentViewer = ({ attachments = [] }) => {
  const { user } = useAuthContext()
  const normalized = useMemo(() => attachments.map(normalizeAttachment), [attachments])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  const handleDownload = async (attachment) => {
    setError('')
    if (!attachment.documentId) return

    try {
      const blob = await downloadDocumentBlob(user.token, attachment.documentId)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = attachment.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to download this document.')
    }
  }

  const handleOpen = async (attachment) => {
    setError('')

    if (isPreviewableAttachment(attachment)) {
      setSelected(attachment)
      return
    }

    if (attachment.documentId) {
      await handleDownload(attachment)
      return
    }

    window.open(attachment.href, '_blank', 'noopener,noreferrer')
  }

  if (!normalized.length) {
    return <p>No documents attached.</p>
  }

  return (
    <>
      <ul className="attachment-viewer-list">
        {normalized.map((attachment, idx) => (
          <li key={`${attachment.name}-${idx}`}>
            <button type="button" className="attachment-view-button" onClick={() => handleOpen(attachment)}>
              <span>{attachment.name}</span>
              {attachment.size ? <small>{formatSize(attachment.size)}</small> : null}
              {isOfficeAttachment(attachment) ? <small>Opens in Word/Excel after download</small> : null}
            </button>
          </li>
        ))}
      </ul>

      {error && <div className="error">{error}</div>}

      {selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="modal-content attachment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.name}</h2>
              <button type="button" className="close-btn" onClick={() => setSelected(null)}>x</button>
            </div>
            <div className="modal-body">
              {error && <div className="error">{error}</div>}
              <AttachmentPreview attachment={selected} />
              <div className="attachment-modal-actions">
                {!selected.documentId && (
                  <a className="btn-secondary" href={selected.href} target="_blank" rel="noopener noreferrer">Open in New Tab</a>
                )}
                {selected.documentId ? (
                  <button type="button" className="btn-primary" onClick={() => handleDownload(selected)}>Download</button>
                ) : (
                  <a className="btn-primary" href={selected.href} download={selected.name}>Download</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AttachmentViewer
