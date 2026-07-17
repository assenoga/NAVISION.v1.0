import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'
import Icon from './Icon'

const Sidebar = () => {
  const { user } = useAuthContext()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="sidebar-brand" aria-label="Tropical Bank dashboard">
        <img src="/assets/login-logo2.png" alt="Tropical Bank" />
      </Link>
      <h3>Navigation</h3>
      <ul>
        <li>
          <Link to="/dashboard" className={isActive('/dashboard')}>
            <Icon name="dashboard" />
            Dashboard
          </Link>
        </li>
        {user?.role === 'Procurement Officer' && (
          <>
            <li>
              <Link to="/purchase-requests" className={isActive('/purchase-requests')}>
                <Icon name="requests" />
                Purchase Requests
              </Link>
            </li>
            <li>
              <Link to="/vendors" className={isActive('/vendors')}>
                <Icon name="vendors" />
                Vendors
              </Link>
            </li>
          </>
        )}
        {['Executive Director', 'Chief Finance Officer', 'Managing Director'].includes(user?.role) && (
          <li>
            <Link to="/approvals" className={isActive('/approvals')}>
              <Icon name="approvals" />
              {user?.role === 'Executive Director'
                ? 'ED Approvals'
                : user?.role === 'Chief Finance Officer'
                  ? 'CFO Approvals'
                  : 'MD Approvals'}
            </Link>
          </li>
        )}
        <li>
          <Link to="/reports" className={isActive('/reports')}>
            <Icon name="reports" />
            Reports
          </Link>
        </li>
        <li>
          <Link to="/documents" className={isActive('/documents')}>
            <Icon name="documents" />
            Documents
          </Link>
        </li>
        <li>
          <Link to="/notifications" className={isActive('/notifications')}>
            <Icon name="bell" />
            Notifications
          </Link>
        </li>
        {user?.role === 'System Administrator' && (
          <li>
            <Link to="/settings" className={isActive('/settings')}>
              <Icon name="settings" />
              Settings
            </Link>
          </li>
        )}
      </ul>
      <div className="sidebar-card">
        <h4><Icon name="shield" /> Quick Stats</h4>
        <p>Role: {user?.role}</p>
      </div>
    </aside>
  )
}

export default Sidebar
