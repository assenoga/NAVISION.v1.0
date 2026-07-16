import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'

const Login = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { login, isLoading, error } = useLogin()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) {
      setMessage('Please enter your username or email and password.')
      return
    }

    const result = await login(identifier, password)
    const user = result?.user
    const loginError = result?.error

    if (user) {
      navigate('/')
    } else {
      // If server returns the specific email-only restriction, give clearer guidance
      if (loginError && loginError.toLowerCase().includes('only the system administrator may log in with an email address')) {
        setMessage('If you are not the System Administrator, please sign in using your username (not email).')
      } else {
        setMessage(loginError || 'Unable to sign in. Check your credentials.')
      }
    }
  }

  const handleForgotPassword = () => {
    setMessage('Contact the system administrator to reset your password.')
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="bank-logo-container">
          <img src="/assets/login-logo2.png" alt="Tropical Bank" className="bank-logo" />
          <div className="login-brand-copy">
            <span className="login-kicker">NAVISION</span>
            <h2>Procurement Portal</h2>
            <p>Tropical Bank secure access</p>
          </div>
          <div className="login-signal-row" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="login-card email-login">
          <div className="login-header">
            <h1>Tropical Bank</h1>
            <p className="login-caption">Procurement System</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="identifier">Username or Email</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your username or email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="action-group">
              <button
                type="submit"
                className="login-btn primary"
                disabled={isLoading || !identifier || !password}
              >
                {isLoading ? 'Processing...' : 'LOG IN'}
              </button>

              <button type="button" className="secondary-btn" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>

            {message && <div className="message-box message-error">{message}</div>}
            {error && !message && <div className="message-box message-error">{error}</div>}
          </form>

        </div>
      </div>
    </div>
  )
}

export default Login
