import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import './finai-sidebar.css'

export default function AppLayout() {
  const { signOut, user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  // Close the drawer whenever the route changes (e.g. after tapping a nav link on mobile)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navLinkClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <div className="finai-app">
      {/* Mobile top bar: brand + hamburger, hidden on desktop */}
      <header className="mobile-topbar">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          )}
        </button>
        <div className="brand-name">
          <img src="/financify-logo.png" alt="Financify" width="20" height="20" />
          Financify
        </div>
        
      </header>

      {/* Backdrop overlay, only rendered/visible on mobile when drawer is open */}
      <div
        className={`sidebar-overlay${menuOpen ? ' visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-name">
            <img src="/financify-logo.png" alt="Financify" width="20" height="20" />
            Financify
          </div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Main</div>
          <NavLink to="/dashboard" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            Overview
          </NavLink>
          <NavLink to="/transactions" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
            Transactions
          </NavLink>
          <NavLink to="/analytics" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
            Analytics
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-label">Money Control</div>
          <NavLink to="/goals" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
            Goals
          </NavLink>
          <NavLink to="/wallet" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M17 12h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a2 2 0 0 1 0-4z" /></svg>
            Wallet
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-label">Others</div>
          <NavLink to="/settings" className={navLinkClass}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
            Settings
          </NavLink>
        </div>

        <div className='nav-group nav-group-special'>

          {/* Profile Block (Left) */}
          <div className="profile">
            <div className="avatar">{name[0]?.toUpperCase()}</div>
            <div className="profile-info">
              <span className="profile-name">{name}</span>
            </div>
          </div>

          {/* Logout Button + Tooltip (Right) */}
          <button
            className="nav-item nav-item-special logout-btn"
            onClick={signOut}
            aria-label="Log Out"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>

            {/* Tooltip text element */}
            <span className="tooltip-text">Log Out</span>
          </button>

        </div>
      </aside>

      <main className="finai-main">
        <Outlet />
      </main>
    </div>
  )
}