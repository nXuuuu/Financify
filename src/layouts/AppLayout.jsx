import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Wallet, LogOut, Vault } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
]

function NavItem({ to, label, icon: Icon, mobile }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        mobile
          ? `flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              isActive ? 'text-brass' : 'text-muted'
            }`
          : `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-surface-2 text-brass'
                : 'text-muted hover:bg-surface-2 hover:text-text'
            }`
      }
    >
      <Icon size={mobile ? 20 : 18} strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'

  return (
    <div className="flex min-h-screen bg-ink text-text">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <Vault size={20} className="text-brass" strokeWidth={1.75} />
          <span className="font-display text-lg tracking-tight">FinVault</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="ledger-rule mx-3" />
        <div className="flex items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-muted transition-colors hover:text-negative" title="Sign out">
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Vault size={18} className="text-brass" strokeWidth={1.75} />
            <span className="font-display text-base">FinVault</span>
          </div>
          <button onClick={signOut} className="text-muted hover:text-negative">
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} mobile />
          ))}
        </nav>
      </div>
    </div>
  )
}
