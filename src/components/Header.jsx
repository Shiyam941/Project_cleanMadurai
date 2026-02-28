import { Link, useLocation } from 'react-router-dom'

const navConfig = {
  user: [
    { to: '/user', label: 'Dashboard' },
    { to: '/report', label: 'Report Complaint' },
  ],
  officer: [
    { to: '/officer', label: 'Officer Desk' },
  ],
  admin: [
    { to: '/admin', label: 'Admin Panel' },
  ],
}

function Header({ user, onLogout }) {
  const location = useLocation()
  const links = navConfig[user?.role] ?? []

  return (
    <>
      <header className="app-header">
        <div>
          <p className="portal-label">Madurai City Municipal Corporation</p>
          <h1>Clean Madurai</h1>
          <p className="portal-subtitle">Smart Civic Sanitation Management System</p>
        </div>
        <div className="header-account">
          <div>
            <p className="account-name">{user?.name}</p>
            <p className="account-role">{user?.role?.toUpperCase()}</p>
            <p className="account-ward">Ward: {user?.ward || 'N/A'}</p>
          </div>
          <button type="button" className="btn secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      {links.length > 0 && (
        <nav className="app-nav">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'nav-link active' : 'nav-link'}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}

export default Header
