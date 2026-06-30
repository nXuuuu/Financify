import { Vault } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-ink">
      <div className="hidden flex-1 flex-col justify-between bg-surface p-12 md:flex">
        <div className="flex items-center gap-2">
          <Vault size={22} className="text-brass" strokeWidth={1.75} />
          <span className="font-display text-xl">FinVault</span>
        </div>
        <div>
          <p className="mb-2 text-sm uppercase tracking-widest text-brass">Smart finance management</p>
          <h1 className="max-w-md font-display text-4xl leading-tight text-text">
            Track, budget, <br /> and grow your wealth.
          </h1>
        </div>
        <p className="text-xs text-muted">Every entry, accounted for.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
