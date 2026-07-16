import { useCallback, useState } from 'react'
import { useAuthContext } from './useAuthContext'

export const usePurchaseRequests = () => {
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuthContext()

  const readResponse = async (response) => {
    const text = await response.text()
    if (!text) return {}
    try {
      return JSON.parse(text)
    } catch (err) {
      return { error: text.slice(0, 180) }
    }
  }

  const fetchRequests = useCallback(async () => {
    if (!user) return []

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = user.role === 'Procurement Officer' ? '/api/purchase-requests' : '/api/purchase-requests/all'
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to load requests')
        return []
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return []
    }
  }, [user])

  const createRequest = useCallback(async (payload) => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to create request')
        return null
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return null
    }
  }, [user])

  const updateRequest = useCallback(async (id, action, comment, financialComments = '', additionalComments = '') => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/purchase-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ action, comment, financialComments, additionalComments })
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to update request')
        return null
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return null
    }
  }, [user])

  const approveRequest = useCallback((id, comment = '') => {
    return updateRequest(id, 'approve', comment)
  }, [updateRequest])

  const rejectRequest = useCallback((id, comment = '') => {
    return updateRequest(id, 'reject', comment)
  }, [updateRequest])

  const returnForCorrection = useCallback((id, comment = '') => {
    return updateRequest(id, 'return', comment)
  }, [updateRequest])

  const resubmitRequest = useCallback(async (id, payload) => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/purchase-requests/${id}/resubmit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to resubmit request')
        return null
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return null
    }
  }, [user])

  const deleteRequest = useCallback(async (id) => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/purchase-requests/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to delete request')
        return null
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return null
    }
  }, [user])

  const openPaymentLink = useCallback(async (id) => {
    if (!user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/purchase-requests/${id}/payment-link`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${user.token}`
        }
      })

      const json = await readResponse(response)
      setIsLoading(false)

      if (!response.ok) {
        setError(json.error || 'Unable to open bank payment link')
        return null
      }

      return json
    } catch (err) {
      setIsLoading(false)
      setError('The server is unavailable right now.')
      return null
    }
  }, [user])

  return { fetchRequests, createRequest, updateRequest, approveRequest, rejectRequest, returnForCorrection, resubmitRequest, deleteRequest, openPaymentLink, isLoading, error }
}
