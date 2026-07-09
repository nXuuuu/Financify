import { useMemo, useState, useRef } from 'react'
import { ChartNoAxesCombined, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, RefreshCw, Download, AlertTriangle, PiggyBank, Tag, CalendarClock, Wallet2 } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatCurrency } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader'
import SkeletonCard from '@/components/ui/SkeletonCard'
import './finai/analytics.css'

const CAT_PALETTE = ['#14532d', '#6b7280', '#4ade80', '#052e16', '#a7d9b6', '#6366f1', '#f59e0b', '#dc2626']

function toCsv(rows) {
  const header = ['Date', 'Type', 'Category', 'Merchant', 'Amount']
  const lines = rows.map((t) => [
    new Date(t.date).toISOString().slice(0, 10),
    t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.merchant || '').replace(/"/g, '""')}"`,
    t.type === 'income' ? t.amount : -t.amount,
  ].join(','))
  return [header.join(','), ...lines].join('\n')
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const fmt = (n) => formatCurrency(n || 0)
const fmtAxis = (n) => {
  const v = Number(n || 0)
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
  return `${sign}$${Math.round(abs)}`
}
const pctChange = (curr, prev) => { if (!prev) return curr > 0 ? 100 : 0; const pctVal = Math.round(((curr - prev) / Math.abs(prev)) * 100); return Math.min(999, Math.max(-999, pctVal)) }
const sumBy = (txs, type) => txs.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0)
const inRange = (dateStr, start, end) => { const d = new Date(dateStr); return d >= start && d <= end }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const monthRange = (offset = 0) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
  return { start, end }
}
const balanceAt = (txs, currentBalance, date) => {
  const after = txs.filter((t) => new Date(t.date) > date)
    .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
  return currentBalance - after
}
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function getBuckets(period) {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i)
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), curDate: d, prevDate: new Date(d.getTime() - 7 * 86400000), isFuture: d > now }
    })
  }
  if (period === 'year') {
    return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(now.getFullYear(), m, 1)
      return { label: d.toLocaleDateString('en-US', { month: 'short' }), curDate: d, prevDate: new Date(now.getFullYear() - 1, m, 1), isFuture: d > now }
    })
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const p = new Date(d); p.setMonth(p.getMonth() - 1)
    return { label: String(i + 1), curDate: d, prevDate: p, isFuture: d > now }
  })
}

function BalanceTrendChart({ buckets, cur, prev, animKey }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const W = 900, H = 260, padL = 64, padR = 16, padT = 20, padB = 28
  const allV = [...cur, ...prev].map((d) => d.value)
  const maxV = Math.max(...allV), minV = Math.min(...allV)
  const range = (maxV - minV) || 1
  const stepX = buckets.length > 1 ? (W - padL - padR) / (buckets.length - 1) : 0
  const xAt = (i) => padL + i * stepX
  const yAt = (v) => padT + ((maxV - v) / range) * (H - padT - padB)
  const curPts = cur.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
  const prevPts = prev.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
  const gridLines = 4

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(buckets.length - 1, Math.round(frac * (buckets.length - 1))))
    setHover({ i, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="chart-body">
      <svg key={animKey} ref={ref} viewBox={`0 0 ${W} ${H}`} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padT + (i / gridLines) * (H - padT - padB)
          const value = maxV - (i / gridLines) * range
          return (
            <g key={i}>
              <line className="chart-grid-line" x1={padL} x2={W - padR} y1={y} y2={y} />
              <text x={padL - 10} y={y} fontSize="10" fill="var(--muted)" textAnchor="end" dominantBaseline="middle">{fmtAxis(value)}</text>
            </g>
          )
        })}
        <path className="chart-line-prev" d={smoothPath(prevPts)} fill="none" stroke="#b7c2bb" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
        <path className="chart-line-cur" d={smoothPath(curPts)} fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" />
        {curPts.map((p, i) => (
          <circle key={i} className="chart-dot" cx={p.x} cy={p.y} r={hover?.i === i ? 4.5 : 0} fill="var(--green-dark)" style={{ opacity: hover?.i === i ? 1 : 0 }} />
        ))}
        {prevPts.map((p, i) => (
          <circle key={i} className="chart-dot" cx={p.x} cy={p.y} r={hover?.i === i ? 4.5 : 0} fill="#b7c2bb" style={{ opacity: hover?.i === i ? 1 : 0 }} />
        ))}
        {buckets.map((b, i) => (i % Math.max(1, Math.ceil(buckets.length / 8)) === 0) && (
          <text key={i} x={xAt(i)} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="middle">{b.label}</text>
        ))}
        {hover && <line className="chart-hover-line" x1={xAt(hover.i)} x2={xAt(hover.i)} y1={padT} y2={H - padB} stroke="var(--border)" />}
      </svg>
      <div className="legend-inline" style={{ marginTop: 8 }}>
        <span className="li-item"><span className="li-dot solid" />Current period</span>
        <span className="li-item"><span className="li-dot outline" />Previous period</span>
      </div>
      {hover && cur[hover.i] && (() => {
        const c = cur[hover.i].value, p = prev[hover.i]?.value ?? 0
        const diff = c - p, pv = pctChange(c, p)
        return (
          <div className="chart-tooltip visible" style={{ left: hover.x, top: hover.y, position: 'fixed' }}>
            <div className="tt-date">{buckets[hover.i].label}</div>
            <div className="tt-row"><span className="tt-label">Current:</span> <span className="tt-val">{fmt(c)}</span></div>
            <div className="tt-row"><span className="tt-label">Previous:</span> <span className="tt-val">{fmt(p)}</span></div>
            <div className="tt-row"><span className="tt-label">{diff >= 0 ? 'Ahead by' : 'Behind by'}:</span> <span className="tt-val">{fmt(Math.abs(diff))} ({pv >= 0 ? '+' : ''}{pv}%)</span></div>
          </div>
        )
      })()}
    </div>
  )
}

function CashFlowBarChart({ months }) {
  const [hover, setHover] = useState(null)
  const W = 900, H = 260, padL = 60, padR = 16, padT = 24, padB = 30
  const maxV = Math.max(1, ...months.flatMap((m) => [m.income, m.expense])) * 1.15
  const groupW = (W - padL - padR) / months.length
  const barW = Math.min(26, groupW * 0.28)
  const yAt = (v) => padT + (1 - v / maxV) * (H - padT - padB)
  const baseY = yAt(0)
  const gridLines = 4

  return (
    <div className="chart-body">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padT + (i / gridLines) * (H - padT - padB)
          const value = maxV * (1 - i / gridLines)
          return (
            <g key={i}>
              <line className="chart-grid-line" x1={padL} x2={W - padR} y1={y} y2={y} />
              <text x={padL - 10} y={y} fontSize="10" fill="var(--muted)" textAnchor="end" dominantBaseline="middle">{fmtAxis(value)}</text>
            </g>
          )
        })}
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="var(--border)" />
        {months.map((m, i) => {
          const cx = padL + groupW * i + groupW / 2
          const net = m.income - m.expense
          return (
            <g key={i} style={{ cursor: 'pointer' }} onMouseEnter={(e) => setHover({ i, x: e.clientX, y: e.clientY })} onMouseMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHover(null)}>
              <rect x={cx - barW - 2} y={yAt(m.income)} width={barW} height={baseY - yAt(m.income)} fill="var(--green-dark)" rx="3" />
              <rect x={cx + 2} y={yAt(m.expense)} width={barW} height={baseY - yAt(m.expense)} fill="#4b5563" rx="3" />
              {net < 0 && <circle cx={cx} cy={padT - 8} r="3" fill="var(--red)" />}
              <text x={cx} y={H - 8} fontSize="11" fill="var(--muted)" textAnchor="middle">{m.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="legend-inline" style={{ marginTop: 8 }}>
        <span className="li-item"><span className="li-dot" style={{ background: 'var(--green-dark)' }} />Income</span>
        <span className="li-item"><span className="li-dot" style={{ background: '#4b5563' }} />Expenses</span>
      </div>
      {hover && (() => {
        const m = months[hover.i], net = m.income - m.expense
        return (
          <div className="chart-tooltip visible" style={{ left: hover.x, top: hover.y, position: 'fixed' }}>
            <div className="tt-date">{m.label}</div>
            <div className="tt-row"><span className="tt-label">Income:</span> <span className="tt-val">{fmt(m.income)}</span></div>
            <div className="tt-row"><span className="tt-label">Expenses:</span> <span className="tt-val">{fmt(m.expense)}</span></div>
            <div className="tt-row"><span className="tt-label">Net:</span> <span className="tt-val" style={{ color: net < 0 ? 'var(--red)' : undefined }}>{net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}</span></div>
          </div>
        )
      })()}
    </div>
  )
}

export default function AnalyticsPage() {
  const { accounts, transactions, loading, error, refresh } = useFinance()
  const [walletFilter, setWalletFilter] = useState('all')
  const [period, setPeriod] = useState('month')
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refresh?.()
    setTimeout(() => setRefreshing(false), 400)
  }

  const scopedTx = useMemo(
    () => (walletFilter === 'all' ? transactions : transactions.filter((t) => t.account_id === walletFilter)),
    [transactions, walletFilter]
  )
  const scopedAccounts = useMemo(
    () => (walletFilter === 'all' ? accounts : accounts.filter((a) => a.id === walletFilter)),
    [accounts, walletFilter]
  )
  const balance = scopedAccounts.reduce((s, a) => s + Number(a.balance), 0)

  const thisMonth = monthRange(0), lastMonth = monthRange(1)
  const curTx = scopedTx.filter((t) => inRange(t.date, thisMonth.start, thisMonth.end))
  const prevTx = scopedTx.filter((t) => inRange(t.date, lastMonth.start, lastMonth.end))
  const monthIncome = sumBy(curTx, 'income'), monthExpense = sumBy(curTx, 'expense')
  const prevIncome = sumBy(prevTx, 'income'), prevExpense = sumBy(prevTx, 'expense')
  const netIncome = monthIncome - monthExpense, prevNetIncome = prevIncome - prevExpense

  const balanceDelta = useMemo(() => {
    const net = curTx.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
    return pctChange(balance, balance - net)
  }, [curTx, balance])

  const incomePct = pctChange(monthIncome, prevIncome)
  const expensePct = pctChange(monthExpense, prevExpense)
  const netIncomePct = pctChange(netIncome, prevNetIncome)

  const buckets = useMemo(() => getBuckets(period), [period])
  const trend = useMemo(() => {
    const cur = buckets.filter((b) => !b.isFuture).map((b) => ({ value: balanceAt(scopedTx, balance, endOfDay(b.curDate)) }))
    const prev = buckets.map((b) => ({ value: balanceAt(scopedTx, balance, endOfDay(b.prevDate)) }))
    return { cur, prev }
  }, [buckets, scopedTx, balance])

  const cashflow = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const txs = scopedTx.filter((t) => inRange(t.date, s, e))
      return { label: s.toLocaleDateString('en-US', { month: 'short' }), income: sumBy(txs, 'income'), expense: sumBy(txs, 'expense') }
    })
  }, [scopedTx])

  const incomeBreakdown = useMemo(() => {
    const byCat = {}
    curTx.filter((t) => t.type === 'income').forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount)
    })
    const total = Object.values(byCat).reduce((s, v) => s + v, 0) || 1
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, pct: Math.round((value / total) * 100), color: CAT_PALETTE[i % CAT_PALETTE.length] }))
  }, [curTx])

  const categoryBreakdown = useMemo(() => {
    const byCat = {}
    curTx.filter((t) => t.type === 'expense').forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount)
    })
    const total = Object.values(byCat).reduce((s, v) => s + v, 0) || 1
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, pct: Math.round((value / total) * 100), color: CAT_PALETTE[i % CAT_PALETTE.length] }))
  }, [curTx])

  const insights = useMemo(() => {
    const list = []

    if (prevExpense > 0 && expensePct !== 0) {
      list.push({
        id: 'spend-change',
        tone: expensePct <= 0 ? 'good' : 'warn',
        Icon: expensePct <= 0 ? TrendingDown : TrendingUp,
        text: `Your spending ${expensePct <= 0 ? 'decreased' : 'increased'} by ${Math.abs(expensePct)}% compared to last month.`,
      })
    }

    if (monthIncome > 0 && prevIncome > 0) {
      const rate = Math.round((netIncome / monthIncome) * 100)
      const prevRate = Math.round((prevNetIncome / prevIncome) * 100)
      const diff = rate - prevRate
      if (diff !== 0) {
        list.push({
          id: 'net-income-rate',
          tone: diff > 0 ? 'good' : 'warn',
          Icon: ChartNoAxesCombined,
          text: `Net income rate ${diff > 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)} percentage point${Math.abs(diff) === 1 ? '' : 's'} vs last month.`,
        })
      }
    }

    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0]
      list.push({
        id: 'top-category',
        tone: 'neutral',
        Icon: Tag,
        text: `Most spending came from ${top.name}, at ${top.pct}% of this month's expenses.`,
      })
    }

    const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x }
    let streak = 0
    for (let i = 0; i < 12; i++) {
      const s = new Date(weekStart(new Date())); s.setDate(s.getDate() - i * 7)
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
      const wk = scopedTx.filter((t) => inRange(t.date, s, e))
      const net = sumBy(wk, 'income') - sumBy(wk, 'expense')
      if (net > 0) streak++
      else break
    }
    if (streak >= 2) {
      list.push({
        id: 'streak',
        tone: 'good',
        Icon: CalendarClock,
        text: `Income exceeded expenses for ${streak} consecutive weeks.`,
      })
    }

    const expenseTx = curTx.filter((t) => t.type === 'expense')
    if (expenseTx.length > 0) {
      const largest = expenseTx.reduce((a, b) => (Number(b.amount) > Number(a.amount) ? b : a))
      list.push({
        id: 'largest-expense',
        tone: 'neutral',
        Icon: ArrowDownRight,
        text: `Largest expense this month was ${largest.merchant || largest.category} at ${fmt(largest.amount)}.`,
      })
    }

    if (walletFilter === 'all' && accounts.length > 1 && scopedTx.length > 0) {
      const counts = {}
      scopedTx.forEach((t) => { counts[t.account_id] = (counts[t.account_id] || 0) + 1 })
      const [topId, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      const acc = accounts.find((a) => a.id === topId)
      const share = Math.round((topCount / scopedTx.length) * 100)
      if (acc && share >= 40) {
        list.push({
          id: 'wallet-share',
          tone: 'neutral',
          Icon: Wallet2,
          text: `${acc.name} handled ${share}% of all transactions.`,
        })
      }
    }

    return list
  }, [expensePct, prevExpense, monthIncome, prevIncome, netIncome, prevNetIncome, categoryBreakdown, scopedTx, curTx, walletFilter, accounts])

  function handleExport() {
    const rows = [...scopedTx].sort((a, b) => new Date(b.date) - new Date(a.date))
    const label = walletFilter === 'all' ? 'all-wallets' : (accounts.find((a) => a.id === walletFilter)?.name || 'wallet')
    downloadCsv(`analytics-${label}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
  }

  if (loading) {
    return (
      <div className="finai-page">
        <PageHeader title="Analytics" subtitle="Your financial trends, in depth" />
        <div className="stat-row">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} rows={2} />)}</div>
        <div className="analytics-stack">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="finai-page">
      <PageHeader
        title="Analytics"
        subtitle="Your financial trends, in depth"
        actions={
          <>
            <button className="icon-btn" onClick={handleRefresh} title="Refresh data" aria-label="Refresh data">
              <RefreshCw size={16} style={refreshing ? { animation: 'spin 0.6s linear infinite' } : undefined} />
            </button>
            <button className="btn-primary" onClick={handleExport} disabled={scopedTx.length === 0}>
              <Download size={14} /> <span className="btn-label">Export CSV</span>
            </button>
          </>
        }
      />

      {error && <div className="error-banner"><AlertTriangle size={15} /> {error} — showing last known data.</div>}

      <div className="stat-row">
        <div className="card balance-card">
          <div>
            <select className="label" style={{ background: 'transparent', border: 'none', color: '#a9c3b3', font: 'inherit', cursor: 'pointer', padding: 0 }} value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)}>
              <option value="all" style={{ color: '#000' }}>All Wallets</option>
              {accounts.map((a) => <option key={a.id} value={a.id} style={{ color: '#000' }}>{a.name}</option>)}
            </select>
            <div className="amount">{fmt(balance)}</div>
          </div>
          <span className={`trend-chip ${balanceDelta >= 0 ? 'trend-up' : 'trend-down'}`}>
            {balanceDelta >= 0 ? <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
            {Math.abs(balanceDelta)}% <span className="trend-note">vs last month</span>
          </span>
        </div>
        <div className="card stat-card">
          <div className="stat-top"><span className="stat-icon income"><ArrowUpRight size={14} /></span><span className="stat-label">Income</span></div>
          <div className="stat-amount">{fmt(monthIncome)}</div>
          <span className={`trend-chip on-light ${incomePct >= 0 ? 'trend-up' : 'trend-down'}`}>
            {incomePct >= 0 ? <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
            {Math.abs(incomePct)}% <span className="trend-note on-light">vs last month</span>
          </span>
        </div>
        <div className="card stat-card">
          <div className="stat-top"><span className="stat-icon expense"><ArrowDownRight size={14} /></span><span className="stat-label">Expenses</span></div>
          <div className="stat-amount">{fmt(monthExpense)}</div>
          <span className={`trend-chip on-light ${expensePct <= 0 ? 'trend-up' : 'trend-down'}`}>
            {expensePct >= 0 ? <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
            {Math.abs(expensePct)}% <span className="trend-note on-light">vs last month</span>
          </span>
        </div>
        <div className="card stat-card">
          <div className="stat-top"><span className="stat-icon net"><ChartNoAxesCombined size={14} /></span><span className="stat-label">Net Income</span></div>
          <div className="stat-amount">{fmt(netIncome)}</div>
          <span className={`trend-chip on-light ${netIncomePct >= 0 ? 'trend-up' : 'trend-down'}`}>
            {netIncomePct >= 0 ? <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
            {Math.abs(netIncomePct)}% <span className="trend-note on-light">vs last month</span>
          </span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title"><h2>Financial Health</h2></div>
        {insights.length === 0 ? (
          <p className="spending-total" style={{ padding: '6px 0' }}>Not enough activity yet to generate insights.</p>
        ) : (
          <div className="insights-grid">
            {insights.map((i) => (
              <div className="insight-card" key={i.id}>
                <span className={`insight-icon ${i.tone}`}><i.Icon size={16} /></span>
                <p className="insight-text">{i.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="analytics-stack">
        <div className="card chart-card">
          <div className="card-head">
            <div><h2>Total Balance Trend</h2><p className="card-sub">Current period vs previous period</p></div>
            <div className="segmented">
              {['week', 'month', 'year'].map((p) => <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}
            </div>
          </div>
          <BalanceTrendChart buckets={buckets} cur={trend.cur} prev={trend.prev} animKey={`${walletFilter}-${period}`} />        </div>

        <div className="card chart-card">
          <div className="card-head"><div><h2>Cash Flow Trend</h2><p className="card-sub">Last 6 months, income vs expenses</p></div></div>
          <CashFlowBarChart months={cashflow} />
        </div>

        <div className="card chart-card">
          <div className="card-head"><div><h2>Income by Source</h2><p className="card-sub">This month's income</p></div></div>
          {incomeBreakdown.length === 0 ? (
            <p className="spending-total" style={{ padding: '20px 0' }}>No income recorded this month.</p>
          ) : (
            <div className="legend-list">
              {incomeBreakdown.map((c) => (
                <div className="legend-row" key={c.name} style={{ cursor: 'default' }}>
                  <span className="legend-dot" style={{ background: c.color }} />
                  <span className="legend-name">{c.name}</span>
                  <span className="legend-amount">{fmt(c.value)}</span>
                  <span className="legend-pct">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card chart-card">
          <div className="card-head"><div><h2>Spending by Category</h2><p className="card-sub">This month's expenses</p></div></div>
          {categoryBreakdown.length === 0 ? (
            <p className="spending-total" style={{ padding: '20px 0' }}>No expenses recorded this month.</p>
          ) : (
            <div className="legend-list">
              {categoryBreakdown.map((c) => (
                <div className="legend-row" key={c.name} style={{ cursor: 'default' }}>
                  <span className="legend-dot" style={{ background: c.color }} />
                  <span className="legend-name">{c.name}</span>
                  <span className="legend-amount">{fmt(c.value)}</span>
                  <span className="legend-pct">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}