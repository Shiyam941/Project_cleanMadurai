import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Header({ user }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const navConfig = {
    user: [
      { to: '/user', label: t('nav.dashboard') },
      { to: '/report', label: t('nav.report') },
    ],
    officer: [
      { to: '/officer', label: t('nav.dashboard') },
    ],
    admin: [
      { to: '/admin', label: t('nav.dashboard') },
    ],
  }

  const links = navConfig[user?.role] ?? []

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <>
      <header className="app-header">
        <div>
          <p className="portal-label">{t('app.title')}</p>
          <h1>{t('app.portalName')}</h1>
          <p className="portal-subtitle">{user?.role === 'admin' ? 'Administrative Overlook' : 'Smart Civic Sanitation System'}</p>
        </div>
        <div className="header-account">
          <button
            onClick={toggleLanguage}
            className="btn ghost"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'var(--color-surface-solid)'
            }}
          >
            {i18n.language === 'en' ? 'தமிழ்' : 'English'}
          </button>

          <Link to="/profile" className="profile-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'inherit', textDecoration: 'none' }}>
            <div className="account-details">
              <p className="account-name">{user?.name || t('auth.citizenRole')}</p>
              <p className="account-role">{t(`auth.${user?.role}Role`) || user?.role?.toUpperCase()}</p>
              <p className="account-ward">{t('auth.ward')}: {user?.ward || 'N/A'}</p>
            </div>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent)' }}
              />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-accent)', border: '2px solid var(--color-accent)' }}>
                {(user?.name || 'C')[0].toUpperCase()}
              </div>
            )}
          </Link>
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
          <Link
            to="/profile"
            className={location.pathname === '/profile' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.profile')}
          </Link>
        </nav>
      )}
    </>
  )
}

export default Header
