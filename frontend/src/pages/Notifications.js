import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import Sidebar from '../components/Sidebar'

const Notifications = () => {
  const { user } = useAuthContext()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    if (!user?.token) return
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Unable to load notifications')
        return
      }
      setNotifications(data)
    } catch {
      setError('The server is unavailable right now.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const markAsRead = async (id) => {
    if (!user?.token) return
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user.token}` }
    })
    if (response.ok) {
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    }
  }

  const markAllAsRead = async () => {
    if (!user?.token) return
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user.token}` }
    })
    if (response.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  return (
    <div className="dashboard-shell reports">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h2>Notifications</h2>
            <p>Stay updated on purchase request activities</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllAsRead}>
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {error && <div className="error">{error}</div>}
        {isLoading && <p>Loading notifications...</p>}

        {notifications.length === 0 && !isLoading && (
          <section className="panel">
            <p>You have no notifications yet.</p>
          </section>
        )}

        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => !notification.read && markAsRead(notification._id)}
            >
              <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </div>
              {!notification.read && <div className="notification-dot" />}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Notifications
