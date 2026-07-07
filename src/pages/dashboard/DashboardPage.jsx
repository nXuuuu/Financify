import { useMemo, useState, useEffect, useRef } from 'react'
import { Search, Bell, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Send, PlusCircle, ArrowDownToLine, CalendarClock, Coffee, AlertTriangle, X, PiggyBank, Target, Wallet2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFinance } from '@/context/FinanceContext'
import { useAuth } from '@/context/AuthContext'
import { monthKey } from '@/lib/format'
import './finai/dashboard.css'

const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CAT_COLORS = ['#14532d', '#6b7280', '#4ade80', '#052e16', '#a7d9b6', '#d9dfd6', '#6366f1', '#f59e0b']
const PERIODS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'quarter', label: 'Last 3 Months' },
  { id: 'year', label: 'This Year' },
]
const LOW_BALANCE_THRESHOLD = 50
const PERIOD_COMPARE_LABEL = {
  week: 'vs last week',
  month: 'vs last month',
  lastMonth: 'vs previous month',
  quarter: 'vs last quarter',
  year: 'vs last year',
}

function getRange(period) {
  const now = new Date()
  const start = new Date(now), end = new Date(now)
  end.setHours(23, 59, 59, 999)
  if (period === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0) }
  if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
  if (period === 'lastMonth') {
    start.setMonth(now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0)
    end.setDate(0); end.setHours(23, 59, 59, 999)
  }
  if (period === 'quarter') { start.setMonth(now.getMonth() - 3, 1); start.setHours(0, 0, 0, 0) }
  if (period === 'year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0) }
  const spanMs = end - start
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - spanMs)
  return { start, end, prevStart, prevEnd }
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

function sumBy(txs, type) {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0)
}

function pct(curr, prev) {
  if (!prev) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / Math.abs(prev)) * 100)
}

function Donut({ data, selected, hovered, onSlice }) {
  const r = 80, cx = 100, cy = 100, sw = 30
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let acc = 0
  return (
    <svg viewBox="0 0 200 200" width="200" height="200">
      {data.map((d) => {
        const start = (acc / total) * 2 * Math.PI - Math.PI / 2
        acc += d.value
        const end = (acc / total) * 2 * Math.PI - Math.PI / 2
        const large = end - start > Math.PI ? 1 : 0
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
        const active = !selected && !hovered ? true : selected === d.name || hovered === d.name
        return (
          <path
            key={d.name}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none" stroke={d.color} strokeWidth={active ? sw : sw - 8}
            strokeLinecap="round" opacity={active ? 1 : 0.35}
            style={{ cursor: 'pointer', transition: 'all .18s ease' }}
            onClick={() => onSlice(d.name)}
            onMouseEnter={(e) => onSlice.hover(d, e)}
            onMouseLeave={() => onSlice.hover(null)}
          />
        )
      })}
    </svg>
  )
}

