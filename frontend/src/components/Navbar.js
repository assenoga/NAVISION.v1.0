import { Link } from 'react-router-dom'
import { useLogout } from '../hooks/useLogout'
import { useAuthContext } from '../hooks/useAuthContext'
import { useTheme } from '../context/ThemeContext'
import Icon from './Icon'

const Navbar = () => {
  const { logout } = useLogout()
  const { user } = useAuthContext()
  const { theme, toggleTheme } = useTheme()

  const handleClick = (e) => {
    e.preventDefault()
    logout()
  }

  const handleThemeToggle = () => {
    toggleTheme()
  }

  return (
    <header>
      <div className="container">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-mark">N</span>
          <h1>NAVISION</h1>
          <span className="nav-brand-subtitle">Tropical Bank</span>
        </Link>
        <nav>
          {user && (
            <div className="navbar-actions">
              <div className="nav-user-cluster">
                <Link to="/notifications" className="nav-icon-link" title="Notifications"><Icon name="bell" title="Notifications" /></Link>
                <span className="nav-user-name">{user.fullName || user.email}</span>
                <span className="role-pill">{user.role}</span>
              </div>
              <div className="nav-control-cluster">
                <button className="theme-toggle" onClick={handleThemeToggle} title="Toggle theme">
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <span className="nav-system-pill">Secure session</span>
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
