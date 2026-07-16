const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'X-Requested-With': 'XMLHttpRequest'
})

const readError = async (response) => {
  const text = await response.text()
  if (!text) return 'Request failed'

  try {
    return JSON.parse(text).error || text
  } catch (error) {
    return text
  }
}

const createHttpError = (message) => {
  const error = new Error(message)
  error.response = { data: { error: message } }
  return error
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(`/api/documents${path}`, options)
  if (!response.ok) {
    throw createHttpError(await readError(response))
  }

  return response.json()
}

const uploadWithProgress = ({ token, path, method, formData, onProgress }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `/api/documents${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    xhr.responseType = 'json'

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded * 100) / event.total))
    }

    xhr.onload = () => {
      const data = xhr.response || {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data.document)
        return
      }

      if (xhr.status === 409 && data.document) {
        resolve(data.document)
        return
      }

      reject(createHttpError(data.error || 'Document upload failed'))
    }

    xhr.onerror = () => reject(createHttpError('The server is unavailable right now.'))
    xhr.send(formData)
  })
}

export const listDocuments = async (token, purchaseId = '') => {
  const params = purchaseId ? `?purchase_id=${encodeURIComponent(purchaseId)}` : ''
  const data = await requestJson(`/${params}`, {
    headers: authHeaders(token)
  })

  return data.documents || []
}

export const uploadDocument = async (token, { file, documentName, purchaseId }, onProgress) => {
  const formData = new FormData()
  formData.append('document', file)
  formData.append('document_name', documentName)
  if (purchaseId) formData.append('purchase_id', purchaseId)

  return uploadWithProgress({
    token,
    path: '/',
    method: 'POST',
    formData,
    onProgress
  })
}

export const replaceDocument = async (token, id, { file, documentName, purchaseId }, onProgress) => {
  const formData = new FormData()
  formData.append('document', file)
  formData.append('document_name', documentName)
  if (purchaseId) formData.append('purchase_id', purchaseId)

  return uploadWithProgress({
    token,
    path: `/${id}`,
    method: 'PUT',
    formData,
    onProgress
  })
}

export const deleteDocument = async (token, id) => {
  return requestJson(`/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
}

export const downloadDocumentBlob = async (token, id) => {
  const response = await fetch(`/api/documents/${id}`, {
    headers: authHeaders(token)
  })

  if (!response.ok) {
    throw createHttpError(await readError(response))
  }

  return response.blob()
}
