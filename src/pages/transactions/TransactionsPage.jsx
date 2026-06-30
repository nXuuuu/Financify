import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { formatCurrency, formatDate } from '@/lib/format'
import AddTransactionModal from './AddTransactionModal'

export default function TransactionsPage() {
  const { transactions, accounts, deleteTransaction } = useFinance()
  const [open, setOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const accountName = (id) => accounts.find((a) => a.id === id)?.name ?? '—'

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (search && !`${t.merchant} ${t.category}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, typeFilter, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Transactions</h1>
          <p className="text-sm text-muted">Every entry, accounted for.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Add transaction
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search merchant or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px]"
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-5 py-3 font-normal">Date</th>
              <th className="px-5 py-3 font-normal">Merchant</th>
              <th className="px-5 py-3 font-normal">Category</th>
              <th className="px-5 py-3 font-normal">Account</th>
              <th className="px-5 py-3 text-right font-normal">Amount</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted">{formatDate(t.date)}</td>
                <td className="px-5 py-3">{t.merchant}</td>
                <td className="px-5 py-3 text-muted">{t.category}</td>
                <td className="px-5 py-3 text-muted">{accountName(t.account_id)}</td>
                <td
                  className={`px-5 py-3 text-right font-mono font-tabular ${
                    t.type === 'income' ? 'text-positive' : 'text-text'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount)}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="text-muted hover:text-negative"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted">
                  No transactions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <AddTransactionModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
