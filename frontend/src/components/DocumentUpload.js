import { useMemo, useState } from 'react'
import { uploadDocument } from '../services/documentApi'

const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']

const DocumentUpload = ({ token, onUploaded }) => {
  const [documentName, setDocumentName] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultName = useMemo(() => {
    if (!file) return ''
    return file.name.replace(/\.[^.]+$/, '')
  }, [file])

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null
    setFile(selected)
    setError('')
    setSuccess('')
    if (selected && !documentName) {
      setDocumentName(selected.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Choose a document to upload.')
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      setError('Only PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, and JPEG files are allowed.')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Document must be 20 MB or smaller.')
      return
    }

    setIsUploading(true)
    setProgress(0)

    try {
      const uploaded = await uploadDocument(token, {
        file,
        documentName: documentName || defaultName,
        purchaseId
      }, setProgress)

      setSuccess('Document uploaded successfully.')
      setDocumentName('')
      setPurchaseId('')
      setFile(null)
      event.target.reset()
      onUploaded?.(uploaded)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to upload document.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form className="document-upload-form" onSubmit={handleSubmit}>
      <h3>Upload Document</h3>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <label>
        Document name
        <input
          type="text"
          value={documentName}
          onChange={(event) => setDocumentName(event.target.value)}
          placeholder={defaultName || 'Invoice April'}
          maxLength="255"
        />
      </label>

      <label>
        Purchase ID
        <input
          type="text"
          value={purchaseId}
          onChange={(event) => setPurchaseId(event.target.value)}
          placeholder="Optional"
          maxLength="64"
        />
      </label>

      <label>
        File
        <input
          className="file-input"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </label>

      {file && (
        <div className="document-selected-file">
          <strong>{file.name}</strong>
          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      )}

      {isUploading && (
        <div className="document-progress" aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
          <strong>{progress}%</strong>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
}

export default DocumentUpload
