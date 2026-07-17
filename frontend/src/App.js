import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './hooks/useAuthContext'
import Dashboard from './pages/Dashboard'
import PurchaseRequests from './pages/PurchaseRequests'
import VendorManagement from './pages/VendorManagement'
import Approvals from './pages/Approvals'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Documents from './pages/Documents'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'
import ForcePasswordChange from './components/ForcePasswordChange'
import Login from './pages/Login'

function App() {
  const { user } = useAuthContext()

  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <div className="pages">
          {user?.mustChangePassword ? (
            <ForcePasswordChange />
          ) : (
            <Routes>
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route
                path="/purchase-requests"
                element={user && user.role === 'Procurement Officer' ? (
                  <PurchaseRequests />
                ) : (
                  <Navigate to="/dashboard" />
                )}
              />
              <Route
                path="/vendors"
                element={user && user.role === 'Procurement Officer' ? (
                  <VendorManagement />
                ) : (
                  <Navigate to="/dashboard" />
                )}
              />
              <Route
                path="/approvals"
                element={
                  user && ['Executive Director', 'Chief Finance Officer', 'Managing Director'].includes(user.role) ? (
                    <Approvals />
                  ) : (
                    <Navigate to="/dashboard" />
                  )
                }
              />
              <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
              <Route path="/documents" element={user ? <Documents /> : <Navigate to="/login" />} />
              <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />
              <Route
                path="/settings"
                element={
                  user && user.role === 'System Administrator' ? (
                    <Settings />
                  ) : (
                    <Navigate to="/dashboard" />
                  )
                }
              />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            </Routes>
          )}
        </div>
        {user && (
          <footer className="app-footer">
            <span>2026 © NAVISION</span>
            <span>Powered by: <strong>Manam Infotech</strong></span>
          </footer>
        )}
      </BrowserRouter>
    </div>
  )
}

export default App
