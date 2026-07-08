import { useMemo, useState } from 'react'
import {
  Plus, X, MoreVertical, TrendingUp, TrendingDown, AlertTriangle,
  UtensilsCrossed, Car, ShoppingBag, Receipt, Film, Wallet2, Tag,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import './finai/budget.css'

const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const CAT_COLORS = ['#14532d', '#6b7280', '#4ade80', '#052e16', '#a7d9b6', '#6366f1', '#f59e0b', '#dc2626']
const CAT_ICONS = {
  'Dining Out': UtensilsCrossed, Food: UtensilsCrossed, Groceries: ShoppingBag,
  Transport: Car, Shopping: ShoppingBag, Utilities: Receipt, Bills: Receipt,
  Entertainment: Film, Housing: Receipt,
}
const catIcon = (cat) => CAT_ICONS[cat] || Tag
const catColor = (cat, list) => CAT_COLORS[list.indexOf(cat) % CAT_COLORS.length]

const inRange = (dateStr, start, end) => { const d = new Date(dateStr); return d >= start && d <= end }

function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function statusOf(spent, limit) {
  if (spent <= 0) return 'no_spend'
  const pct = (spent / limit) * 100
  if (pct > 100) return 'exceeded'
  if (pct >= 90) return 'nearly_full'
  return 'on_track'
}
const STATUS_LABEL = { on_track: 'On Track', nearly_full: 'Nearly Full', exceeded: 'Exceeded', no_spend: 'No Spending' }
const barColor = (pct) => (pct > 100 ? 'var(--red)' : pct >= 90 ? '#f97316' : pct >= 75 ? '#f59e0b' : 'var(--green-dark)')

const PERIOD_TABS = [
  { id: 'current', label: 'Current Month' },
  { id: 'previous', label: 'Previous Month' },
  { id: 'custom', label: 'Custom Range' },
]
const SORTS = [
  { id: 'exceeded', label: 'Exceeded First' },
  { id: 'mostSpent', label: 'Most Spent' },
  { id: 'highestPct', label: 'Highest % Used' },
  { id: 'remaining', label: 'Remaining Amount' },
  { id: 'alpha', label: 'Alphabetical' },
]

function BudgetForm({ initial, categories, accounts, onCancel, onSave }) {
  const [form, setForm] = useState(initial || {
    category: categories[0] || '', limit_amount: '', period: 'monthly',
    wallet_id: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '',
  })
  const [err, setErr] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  function submit() {
    if (!form.category) return setErr('Select a category')
    if (!form.limit_amount || Number(form.limit_amount) <= 0) return setErr('Enter a budget amount greater than 0')
    onSave({
      category: form.category,
      limit_amount: Number(form.limit_amount),
      period: form.period,
      wallet_id: form.wallet_id || null,
      start_date: form.start_date || new Date().toISOString().slice(0, 10),
      end_date: form.end_date || null,
      notes: form.notes || '',
    })
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card">
        <div className="modal-head"><h3>{initial ? 'Edit Budget' : 'Create Budget'}</h3><button className="modal-close" onClick={onCancel}><X size={14} /></button></div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Budget Amount</label>
            <input className="form-input" type="number" min="0.01" step="0.01" value={form.limit_amount} onChange={(e) => set({ limit_amount: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Period</label>
            <select className="form-select" value={form.period} onChange={(e) => set({ period: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date (optional)</label>
            <input className="form-input" type="date" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Wallet (optional)</label>
          <select className="form-select" value={form.wallet_id} onChange={(e) => set({ wallet_id: e.target.value })}>
            <option value="">All Wallets</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-input" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional" />
        </div>

        {err && <span className="field-error">{err}</span>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={submit}>{initial ? 'Save Changes' : 'Create Budget'}</button>
        </div>
      </div>
    </div>
  )
}

export default function BudgetPage() {
  const { budgets, transactions, accounts, categories, addBudget, updateBudget, deleteBudget, duplicateBudget } = useFinance()

  const [periodTab, setPeriodTab] = useState('current')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [statusTab, setStatusTab] = useState('active')
  const [walletFilter, setWalletFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('exceeded')
  const [modal, setModal] = useState(null) // 'create' | budget object for edit
  const [openMenu, setOpenMenu] = useState(null)

  const range = useMemo(() => {
    if (periodTab === 'previous') return monthRange(1)
    if (periodTab === 'custom' && customRange.start && customRange.end) {
      return { start: new Date(customRange.start), end: new Date(new Date(customRange.end).setHours(23, 59, 59, 999)) }
    }
    return monthRange(0)
  }, [periodTab, customRange])

  const scopedBudgets = useMemo(
    () => budgets.filter((b) => (statusTab === 'all' ? true : b.status === statusTab)),
    [budgets, statusTab]
  )

  const rows = useMemo(() => {
    return scopedBudgets
      .filter((b) => walletFilter === 'all' || b.wallet_id === walletFilter)
      .filter((b) => categoryFilter === 'all' || b.category === categoryFilter)
      .map((b) => {
        const spent = transactions
          .filter((t) => t.type === 'expense' && t.category === b.category)
          .filter((t) => !b.wallet_id || t.account_id === b.wallet_id)
          .filter((t) => inRange(t.date, range.start, range.end))
          .reduce((s, t) => s + Number(t.amount), 0)
        const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
        return { ...b, spent, pct, remaining: b.limit_amount - spent, status: statusOf(spent, b.limit_amount) }
      })
  }, [scopedBudgets, transactions, range, walletFilter, categoryFilter])

  const sorted = useMemo(() => {
    const list = [...rows]
    if (sortBy === 'mostSpent') return list.sort((a, b) => b.spent - a.spent)
    if (sortBy === 'highestPct') return list.sort((a, b) => b.pct - a.pct)
    if (sortBy === 'alpha') return list.sort((a, b) => a.category.localeCompare(b.category))
    if (sortBy === 'remaining') return list.sort((a, b) => a.remaining - b.remaining)
    return list.sort((a, b) => (b.status === 'exceeded') - (a.status === 'exceeded') || b.pct - a.pct)
  }, [rows, sortBy])

  const totals = useMemo(() => {
    const totalBudget = rows.reduce((s, r) => s + Number(r.limit_amount), 0)
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
    const overCount = rows.filter((r) => r.status === 'exceeded').length
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent, overCount }
  }, [rows])

  const donut = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.spent, 0) || 1
    return rows.filter((r) => r.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .map((r) => ({ name: r.category, value: r.spent, pct: Math.round((r.spent / total) * 100) }))
  }, [rows])

  const alerts = useMemo(() => {
    const list = []
    rows.forEach((r) => {
      if (r.status === 'exceeded') list.push({ id: `${r.id}-ex`, tone: 'warn', text: `${r.category} budget exceeded by ${fmt(r.spent - r.limit_amount)}.` })
      else if (r.pct >= 90) list.push({ id: `${r.id}-nf`, tone: 'warn', text: `${r.category} budget is ${r.pct}% used.` })
      else if (r.remaining > 0 && r.remaining <= r.limit_amount * 0.1 && r.spent > 0) list.push({ id: `${r.id}-lo`, tone: 'warn', text: `${r.category} budget has ${fmt(r.remaining)} remaining.` })
    })
    return list
  }, [rows])

  const history = useMemo(() => {
    const activeBudgets = budgets.filter((b) => b.status !== 'archived')
    if (!activeBudgets.length) return []
    const totalBudget = activeBudgets.reduce((s, b) => s + Number(b.limit_amount), 0)
    return Array.from({ length: 4 }, (_, idx) => {
      const offset = 3 - idx
      const { start, end } = monthRange(offset)
      const spent = activeBudgets.reduce((sum, b) => {
        const catSpent = transactions
          .filter((t) => t.type === 'expense' && t.category === b.category)
          .filter((t) => !b.wallet_id || t.account_id === b.wallet_id)
          .filter((t) => inRange(t.date, start, end))
          .reduce((s, t) => s + Number(t.amount), 0)
        return sum + catSpent
      }, 0)
      const pct = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0
      const status = offset === 0 ? 'Current' : pct > 100 ? 'Exceeded' : 'Completed'
      return { label: start.toLocaleDateString('en-US', { month: 'short' }), pct, status }
    })
  }, [budgets, transactions])

  const categoryOptions = [...new Set(categories.expense)]

  function closeModal() { setModal(null) }
  async function handleSave(input) {
    if (modal && modal !== 'create') await updateBudget(modal.id, input)
    else await addBudget(input)
    closeModal()
  }
  async function handlePause(b) { await updateBudget(b.id, { status: b.status === 'paused' ? 'active' : 'paused' }); setOpenMenu(null) }
  async function handleArchive(b) { await updateBudget(b.id, { status: 'archived' }); setOpenMenu(null) }
  async function handleDuplicate(b) { await duplicateBudget(b); setOpenMenu(null) }
  async function handleDelete(b) { await deleteBudget(b.id); setOpenMenu(null) }

  return (
    <div className="finai-page">
      <div className="topbar">
        <div className="greeting"><div><h1>Budget</h1><p>Manage and monitor your spending limits</p></div></div>
        <div className="topbar-actions">
          <select className="filter-select" value={periodTab} onChange={(e) => setPeriodTab(e.target.value)}>
            {PERIOD_TABS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal('create')}><Plus size={15} /> Create Budget</button>
        </div>
      </div>

      {periodTab === 'custom' && (
        <div className="custom-range-row">
          <input className="form-input" type="date" value={customRange.start} onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))} />
          <span>to</span>
          <input className="form-input" type="date" value={customRange.end} onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))} />
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>No budgets yet</p>
          <p className="spending-total" style={{ marginBottom: 16 }}>Create your first budget to start tracking your spending.</p>
          <button className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }} onClick={() => setModal('create')}><Plus size={15} /> Create Budget</button>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div className="card stat-card"><span className="stat-label">Total Budget</span><div className="stat-amount">{fmt(totals.totalBudget)}</div></div>
            <div className="card stat-card"><span className="stat-label">Spent</span><div className="stat-amount">{fmt(totals.totalSpent)}</div></div>
            <div className="card stat-card"><span className="stat-label">Remaining</span><div className="stat-amount" style={{ color: totals.remaining < 0 ? 'var(--red)' : undefined }}>{fmt(totals.remaining)}</div></div>
            <div className="card stat-card"><span className="stat-label">Over Budget</span><div className="stat-amount" style={{ color: totals.overCount > 0 ? 'var(--red)' : undefined }}>{totals.overCount} {totals.overCount === 1 ? 'Category' : 'Categories'}</div></div>
          </div>

          {alerts.length > 0 && (
            <div className="card alerts-card">
              <div className="section-title"><h2>Budget Alerts</h2></div>
              <div className="alerts-list">
                {alerts.map((a) => <div className="alert-row" key={a.id}><AlertTriangle size={14} /> {a.text}</div>)}
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-title">
              <h2>Budget Progress</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select className="filter-select" value={statusTab} onChange={(e) => setStatusTab(e.target.value)}>
                  <option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option><option value="all">All</option>
                </select>
                <select className="filter-select" value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)}>
                  <option value="all">All Wallets</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {sorted.length === 0 ? (
              <p className="spending-total" style={{ padding: '20px 0' }}>No budgets match these filters.</p>
            ) : (
              <div className="budget-grid">
                {sorted.map((b) => {
                  const Icon = catIcon(b.category)
                  const pctClamped = Math.min(100, Math.max(0, b.pct))
                  return (
                    <div className="budget-card" key={b.id}>
                      <div className="budget-head">
                        <div className="budget-icon"><Icon size={16} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="budget-name">{b.category}</div>
                          <div className="budget-sub">{fmt(b.spent)} of {fmt(b.limit_amount)}{b.wallet_id ? ` · ${accounts.find((a) => a.id === b.wallet_id)?.name || ''}` : ''}</div>
                        </div>
                        <div className="goal-menu-wrap">
                          <button className="goal-menu-btn" onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}><MoreVertical size={15} /></button>
                          {openMenu === b.id && (
                            <>
                              <div className="goal-menu-backdrop" onClick={() => setOpenMenu(null)} />
                              <div className="goal-menu">
                                <button onClick={() => { setModal(b); setOpenMenu(null) }}>Edit</button>
                                <button onClick={() => handleDuplicate(b)}>Duplicate</button>
                                <button onClick={() => handlePause(b)}>{b.status === 'paused' ? 'Unpause' : 'Pause'}</button>
                                <button onClick={() => handleArchive(b)}>Archive</button>
                                <button className="danger" onClick={() => handleDelete(b)}>Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: pctClamped + '%', background: barColor(b.pct) }} />
                      </div>

                      <div className="budget-foot">
                        <span className="budget-pct">{b.pct}%</span>
                        <div className="budget-remaining">
                          <span className="label">Remaining</span>
                          <span className={b.remaining < 0 ? 'neg' : ''}>{fmt(b.remaining)}</span>
                        </div>
                        <span className={`badge badge-${b.status}`}>{STATUS_LABEL[b.status]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="section-title"><h2>Spending Breakdown</h2></div>
              {donut.length === 0 ? (
                <p className="spending-total" style={{ padding: '20px 0' }}>No spending recorded for this period.</p>
              ) : (
                <div className="legend-list">
                  {donut.map((d, i) => (
                    <div className="legend-row" key={d.name} style={{ cursor: 'default' }}>
                      <span className="legend-dot" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-amount">{fmt(d.value)}</span>
                      <span className="legend-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-title"><h2>Budget History</h2></div>
              {history.length === 0 ? (
                <p className="spending-total" style={{ padding: '20px 0' }}>No history yet.</p>
              ) : (
                <div className="history-list">
                  {history.map((h) => (
                    <div className="history-row" key={h.label}>
                      <span className="history-month">{h.label}</span>
                      <span className="history-pct">{h.pct}%</span>
                      <span className={`badge badge-${h.status === 'Exceeded' ? 'exceeded' : h.status === 'Current' ? 'on_track' : 'no_spend'}`}>{h.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {modal && (
        <BudgetForm
          initial={modal !== 'create' ? modal : null}
          categories={categoryOptions}
          accounts={accounts}
          onCancel={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}