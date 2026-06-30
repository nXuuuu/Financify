import { useState } from 'react'
import { Plus, Trash2, CreditCard, PiggyBank, Landmark } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'
import AddAccountModal from './AddAccountModal'

const ICONS = { checking: Landmark, saving: PiggyBank, credit: CreditCard }

export default function WalletPage() {
  const { accounts, deleteAccount } = useFinance()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Wallet</h1>
          <p className="text-sm text-muted">Your accounts, in one vault.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Add account
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => {
          const Icon = ICONS[a.type] ?? Landmark
          return (
            <Card key={a.id} className="relative">
              <button
                onClick={() => deleteAccount(a.id)}
                className="absolute right-4 top-4 text-muted hover:text-negative"
                title="Remove account"
              >
                <Trash2 size={15} />
              </button>
              <Icon size={20} className="text-brass" strokeWidth={1.75} />
              <p className="mt-3 text-sm text-muted">{a.name}</p>
              <p className="mt-1 font-mono text-2xl font-tabular">
                {formatCurrency(a.balance, a.currency)}
              </p>
              <p className="mt-2 text-xs capitalize text-muted">{a.type} · {a.currency}</p>
            </Card>
          )
        })}

        {accounts.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <p className="py-6 text-center text-sm text-muted">No accounts yet — add your first one.</p>
          </Card>
        )}
      </div>

      <AddAccountModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
