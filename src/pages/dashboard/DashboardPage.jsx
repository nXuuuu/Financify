import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { Card } from '@/components/ui/Card'
import { formatCurrency, monthKey } from '@/lib/format'
import SpendingDonut from '@/components/charts/SpendingDonut'
import CashflowBar from '@/components/charts/CashflowBar'

export default function DashboardPage() {
  const { accounts, transactions, loading } = useFinance()

  const thisMonth = monthKey(new Date().toISOString())

  const { totalBalance, monthIncome, monthExpense, donutData, barData } = useMemo(() => {
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

    const monthTx = transactions.filter((t) => monthKey(t.date) === thisMonth)
    const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const monthExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    const byCategory = {}
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount)
      })
    const donutData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

    const months = {}
    transactions.forEach((t) => {
      const key = monthKey(t.date)
      months[key] = months[key] || { month: key.slice(5), income: 0, expense: 0 }
      if (t.type === 'income') months[key].income += Number(t.amount)
      if (t.type === 'expense') months[key].expense += Number(t.amount)
    })
    const barData = Object.values(months).slice(-6)

    return { totalBalance, monthIncome, monthExpense, donutData, barData }
  }, [accounts, transactions, thisMonth])

  if (loading) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">Dashboard</h1>
        <p className="text-sm text-muted">Your finances at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Total balance</span>
            <Wallet size={16} className="text-brass" />
          </div>
          <p className="mt-2 font-mono text-2xl font-tabular">{formatCurrency(totalBalance)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Income this month</span>
            <ArrowUpRight size={16} className="text-positive" />
          </div>
          <p className="mt-2 font-mono text-2xl font-tabular text-positive">{formatCurrency(monthIncome)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Expenses this month</span>
            <ArrowDownRight size={16} className="text-negative" />
          </div>
          <p className="mt-2 font-mono text-2xl font-tabular text-negative">{formatCurrency(monthExpense)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h3 className="mb-2 font-display text-lg">Cash flow</h3>
          <CashflowBar data={barData} />
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mb-2 font-display text-lg">Spending by category</h3>
          <SpendingDonut data={donutData} />
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-display text-lg">Recent transactions</h3>
        <div className="flex flex-col divide-y divide-border">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm">{t.merchant}</p>
                <p className="text-xs text-muted">{t.category}</p>
              </div>
              <p
                className={`font-mono text-sm font-tabular ${
                  t.type === 'income' ? 'text-positive' : 'text-text'
                }`}
              >
                {t.type === 'income' ? '+' : '-'}
                {formatCurrency(t.amount)}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">No transactions yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