function BreakdownModal({ title, rows, onClose }) {
  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head"><h3>{title}</h3><button className="modal-close" onClick={onClose}><X size={14} /></button></div>
        <div className="rt-list">
          {rows.length === 0 && <p className="spending-total">Nothing to show for this period.</p>}
          {rows.map((r) => (
            <div className="rt-row" key={r.label}>
              <div className="rt-info"><div className="rt-name">{r.label}</div>{r.sub && <div className="rt-date">{r.sub}</div>}</div>
              <div className="rt-amt">{fmt(r.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TX_META = {
  income: { title: 'Add Income', type: 'income', defaultCategory: 'Other Income' },
  expense: { title: 'Add Expense', type: 'expense', defaultCategory: 'Other' },
  savings: { title: 'Add Savings', type: 'expense', defaultCategory: 'Savings' },
}

function TransactionModal({ kind, categories, accounts, onClose, onSave }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), account_id: accounts[0]?.id || '' })
  const [err, setErr] = useState('')
  const meta = TX_META[kind]
  const catList = meta.type === 'income' ? categories.income : categories.expense

  function set(patch) { setForm((f) => ({ ...f, ...patch })) }

  function submit() {
    const amount = Number(form.amount)
    if (!form.account_id) { setErr('Select a wallet'); return }
    if (!amount || amount <= 0) { setErr('Enter an amount greater than 0'); return }
    onSave({
      account_id: form.account_id,
      type: meta.type,
      category: kind === 'savings' ? 'Savings' : (form.category || meta.defaultCategory),
      merchant: kind === 'income' ? (form.source || 'Income') : (form.merchant || (kind === 'savings' ? 'Savings' : (form.category || meta.defaultCategory))),
      amount,
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      notes: form.notes || '',
    })
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head"><h3>{meta.title}</h3><button className="modal-close" onClick={onClose}><X size={14} /></button></div>

        <div className="form-group">
          <label className="form-label">Wallet</label>
          <select className="form-select" value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
            <option value="" disabled>Select…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={(e) => set({ amount: e.target.value })} />
        </div>

        {kind === 'income' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Income Source</label>
              <input className="form-input" value={form.source || ''} onChange={(e) => set({ source: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category || ''} onChange={(e) => set({ category: e.target.value })}>
                <option value="" disabled>Select…</option>
                {catList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {kind === 'expense' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category || ''} onChange={(e) => set({ category: e.target.value })}>
                <option value="" disabled>Select…</option>
                {catList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Merchant (optional)</label>
              <input className="form-input" value={form.merchant || ''} onChange={(e) => set({ merchant: e.target.value })} />
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date || ''} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        {err && <span className="field-error">{err}</span>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  )
}

function GoalContributionModal({ onClose, onCompleted }) {
  const { accounts, goals, contributeToGoalFromWallet } = useFinance()

  if (goals.length === 0) {
    return (
      <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card">
          <div className="modal-head"><h3>Add to Goal</h3><button className="modal-close" onClick={onClose}><X size={14} /></button></div>
          <p className="spending-total" style={{ marginBottom: 16 }}>You don't have any savings goals yet. Create one to start contributing.</p>
          <Link to="/goals" className="btn-primary" style={{ display: 'inline-flex' }} onClick={onClose}>+ Create Goal</Link>
        </div>
      </div>
    )
  }

  const [form, setForm] = useState({ account_id: accounts[0]?.id || '', goal_id: goals[0]?.id || '', date: new Date().toISOString().slice(0, 10) })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  function set(patch) { setForm((f) => ({ ...f, ...patch })); setErr('') }

  async function submit() {
    const amount = Number(form.amount)
    if (!form.account_id) return setErr('Select a wallet')
    if (!form.goal_id) return setErr('Select a goal')
    if (!amount || amount <= 0) return setErr('Enter an amount greater than 0')
    setBusy(true)
    const { error, completed } = await contributeToGoalFromWallet({
      account_id: form.account_id,
      goal_id: form.goal_id,
      amount,
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      note: form.note || '',
    })
    setBusy(false)
    if (error) { setErr(error.message || 'Something went wrong'); return }
    onCompleted(completed, goals.find((g) => g.id === form.goal_id)?.name)
  }

  const selectedAccount = accounts.find((a) => a.id === form.account_id)

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head"><h3>Add to Goal</h3><button className="modal-close" onClick={onClose}><X size={14} /></button></div>

        <div className="form-group">
          <label className="form-label">From Wallet</label>
          <select className="form-select" value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Savings Goal</label>
          <select className="form-select" value={form.goal_id} onChange={(e) => set({ goal_id: e.target.value })}>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name} ({fmt(g.saved_amount)} / {fmt(g.target_amount)})</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={(e) => set({ amount: e.target.value })} />
            {selectedAccount && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Available: {fmt(selectedAccount.balance)}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date || ''} onChange={(e) => set({ date: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <input className="form-input" value={form.note || ''} onChange={(e) => set({ note: e.target.value })} />
        </div>

        {err && <span className="field-error">{err}</span>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Processing…' : 'Contribute'}</button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { accounts, transactions, categories, goals, addTransaction, loading, error } = useFinance()
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  const [period, setPeriod] = useState('month')
  const [walletFilter, setWalletFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [hoverSlice, setHoverSlice] = useState(null)
  const [modal, setModal] = useState(null)
  const [txKind, setTxKind] = useState(null)
  const [cfView, setCfView] = useState('month')
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalSuccess, setGoalSuccess] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const scopedTx = useMemo(
    () => (walletFilter === 'all' ? transactions : transactions.filter((t) => t.account_id === walletFilter)),
    [transactions, walletFilter]
  )
  const scopedAccounts = useMemo(
    () => (walletFilter === 'all' ? accounts : accounts.filter((a) => a.id === walletFilter)),
    [accounts, walletFilter]
  )

  const { start, end, prevStart, prevEnd } = useMemo(() => getRange(period), [period])
  const periodTx = useMemo(() => scopedTx.filter((t) => inRange(t.date, start, end)), [scopedTx, start, end])
  const prevTx = useMemo(() => scopedTx.filter((t) => inRange(t.date, prevStart, prevEnd)), [scopedTx, prevStart, prevEnd])

  const balance = scopedAccounts.reduce((s, a) => s + Number(a.balance), 0)
  const monthIncome = sumBy(periodTx, 'income')
  const monthExpense = sumBy(periodTx, 'expense')
  const prevIncome = sumBy(prevTx, 'income')
  const prevExpense = sumBy(prevTx, 'expense')
  const savings = monthIncome - monthExpense
  const prevSavings = prevIncome - prevExpense

  const incomePct = pct(monthIncome, prevIncome)
  const expensePct = pct(monthExpense, prevExpense)
  const savingsPct = pct(savings, prevSavings)

  // Balance is a point-in-time snapshot, not a sum: compare current balance against
  // what the balance was at the end of the previous (equivalent) period — i.e.
  // the current balance minus everything that happened during the selected period.
  const balanceDelta = useMemo(() => pct(balance, balance - savings), [balance, savings])
  const compareLabel = PERIOD_COMPARE_LABEL[period] || 'vs previous period'

  const donut = useMemo(() => {
    const byCat = {}
    periodTx.filter((t) => t.type === 'expense').forEach((t) => {
      byCat[t.category] = byCat[t.category] || { value: 0, count: 0 }
      byCat[t.category].value += Number(t.amount)
      byCat[t.category].count += 1
    })
    const total = Object.values(byCat).reduce((s, v) => s + v.value, 0) || 1
    return Object.entries(byCat).sort((a, b) => b[1].value - a[1].value)
      .map(([name, v], i) => ({ name, value: v.value, count: v.count, pct: Math.round((v.value / total) * 100), color: CAT_COLORS[i % CAT_COLORS.length] }))
  }, [periodTx])

  useEffect(() => {
    if (selectedCategory && !donut.find((c) => c.name === selectedCategory)) {
      setSelectedCategory(null)
    }
  }, [walletFilter])

  const incomeBySource = useMemo(() => {
    const byCat = {}
    periodTx.filter((t) => t.type === 'income').forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount) })
    return Object.entries(byCat).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [periodTx])

  const balanceByType = useMemo(() => {
    const byType = {}
    scopedAccounts.forEach((a) => { byType[a.type] = (byType[a.type] || 0) + Number(a.balance) })
    return Object.entries(byType).map(([label, value]) => ({ label: label[0].toUpperCase() + label.slice(1), value }))
  }, [scopedAccounts])

  const cashflow = useMemo(() => {
    const now = new Date()
    const buckets = []
    if (cfView === 'week') {
      for (let i = 7; i >= 0; i--) {
        const s = new Date(now); s.setDate(now.getDate() - now.getDay() - i * 7); s.setHours(0, 0, 0, 0)
        const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
        buckets.push({ key: s.toISOString(), label: `${s.getMonth() + 1}/${s.getDate()}`, start: s, end: e })
      }
    } else if (cfView === 'year') {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i
        buckets.push({ key: y, label: String(y), start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) })
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        buckets.push({ key: monthKey(s.toISOString()), label: s.toLocaleDateString('en-US', { month: 'short' }), start: s, end: e })
      }
    }
    const data = buckets.map((b) => ({
      label: b.label,
      income: scopedTx.filter((t) => t.type === 'income' && inRange(t.date, b.start, b.end)).reduce((s, t) => s + Number(t.amount), 0),
      expense: scopedTx.filter((t) => t.type === 'expense' && inRange(t.date, b.start, b.end)).reduce((s, t) => s + Number(t.amount), 0),
    }))
    const avgI = data.reduce((s, d) => s + d.income, 0) / (data.length || 1)
    const avgE = data.reduce((s, d) => s + d.expense, 0) / (data.length || 1)
    return data.map((d) => ({ ...d, highIncome: d.income > avgI * 1.4, highExpense: d.expense > avgE * 1.4 }))
  }, [scopedTx, cfView])

  const recent = scopedTx.slice(0, 6)
  const topCat = donut[0]?.name || 'None'

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return transactions.filter((t) => t.merchant?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)).slice(0, 6)
  }, [searchQuery, transactions])

  const notifications = useMemo(() => {
    const list = []
    accounts.forEach((a) => {
      if (Number(a.balance) < LOW_BALANCE_THRESHOLD) list.push({ id: `low-${a.id}`, tone: 'warn', text: `Low balance in ${a.name}: ${fmt(a.balance)}` })
    })
    goals.forEach((g) => {
      const p = Math.round((Number(g.saved_amount) / Number(g.target_amount || 1)) * 100)
      if (p >= 100) list.push({ id: `goal-${g.id}`, tone: 'good', text: `🎉 Goal complete: ${g.name}` })
      else if (p >= 80) list.push({ id: `goal-near-${g.id}`, tone: 'good', text: `Almost there: ${g.name} is ${p}% funded` })
    })
    if (prevExpense > 0 && monthExpense > prevExpense * 1.3) {
      list.push({ id: 'spend-up', tone: 'warn', text: `Spending is up ${pct(monthExpense, prevExpense)}% vs last month` })
    }
    if (!list.length) list.push({ id: 'none', tone: 'neutral', text: "You're all caught up." })
    return list
  }, [accounts, goals, monthExpense, prevExpense])

  async function handleSaveTx(entry) {
    await addTransaction(entry)
    setTxKind(null)
  }

  if (loading) {
    return (
      <div className="finai-page">
        <div className="stat-row">{[1, 2, 3, 4].map((i) => <div key={i} className="card skeleton" style={{ height: 100 }} />)}</div>
        <div className="card skeleton" style={{ height: 260, marginTop: 18 }} />
      </div>
    )
  }

  return (
    <div className="finai-page">
      {error && <div className="error-banner"><AlertTriangle size={15} /> {error} — showing last known data.</div>}

      {goalSuccess && (
        <div className="card" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: goalSuccess.completed ? '#dcfce7' : undefined }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {goalSuccess.completed ? `🎉 "${goalSuccess.name}" is fully funded — goal complete!` : `Contribution added to "${goalSuccess.name}".`}
          </span>
          <button className="modal-close" onClick={() => setGoalSuccess(null)}><X size={14} /></button>
        </div>
      )}

      <div className="topbar">
        <div className="greeting">
          <div className="avatar">{name[0]?.toUpperCase()}</div>
          <div><h1>Welcome, {name} 👋</h1><p>Here's your financial overview for today</p></div>
        </div>
        <div className="topbar-actions">
          <select className="filter-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <div ref={searchRef} style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => { setSearchOpen((o) => !o); setNotifOpen(false) }}><Search size={17} /></button>
            {searchOpen && (
              <div className="modal-card" style={{ position: 'absolute', right: 0, top: 48, width: 280, padding: 14, zIndex: 70 }}>
                <input
                  className="form-input"
                  placeholder="Search transactions…"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: searchQuery ? 10 : 0 }}
                />
                {searchQuery && (
                  <div className="rt-list">
                    {searchResults.length === 0 && <p className="spending-total">No matches.</p>}
                    {searchResults.map((t) => (
                      <Link to="/transactions" key={t.id} className="rt-row" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setSearchOpen(false)}>
                        <div className="rt-info"><div className="rt-name">{t.merchant}</div><div className="rt-date">{new Date(t.date).toLocaleDateString()} · {t.category}</div></div>
                        <div className={`rt-amt ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => { setNotifOpen((o) => !o); setSearchOpen(false) }}><Bell size={17} /></button>
            {notifOpen && (
              <div className="modal-card" style={{ position: 'absolute', right: 0, top: 48, width: 280, padding: 14, zIndex: 70 }}>
                <div className="rt-list">
                  {notifications.map((n) => (
                    <div className="rt-row" key={n.id}>
                      <div className="rt-info"><div className="rt-name" style={{ color: n.tone === 'warn' ? 'var(--red)' : undefined }}>{n.text}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="card" style={{ marginBottom: 18, fontSize: 12.5, color: 'var(--muted)' }}>
          Add a wallet on the Wallet page before recording transactions.
        </div>
      )}

      {scopedTx.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>No transactions yet</p>
          <p className="spending-total" style={{ marginBottom: 16 }}>Add your first transaction to see your overview come to life.</p>
          <Link to="/transactions" className="btn-primary" style={{ display: 'inline-flex' }}>+ Add Transaction</Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="col-left">
            <div className="stat-row">
              <div className="card balance-card" style={{ cursor: 'pointer' }} onClick={() => setModal('balance')}>
                <div>
                  <select
                    className="label"
                    style={{ background: 'transparent', border: 'none', color: '#a9c3b3', font: 'inherit', cursor: 'pointer', padding: 0, appearance: 'auto' }}
                    value={walletFilter}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setWalletFilter(e.target.value)}
                  >
                    <option value="all" style={{ color: '#000' }}>All Wallets</option>
                    {accounts.map((a) => <option key={a.id} value={a.id} style={{ color: '#000' }}>{a.name}</option>)}
                  </select>
                  <div className="amount">{fmt(balance)}</div>
                </div>
                <span className={`trend-chip ${balanceDelta >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {balanceDelta >= 0 ? <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
                  {Math.abs(balanceDelta)}% <span className="trend-note">{compareLabel}</span>
                </span>
              </div>
              <div className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setModal('income')}>
                <div className="stat-top"><span className="stat-icon income"><ArrowUp size={14} /></span><span className="stat-label">Monthly Income</span></div>
                <div className="stat-amount">{fmt(monthIncome)}</div>
                <span className={`trend-chip on-light ${incomePct >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {incomePct >= 0 ? <TrendingUp size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
                  {Math.abs(incomePct)}% <span className="trend-note on-light">{compareLabel}</span>
                </span>
              </div>
              <div className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setModal('expense')}>
                <div className="stat-top"><span className="stat-icon expense"><ArrowDown size={14} /></span><span className="stat-label">Monthly Expenses</span></div>
                <div className="stat-amount">{fmt(monthExpense)}</div>
                <span className={`trend-chip on-light ${expensePct <= 0 ? 'trend-up' : 'trend-down'}`}>
                  {expensePct >= 0 ? <TrendingUp size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
                  {Math.abs(expensePct)}% <span className="trend-note on-light">{compareLabel}</span>
                </span>
              </div>
              <div className="card stat-card" title={`Savings = Income (${fmt(monthIncome)}) − Expenses (${fmt(monthExpense)})`}>
                <div className="stat-top"><span className="stat-icon savings"><PiggyBank size={14} /></span><span className="stat-label">Monthly Savings</span></div>
                <div className="stat-amount">{fmt(savings)}</div>
                <span className={`trend-chip on-light ${savings >= prevSavings ? 'trend-up' : 'trend-down'}`}>
                  {savingsPct >= 0 ? <TrendingUp size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
                  {Math.abs(savingsPct)}% <span className="trend-note on-light">{compareLabel}</span>
                </span>
              </div>
            </div>

            <div className="card grow-card" style={{ position: 'relative' }} onClick={(e) => e.target === e.currentTarget && setSelectedCategory(null)}>
              <div className="section-title"><h2>Spending Overview</h2><span className="week-pill">{PERIODS.find((p) => p.id === period).label}</span></div>

              {donut.length === 0 ? (
                <p className="spending-total" style={{ padding: '30px 0' }}>No expenses in this period.</p>
              ) : (
                <div className="donut-wrap">
                  <div className="donut-holder">
                    <Donut
                      data={donut}
                      selected={selectedCategory}
                      hovered={hoverSlice?.name}
                      onSlice={Object.assign((n) => setSelectedCategory((c) => (c === n ? null : n)), {
                        hover: (d, e) => setHoverSlice(d ? { ...d, x: e.clientX, y: e.clientY } : null),
                      })}
                    />
                    <div className="donut-center">
                      <span className="k1">{selectedCategory ? 'Selected' : 'Top Category'}</span>
                      <span className="k2">{selectedCategory || topCat}</span>
                    </div>
                  </div>

                  {!selectedCategory ? (
                    <div className="legend-panel">
                      <div className="spending-total">Total spent</div>
                      <div className="spending-amount">{fmt(monthExpense)}</div>
                      <div className="legend-list">
                        {donut.map((c) => (
                          <button key={c.name} className="legend-row" onClick={() => setSelectedCategory(c.name)}>
                            <span className="legend-dot" style={{ background: c.color }} />
                            <span className="legend-name">{c.name}</span>
                            <div className='legend-info'>
                              <span className="legend-amount">{fmt(c.value)}</span>
                              <span className="legend-pct">{c.pct}%</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="legend-panel fade-enter">
                      <div className="detail-header">
                        <div className="detail-heading">
                          <div className="detail-title">
                            <span className="detail-dot" style={{ background: donut.find((c) => c.name === selectedCategory)?.color }} />
                            {selectedCategory}
                          </div>
                          <div className="detail-sub">
                            {fmt(donut.find((c) => c.name === selectedCategory)?.value || 0)} · {donut.find((c) => c.name === selectedCategory)?.count || 0} transactions
                          </div>
                        </div>
                        <button className="link-all" style={{ marginLeft: 'auto' }} onClick={() => setSelectedCategory(null)}>All Categories</button>
                      </div>
                      <div className="txn-detail-list">
                        {periodTx.filter((t) => t.type === 'expense' && t.category === selectedCategory)
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((t) => (
                            <div className="txn-row" key={t.id}>
                              <div className="txn-icon"><Coffee size={14} /></div>
                              <div className="txn-info">
                                <div className="txn-name">{t.merchant}</div>
                                <div className="txn-date">{new Date(t.date).toLocaleDateString()}</div>
                              </div>
                              <div className="txn-amt">-{fmt(t.amount)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hoverSlice && (
                <div className="chart-tooltip visible" style={{ left: hoverSlice.x, top: hoverSlice.y, position: 'fixed', transform: 'translate(-50%, calc(-100% - 12px))' }}>
                  <div className="tt-row"><span className="tt-dot" style={{ background: hoverSlice.color }} /><strong>{hoverSlice.name}</strong></div>
                  {fmt(hoverSlice.value)} · {hoverSlice.pct}% · {hoverSlice.count} tx
                </div>
              )}
            </div>

          </div>

          <div className="col-right">
            <div className="card">
              <div className="section-title"><h2>Quick Actions</h2></div>
              <div className="quick-grid">
                <button className="quick-item" onClick={() => setTxKind('income')}><span className="qi-icon"><ArrowUp size={16} /></span>Add Income</button>
                <button className="quick-item" onClick={() => setTxKind('expense')}><span className="qi-icon"><ArrowDown size={16} /></span>Add Expense</button>
                <button className="quick-item" onClick={() => setTxKind('savings')}><span className="qi-icon"><PiggyBank size={16} /></span>Add Savings</button>
                <button className="quick-item" onClick={() => setGoalModalOpen(true)}><span className="qi-icon"><Target size={16} /></span>Add to Goal</button>
              </div>
            </div>

            <div className="card grow-card">
              <div className="section-title"><h2>Recent Transactions</h2></div>
              <div className="rt-list">
                {recent.map((t) => (
                  <div className={`rt-row ${selectedCategory && t.category === selectedCategory ? 'rt-row-hl' : selectedCategory ? 'rt-row-dim' : ''}`} key={t.id}>
                    <div className={`rt-icon ${t.type === 'income' ? 'deposit' : 'coffee'}`}>{t.type === 'income' ? <ArrowUp size={15} /> : <Coffee size={15} />}</div>
                    <div className="rt-info"><div className="rt-name">{t.merchant}</div><div className="rt-date">{new Date(t.date).toLocaleString()}</div></div>
                    <div className={`rt-amt ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</div>
                  </div>
                ))}
                {recent.length === 0 && <p className="spending-total">No transactions yet.</p>}
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Link to="/transactions" className="link-all">View All</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'balance' && <BreakdownModal title="Balance Breakdown" rows={balanceByType} onClose={() => setModal(null)} />}
      {modal === 'income' && <BreakdownModal title="Income by Source" rows={incomeBySource} onClose={() => setModal(null)} />}
      {modal === 'expense' && <BreakdownModal title="Expenses by Category" rows={donut.map((d) => ({ label: d.name, value: d.value, sub: `${d.count} transactions · ${d.pct}%` }))} onClose={() => setModal(null)} />}

      {txKind && (
        <TransactionModal
          kind={txKind}
          categories={categories}
          accounts={accounts}
          onClose={() => setTxKind(null)}
          onSave={handleSaveTx}
        />
      )}

      {goalModalOpen && (
        <GoalContributionModal
          onClose={() => setGoalModalOpen(false)}
          onCompleted={(completed, name) => { setGoalModalOpen(false); setGoalSuccess({ completed, name }) }}
        />
      )}
    </div>
  )
}
