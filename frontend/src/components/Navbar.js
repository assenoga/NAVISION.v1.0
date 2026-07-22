import { Link } from 'react-router-dom'
import { useLogout } from '../hooks/useLogout'
import { useAuthContext } from '../hooks/useAuthContext'
import Icon from './Icon'

const Navbar = () => {
  const { logout } = useLogout()
  const { user } = useAuthContext()

  const handleClick = (e) => {
    e.preventDefault()
    logout()
  }

  return (
    <header>
      <div className="container">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-mark">‹‹</span>
        </Link>
        <nav>
          {user && (
            <div className="navbar-actions">
              <div className="nav-user-cluster">
                <Link to="/notifications" className="nav-icon-link" title="Notifications"><Icon name="bell" title="Notifications" /></Link>
                <span className="nav-user-name">Hi, {user.fullName || user.username || user.email}</span>
              </div>
              <div className="nav-control-cluster">
                <button onClick={handleClick}>Log Out</button>
              </div>
            </div>
          )}
          {!user && (
            <div className="navbar-actions">
              <Link to="/login" className="nav-login-link">Login</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
