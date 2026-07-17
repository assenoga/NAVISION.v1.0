import { useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'

const ForcePasswordChange = () => {
  const { user, dispatch } = useAuthContext()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Unable to change password.')
        return
      }

      const updatedUser = {
        ...user,
        ...data.user,
        token: user.token,
        mustChangePassword: false
      }

      localStorage.setItem('user', JSON.stringify(updatedUser))
      dispatch({ type: 'LOGIN', payload: updatedUser })
      setSuccess('Password changed successfully.')
    } catch (err) {
      setError('The server is unavailable right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="password-change-page">
      <section className="password-change-card">
        <div className="password-change-header">
          <span>First login setup</span>
          <h2>Change your temporary password</h2>
          <p>Your administrator created this account with a temporary password. Choose a new password before continuing.</p>
        </div>

        <form className="password-change-form" onSubmit={handleSubmit}>
          <label htmlFor="currentPassword">Current Temporary Password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />

          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength="8"
          />

          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength="8"
          />

          {error && <div className="message-box message-error">{error}</div>}
          {success && <div className="message-box message-success">{success}</div>}

          <button
            type="submit"
            className="login-btn primary"
            disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
          >
            {isSubmitting ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ForcePasswordChange
