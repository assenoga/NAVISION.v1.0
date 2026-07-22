import { useMemo, useState } from 'react'
import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import { useAuthContext } from '../hooks/useAuthContext'
import { uploadDocument } from '../services/documentApi'

const currencyOptions = [
  { code: 'UGX', label: 'UGX - Ugandan Shilling' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'KES', label: 'KES - Kenyan Shilling' },
  { code: 'TZS', label: 'TZS - Tanzanian Shilling' },
  { code: 'RWF', label: 'RWF - Rwandan Franc' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', label: 'AUD - Australian Dollar' }
]

const acceptedExtensions = ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png']
const maxFileSize = 10 * 1024 * 1024

const emptyItem = (currency = 'UGX') => ({
  itemName: '',
  description: '',
  itemCategory: '',
  quantity: 1,
  unitOfMeasure: '',
  unitPrice: 0,
  currency
})

const PurchaseRequestForm = ({ onCreated }) => {
  const { user } = useAuthContext()
  const [vendor, setVendor] = useState({
    name: '',
    number: '',
    address: '',
    phoneNumber: '',
    email: '',
    tin: '',
    contactPerson: ''
  })
  const [department, setDepartment] = useState('')
  const [purchaseDescription, setPurchaseDescription] = useState('')
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currency, setCurrency] = useState('UGX')
  const [attachmentFiles, setAttachmentFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [uploadProgress, setUploadProgress] = useState({})
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [items, setItems] = useState([emptyItem('UGX')])
  const { createRequest, isLoading, error } = usePurchaseRequests()

  const updateVendor = (field, value) => {
    setVendor((current) => ({ ...current, [field]: value }))
  }

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, idx) => (
      idx === index ? { ...item, [field]: value } : item
    )))
  }

  const addItem = () => {
    setItems((current) => [...current, emptyItem(currency)])
  }

  const deleteItem = (index) => {
    setItems((current) => current.length === 1 ? current : current.filter((_, idx) => idx !== index))
  }

  const totalValue = useMemo(() => (
    items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  ), [items])

  const handleCurrencyChange = (value) => {
    setCurrency(value)
    setItems((current) => current.map((item) => ({ ...item, currency: item.currency || value })))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const invalid = files.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return !acceptedExtensions.includes(extension) || file.size > maxFileSize
    })

    if (invalid) {
      setFileError(`${invalid.name} must be PDF, DOC, DOCX, XLSX, PNG, JPG, or JPEG and no larger than 10 MB.`)
      return
    }

    setFileError('')
    setAttachmentFiles((prevFiles) => [...prevFiles, ...files])
  }

  const handleRemoveAttachment = (index) => {
    setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFileError('')
    setIsUploadingFiles(true)
    setUploadProgress({})

    let attachments = []
    try {
      attachments = []
      for (const file of attachmentFiles) {
        const uploaded = await uploadDocument(user.token, {
          file,
          documentName: file.name.replace(/\.[^.]+$/, ''),
          purchaseId: ''
        }, (progress) => {
          setUploadProgress((current) => ({ ...current, [file.name]: progress }))
        })

        attachments.push({
          name: uploaded.original_filename,
          url: `/api/documents/${uploaded.id}`,
          documentId: uploaded.id,
          storedFilename: uploaded.stored_filename,
          filePath: uploaded.file_path,
          type: uploaded.file_type,
          size: uploaded.file_size,
          uploadedAt: uploaded.uploaded_at
        })
      }
    } catch (uploadError) {
      setIsUploadingFiles(false)
      setFileError(uploadError.response?.data?.error || uploadError.message || 'Unable to upload one of the supporting documents.')
      return
    }

    setIsUploadingFiles(false)

    const created = await createRequest({
      vendor,
      vendorName: vendor.name,
      department,
      purchaseDescription,
      requiredDeliveryDate,
      remarks,
      items,
      currency,
      attachments
    })

    if (created) {
      setVendor({
        name: '',
        number: '',
        address: '',
        phoneNumber: '',
        email: '',
        tin: '',
        contactPerson: ''
      })
      setDepartment('')
      setPurchaseDescription('')
      setRequiredDeliveryDate('')
      setRemarks('')
      setCurrency('UGX')
      setAttachmentFiles([])
      setUploadProgress({})
      setItems([emptyItem('UGX')])
      onCreated?.(created)
    }
  }

  return (
    <form className="create purchase-form" onSubmit={handleSubmit}>
      <h3>Create Purchase Request</h3>

      <div className="form-grid two">
        <div>
          <label>Vendor Name</label>
          <input value={vendor.name} onChange={(e) => updateVendor('name', e.target.value)} required />
        </div>
        <div>
          <label>Vendor Number</label>
          <input value={vendor.number} onChange={(e) => updateVendor('number', e.target.value)} />
        </div>
        <div>
          <label>Vendor Email</label>
          <input type="email" value={vendor.email} onChange={(e) => updateVendor('email', e.target.value)} />
        </div>
        <div>
          <label>Phone Number</label>
          <input value={vendor.phoneNumber} onChange={(e) => updateVendor('phoneNumber', e.target.value)} />
        </div>
        <div>
          <label>Tax Identification Number</label>
          <input value={vendor.tin} onChange={(e) => updateVendor('tin', e.target.value)} />
        </div>
        <div>
          <label>Contact Person</label>
          <input value={vendor.contactPerson} onChange={(e) => updateVendor('contactPerson', e.target.value)} />
        </div>
      </div>

      <label>Vendor Address</label>
      <textarea value={vendor.address} onChange={(e) => updateVendor('address', e.target.value)} rows="2" />

      <div className="form-grid two">
        <div>
          <label>Department</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} required />
        </div>
        <div>
          <label>Required Delivery Date</label>
          <input type="date" value={requiredDeliveryDate} onChange={(e) => setRequiredDeliveryDate(e.target.value)} required />
        </div>
      </div>

      <label>Purchase Description</label>
      <textarea value={purchaseDescription} onChange={(e) => setPurchaseDescription(e.target.value)} rows="3" required />

      <label>Request Currency</label>
      <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)} required>
        {currencyOptions.map((curr) => (
          <option key={curr.code} value={curr.code}>{curr.label}</option>
        ))}
      </select>

      <div className="items-toolbar">
        <h4>Purchase Items</h4>
        <button type="button" className="secondary" onClick={addItem}>Add Item</button>
      </div>

      {items.map((item, index) => {
        const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
        return (
          <div key={index} className="item-row advanced-item-row">
            <div className="item-row-header">
              <strong>Item {index + 1}</strong>
              <button type="button" className="remove-link" onClick={() => deleteItem(index)} disabled={items.length === 1}>
                Delete Item
              </button>
            </div>
            <div className="form-grid three">
              <div>
                <label>Item Name</label>
                <input value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)} required />
              </div>
              <div>
                <label>Item Category</label>
                <input value={item.itemCategory} onChange={(e) => updateItem(index, 'itemCategory', e.target.value)} />
              </div>
              <div>
                <label>Unit of Measure</label>
                <input value={item.unitOfMeasure} onChange={(e) => updateItem(index, 'unitOfMeasure', e.target.value)} />
              </div>
              <div>
                <label>Quantity</label>
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
              </div>
              <div>
                <label>Unit Price</label>
                <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} required />
              </div>
              <div>
                <label>Currency</label>
                <select value={item.currency || currency} onChange={(e) => updateItem(index, 'currency', e.target.value)}>
                  {currencyOptions.map((curr) => (
                    <option key={curr.code} value={curr.code}>{curr.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <label>Description</label>
            <textarea value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} rows="2" />
            <div className="total-pill">Line total: {item.currency || currency} {lineTotal.toLocaleString()}</div>
          </div>
        )
      })}

      <label>Supporting Documents</label>
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="file-input"
      />
      {fileError && <div className="error">{fileError}</div>}
      {attachmentFiles.length > 0 && (
        <div className="attachments-list">
          <strong>Selected files:</strong>
          <ul>
            {attachmentFiles.map((file, idx) => (
              <li key={idx}>
                <span>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  {uploadProgress[file.name] ? ` - ${uploadProgress[file.name]}% uploaded` : ''}
                </span>
                <button type="button" className="remove-link" onClick={() => handleRemoveAttachment(idx)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label>Remarks</label>
      <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="3" />

      <div className="total-pill total-strong">Auto-calculated request total: {currency} {totalValue.toLocaleString()}</div>
      <div className="actions">
        <button disabled={isLoading || isUploadingFiles}>{isUploadingFiles ? 'Uploading documents...' : isLoading ? 'Submitting...' : 'Submit Request'}</button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  )
}

export default PurchaseRequestForm
