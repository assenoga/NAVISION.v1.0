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

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const dataUrlToBytes = (dataUrl) => {
  const [, payload = ''] = dataUrl.split(',')
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const bytesToText = (bytes) => new TextDecoder('utf-8').decode(bytes)

const inflateRaw = async (bytes) => {
  if (!('DecompressionStream' in window)) {
    throw new Error('DOCX preview is not supported by this browser.')
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new window.DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

const extractDocxXml = async (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0

  while (offset < bytes.length - 30) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      offset += 1
      continue
    }

    const method = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + fileNameLength + extraLength
    const name = bytesToText(bytes.slice(nameStart, nameStart + fileNameLength))
    const dataEnd = dataStart + compressedSize

    if (name === 'word/document.xml') {
      const compressed = bytes.slice(dataStart, dataEnd)
      if (method === 0) return bytesToText(compressed)
      if (method === 8) return bytesToText(await inflateRaw(compressed))
      throw new Error('Unsupported DOCX compression method.')
    }

    offset = dataEnd
  }

  throw new Error('No Word document content was found in this DOCX file.')
}

const docxXmlToText = (xml) => {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const paragraphs = Array.from(document.getElementsByTagName('w:p'))

  return paragraphs
    .map((paragraph) => {
      const pieces = []
      paragraph.childNodes.forEach((node) => {
        const textNodes = node.getElementsByTagName ? Array.from(node.getElementsByTagName('w:t')) : []
        textNodes.forEach((textNode) => pieces.push(textNode.textContent || ''))
        if (node.getElementsByTagName && node.getElementsByTagName('w:tab').length) pieces.push('\t')
      })
      return pieces.join('')
    })
    .filter(Boolean)
    .join('\n\n')
}
// view word docx
const readAttachmentText = async (attachment, token) => {
  if (attachment.documentId) {
    const blob = await downloadDocumentBlob(token, attachment.documentId)
    return blob.text()
  }

  if (attachment.href.startsWith('data:')) {
    return bytesToText(dataUrlToBytes(attachment.href))
  }
  const response = await fetch(attachment.href)
  return response.text()
}

const readDocxText = async (attachment, token) => {
  let bytes
  if (attachment.documentId) {
    const blob = await downloadDocumentBlob(token, attachment.documentId)
    bytes = new Uint8Array(await blob.arrayBuffer())
  } else if (attachment.href.startsWith('data:')) {
    bytes = dataUrlToBytes(attachment.href)
  } else {
    const response = await fetch(attachment.href)
    bytes = new Uint8Array(await response.arrayBuffer())
  }

  const xml = await extractDocxXml(bytes)
  return docxXmlToText(xml)
}

const AttachmentPreview = ({ attachment }) => {
  const { user } = useAuthContext()
  const [content, setContent] = useState('')
  const [objectUrl, setObjectUrl] = useState('')
  const [error, setError] = useState('')
  const extension = getExtension(attachment.name)
  const isImage = attachment.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
  const isPdf = attachment.type === 'application/pdf' || extension === 'pdf'
  const isText = attachment.type.startsWith('text/') || ['txt', 'csv'].includes(extension)
  const isDocx = extension === 'docx'

  useEffect(() => {
    let cancelled = false
    let createdUrl = ''
    setContent('')
    setError('')
    setObjectUrl('')

    const load = async () => {
      try {
        if (attachment.documentId && (isImage || isPdf)) {
          const blob = await downloadDocumentBlob(user.token, attachment.documentId)
          const url = URL.createObjectURL(blob)
          createdUrl = url
          if (!cancelled) setObjectUrl(url)
        } else if (isText) {
          const text = await readAttachmentText(attachment, user.token)
          if (!cancelled) setContent(text)
        } else if (isDocx) {
          const text = await readDocxText(attachment, user.token)
          if (!cancelled) setContent(text || 'No readable text was found in this DOCX file.')
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
  }, [attachment, isDocx, isImage, isPdf, isText, user?.token])

  if (isImage) {
    const src = objectUrl || (!attachment.documentId ? attachment.href : '')
    return src ? <img className="attachment-preview-image" src={src} alt={attachment.name} /> : <p>Loading preview...</p>
  }

  if (isPdf) {
    const src = objectUrl || (!attachment.documentId ? attachment.href : '')
    return src ? <iframe className="attachment-preview-frame" src={src} title={attachment.name} /> : <p>Loading preview...</p>
  }

  if (isText || isDocx) {
    return (
      <div className="attachment-preview-text">
        {error ? <p>{error}</p> : content ? <pre>{content}</pre> : <p>Loading preview...</p>}
      </div>
    )
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

  if (!normalized.length) {
    return <p>No documents attached.</p>
  }

  return (
    <>
      <ul className="attachment-viewer-list">
        {normalized.map((attachment, idx) => (
          <li key={`${attachment.name}-${idx}`}>
            <button type="button" className="attachment-view-button" onClick={() => setSelected(attachment)}>
              <span>{attachment.name}</span>
              {attachment.size ? <small>{formatSize(attachment.size)}</small> : null}
            </button>
          </li>
        ))}
      </ul>

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
