import { useMemo, useState, useRef, useEffect } from 'react'
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Wallet2, PiggyBank, Target, Info } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import './finai/analytics.css'

const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
const pctChange = (curr, prev) => { if (!prev) return curr > 0 ? 100 : curr < 0 ? -100 : 0; return Math.round(((curr - prev) / Math.abs(prev)) * 100) }
const sumBy = (txs, type) => txs.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0)
const inRange = (dateStr, start, end) => { const d = new Date(dateStr); return d >= start && d <= end }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const DAY_MS = 86400000

const RANGE_OPTIONS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'Last 3 Months' },
  { id: 'year', label: 'This Year' },
]
const COMPARE_LABEL = { week: 'vs last week', month: 'vs last month', quarter: 'vs last quarter', year: 'vs last year' }
const GRANULARITY_OPTIONS = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
]

function getRange(rangeKey) {
  const now = new Date()
  const start = new Date(now), end = endOfDay(now)
  if (rangeKey === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0) }
  if (rangeKey === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
  if (rangeKey === 'quarter') { start.setMonth(now.getMonth() - 3, 1); start.setHours(0, 0, 0, 0) }
  if (rangeKey === 'year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0) }
  const spanMs = end - start
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - spanMs)
  return { start, end, prevStart, prevEnd }
}

function buildBuckets(gran, count) {
  const now = new Date()
  const buckets = []
  for (let i = count - 1; i >= 0; i--) {
    let s, e, label
    if (gran === 'day') {
      s = new Date(now); s.setDate(now.getDate() - i); s.setHours(0, 0, 0, 0)
      e = endOfDay(s)
      label = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (gran === 'week') {
      s = new Date(now); s.setDate(now.getDate() - now.getDay() - i * 7); s.setHours(0, 0, 0, 0)
      e = new Date(s); e.setDate(s.getDate() + 6); e = endOfDay(e)
      label = `${s.getMonth() + 1}/${s.getDate()}`
    } else if (gran === 'year') {
      const y = now.getFullYear() - i
      s = new Date(y, 0, 1); e = new Date(y, 11, 31, 23, 59, 59, 999)
      label = String(y)
    } else {
      s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      label = s.toLocaleDateString('en-US', { month: 'short' })
    }
    buckets.push({ start: s, end: e, label })
  }
  return buckets
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

function TrendChip({ value, positiveIsGood = true, label }) {
  const good = positiveIsGood ? value >= 0 : value <= 0
  return (
    <span className={`trend-chip on-light ${good ? 'trend-up' : 'trend-down'}`}>
      {value >= 0 ? <TrendingUp size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />}
      {Math.abs(value)}% <span className="trend-note on-light">{label}</span>
    </span>
  )
}

function Sparkline({ data, color }) {
  const w = 72, h = 26
  if (!data || data.length < 2) return <svg width={w} height={h} />
  const max = Math.max(...data, 0), min = Math.min(...data, 0)
  const range = (max - min) || 1
  const stepX = w / (data.length - 1)
  const pts = data.map((v, i) => ({ x: i * stepX, y: h - ((v - min) / range) * h }))
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function SummaryCard({ icon, label, value, trend, positiveIsGood, compareLabel, sparkline, sparkColor, onClick }) {
  return (
    <div className="card stat-card summary-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="stat-top"><span className="stat-icon savings">{icon}</span><span className="stat-label">{label}</span></div>
      <div className="summary-card-row">
        <div className="stat-amount">{value}</div>
        <Sparkline data={sparkline} color={sparkColor} />
      </div>
      <TrendChip value={trend} positiveIsGood={positiveIsGood} label={compareLabel} />
    </div>
  )
}

function BalanceTrendChart({ buckets, cur, prev }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const W = 900, H = 260, padL = 54, padR = 16, padT = 20, padB = 28
  const allV = [...cur, ...prev]
  const maxV = Math.max(...allV, 0), minV = Math.min(...allV, 0)
  const range = (maxV - minV) || 1
  const stepX = buckets.length > 1 ? (W - padL - padR) / (buckets.length - 1) : 0
  const xAt = (i) => padL + i * stepX
  const yAt = (v) => padT + ((maxV - v) / range) * (H - padT - padB)
  const curPts = cur.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
  const prevPts = prev.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
  const gridLines = 4

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(buckets.length - 1, Math.round(frac * (buckets.length - 1))))
    setHover({ i, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="chart-body">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padT + (i / gridLines) * (H - padT - padB)
          return <line key={i} className="chart-grid-line" x1={padL} x2={W - padR} y1={y} y2={y} />
        })}
        <path className="chart-line-prev" d={smoothPath(prevPts)} fill="none" stroke="#b7c2bb" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
        <path className="chart-line-cur" d={smoothPath(curPts)} fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" />
        {curPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hover?.i === i ? 4.5 : 0} fill="var(--green-dark)" style={{ transition: 'r .1s' }} />)}
        {prevPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hover?.i === i ? 4.5 : 0} fill="#b7c2bb" style={{ transition: 'r .1s' }} />)}
        {buckets.map((b, i) => (i % Math.max(1, Math.ceil(buckets.length / 8)) === 0) && (
          <text key={i} x={xAt(i)} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="middle">{b.label}</text>
        ))}
        {hover && <line x1={xAt(hover.i)} x2={xAt(hover.i)} y1={padT} y2={H - padB} stroke="var(--border)" />}
      </svg>
      <div className="legend-inline" style={{ marginTop: 8 }}>
        <span className="li-item"><span className="li-dot solid" />Current period</span>
        <span className="li-item"><span className="li-dot outline" />Previous period</span>
      </div>
      {hover && cur[hover.i] != null && (() => {
        const c = cur[hover.i], p = prev[hover.i] ?? 0
        const diff = c - p, pv = pctChange(c, p)
        return (
          <div className="chart-tooltip visible" style={{ left: hover.x, top: hover.y, position: 'fixed' }}>
            <div className="tt-date">{buckets[hover.i].label}</div>
            <div className="tt-row"><span className="tt-label">Balance:</span> <span className="tt-val">{fmt(c)}</span></div>
            <div className="tt-row"><span className="tt-label">Previous:</span> <span className="tt-val">{fmt(p)}</span></div>
            <div className="tt-row"><span className="tt-label">{diff >= 0 ? 'Ahead by' : 'Behind by'}:</span> <span className="tt-val">{fmt(Math.abs(diff))} ({pv >= 0 ? '+' : ''}{pv}%)</span></div>
          </div>
        )
      })()}
    </div>
  )
}

function CashFlowChart({ buckets, mode }) {
  const [hover, setHover] = useState(null)
  const W = 900, H = 260, padL = 44, padR = 16, padT = 24, padB = 30
  const maxV = Math.max(1, ...buckets.flatMap((m) => [m.income, m.expense])) * 1.15
  const yAt = (v) => padT + (1 - v / maxV) * (H - padT - padB)
  const baseY = yAt(0)
  const stepX = buckets.length > 1 ? (W - padL - padR) / (buckets.length - 1) : 0
  const xAt = (i) => padL + i * stepX
  const groupW = (W - padL - padR) / buckets.length
  const barW = Math.min(26, groupW * 0.28)

  const incPts = buckets.map((m, i) => ({ x: xAt(i), y: yAt(m.income) }))
  const expPts = buckets.map((m, i) => ({ x: xAt(i), y: yAt(m.expense) }))
  const netPts = buckets.map((m, i) => ({ x: xAt(i), y: yAt(Math.max(0, m.income - m.expense)) }))

  return (
    <div className="chart-body">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)}>
        <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="var(--border)" />
        {mode === 'bar' ? buckets.map((m, i) => {
          const cx = mode === 'bar' ? padL + groupW * i + groupW / 2 : xAt(i)
          const net = m.income - m.expense
          return (
            <g key={i} style={{ cursor: 'pointer' }} onMouseEnter={(e) => setHover({ i, x: e.clientX, y: e.clientY })} onMouseMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })}>
              <rect x={cx - barW - 2} y={yAt(m.income)} width={barW} height={baseY - yAt(m.income)} fill="var(--green-dark)" rx="3" />
              <rect x={cx + 2} y={yAt(m.expense)} width={barW} height={baseY - yAt(m.expense)} fill="#4b5563" rx="3" />
              {net < 0 && <circle cx={cx} cy={padT - 8} r="3" fill="var(--red)" />}
              <text x={cx} y={H - 8} fontSize="11" fill="var(--muted)" textAnchor="middle">{m.label}</text>
            </g>
          )
        }) : (
          <>
            <path d={smoothPath(incPts)} fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" />
            <path d={smoothPath(expPts)} fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
            <path d={smoothPath(netPts)} fill="none" stroke="var(--amber)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
            {buckets.map((m, i) => (i % Math.max(1, Math.ceil(buckets.length / 8)) === 0) && (
              <text key={i} x={xAt(i)} y={H - 8} fontSize="11" fill="var(--muted)" textAnchor="middle">{m.label}</text>
            ))}
            {buckets.map((m, i) => (
              <rect key={i} x={xAt(i) - groupW / 2} y={padT} width={groupW} height={H - padT - padB} fill="transparent"
                onMouseEnter={(e) => setHover({ i, x: e.clientX, y: e.clientY })} onMouseMove={(e) => setHover({ i, x: e.clientX, y: e.clientY })} style={{ cursor: 'pointer' }} />
            ))}
          </>
        )}
      </svg>
      <div className="legend-inline" style={{ marginTop: 8 }}>
        <span className="li-item"><span className="li-dot" style={{ background: 'var(--green-dark)' }} />Income</span>
        <span className="li-item"><span className="li-dot" style={{ background: '#4b5563' }} />Expenses</span>
        <span className="li-item"><span className="li-dot" style={{ background: 'var(--amber)' }} />Net cash flow</span>
      </div>
      {hover && (() => {
        const m = buckets[hover.i], net = m.income - m.expense
        return (
          <div className="chart-tooltip visible" style={{ left: hover.x, top: hover.y, position: 'fixed' }}>
            <div className="tt-date">{m.label}</div>
            <div className="tt-row"><span className="tt-label">Income:</span> <span className="tt-val">{fmt(m.income)}</span></div>
            <div className="tt-row"><span className="tt-label">Expenses:</span> <span className="tt-val">{fmt(m.expense)}</span></div>
            <div className="tt-row"><span className="tt-label">Net:</span> <span className="tt-val" style={{ color: net < 0 ? 'var(--red)' : undefined }}>{net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}</span></div>
            <div className="tt-row"><span className="tt-label">Savings:</span> <span className="tt-val">{m.income ? Math.round((net / m.income) * 100) : 0}%</span></div>
          </div>
        )
      })()}
    </div>
  )
}

function CategoryDonut({ data, selected, onSlice }) {
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
        const active = !selected || selected === d.name
        return (
          <path
            key={d.name}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none" stroke={d.color} strokeWidth={active ? sw : sw - 8}
            strokeLinecap="round" opacity={active ? 1 : 0.35}
            className={selected === d.name ? 'selected' : ''}
            style={{ cursor: 'pointer' }}
            onClick={() => onSlice(d.name)}
          />
        )
      })}
    </svg>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--muted)' }}>
      <Info size={20} style={{ marginBottom: 8, opacity: 0.6 }} />
      <p style={{ fontSize: 12.5 }}>{text}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { accounts, transactions, budgets, goals } = useFinance()
  const [walletFilter, setWalletFilter] = useState('all')
  const [rangeKey, setRangeKey] = useState('month')
  const [granularity, setGranularity] = useState('month')
  const [ieView, setIeView] = useState('bar')
  const [breakdownView, setBreakdownView] = useState('donut')
  const [selectedBreakdownCat, setSelectedBreakdownCat] = useState(null)

  const scopedTx = useMemo(() => (walletFilter === 'all' ? transactions : transactions.filter((t) => t.account_id === walletFilter)), [transactions, walletFilter])
  const scopedAccounts = useMemo(() => (walletFilter === 'all' ? accounts : accounts.filter((a) => a.id === walletFilter)), [accounts, walletFilter])
  const balance = scopedAccounts.reduce((s, a) => s + Number(a.balance), 0)
  const totalBalanceAll = accounts.reduce((s, a) => s + Number(a.balance), 0) || 1

  const { start, end, prevStart, prevEnd } = useMemo(() => getRange(rangeKey), [rangeKey])
  const periodTx = useMemo(() => scopedTx.filter((t) => inRange(t.date, start, end)), [scopedTx, start, end])
  const prevTx = useMemo(() => scopedTx.filter((t) => inRange(t.date, prevStart, prevEnd)), [scopedTx, prevStart, prevEnd])
  const compareLabel = COMPARE_LABEL[rangeKey] || 'vs previous period'

  const monthIncome = sumBy(periodTx, 'income'), monthExpense = sumBy(periodTx, 'expense')
  const prevIncome = sumBy(prevTx, 'income'), prevExpense = sumBy(prevTx, 'expense')
  const savings = monthIncome - monthExpense, prevSavings = prevIncome - prevExpense
  const incomePct = pctChange(monthIncome, prevIncome)
  const expensePct = pctChange(monthExpense, prevExpense)
  const savingsPct = pctChange(savings, prevSavings)
  const balanceDelta = pctChange(balance, balance - savings)

  const hasAnyTx = scopedTx.length > 0
  const hasPeriodTx = periodTx.length > 0

  // ---- sparklines (independent of comparison range, always trailing 8 buckets at chosen granularity) ----
  const sparkBuckets = useMemo(() => buildBuckets(granularity, 8), [granularity])
  const sparklines = useMemo(() => {
    const inc = [], exp = [], sav = [], bal = []
    for (const b of sparkBuckets) {
      const txs = scopedTx.filter((t) => inRange(t.date, b.start, b.end))
      const i = sumBy(txs, 'income'), e = sumBy(txs, 'expense')
      inc.push(i); exp.push(e); sav.push(i - e)
      const net = scopedTx.filter((t) => new Date(t.date) > b.end).reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      bal.push(balance - net)
    }
    return { income: inc, expense: exp, savings: sav, balance: bal }
  }, [sparkBuckets, scopedTx, balance])

  // ---- balance trend (granularity-driven, current vs previous window) ----
  const trendBuckets = useMemo(() => buildBuckets(granularity, granularity === 'day' ? 14 : granularity === 'year' ? 5 : 12), [granularity])
  const trend = useMemo(() => {
    const cur = trendBuckets.map((b) => {
      const net = scopedTx.filter((t) => new Date(t.date) > b.end).reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      return balance - net
    })
    const spanMs = trendBuckets.length > 1 ? trendBuckets[1].start - trendBuckets[0].start : DAY_MS
    const prev = trendBuckets.map((b) => {
      const shiftedEnd = new Date(b.end.getTime() - spanMs * trendBuckets.length)
      const net = scopedTx.filter((t) => new Date(t.date) > shiftedEnd).reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      return balance - net
    })
    return { cur, prev }
  }, [trendBuckets, scopedTx, balance])

  // ---- income vs expense chart buckets ----
  const cashflowBuckets = useMemo(() => {
    const bs = buildBuckets(granularity, granularity === 'day' ? 14 : granularity === 'year' ? 5 : 6)
    return bs.map((b) => {
      const txs = scopedTx.filter((t) => inRange(t.date, b.start, b.end))
      return { label: b.label, income: sumBy(txs, 'income'), expense: sumBy(txs, 'expense') }
    })
  }, [granularity, scopedTx])
  const hasCashflowData = cashflowBuckets.some((b) => b.income > 0 || b.expense > 0)

  // ---- category breakdown + trends ----
  const categoryStats = useMemo(() => {
    const cur = {}, prevC = {}
    periodTx.filter((t) => t.type === 'expense').forEach((t) => { cur[t.category] = (cur[t.category] || 0) + Number(t.amount) })
    prevTx.filter((t) => t.type === 'expense').forEach((t) => { prevC[t.category] = (prevC[t.category] || 0) + Number(t.amount) })
    const names = new Set([...Object.keys(cur), ...Object.keys(prevC)])
    const total = Object.values(cur).reduce((s, v) => s + v, 0) || 1
    const CAT_COLORS = ['#14532d', '#6b7280', '#4ade80', '#052e16', '#a7d9b6', '#d9dfd6', '#6366f1', '#f59e0b']
    return [...names].map((name, i) => {
      const value = cur[name] || 0, prevValue = prevC[name] || 0
      return { name, value, prevValue, pct: Math.round((value / total) * 100), trendPct: pctChange(value, prevValue), color: CAT_COLORS[i % CAT_COLORS.length] }
    }).filter((c) => c.value > 0 || c.prevValue > 0).sort((a, b) => b.value - a.value)
  }, [periodTx, prevTx])

  const categoryTrendsRanked = useMemo(() => [...categoryStats].sort((a, b) => Math.abs(b.trendPct) - Math.abs(a.trendPct)).slice(0, 6), [categoryStats])
  const biggestIncrease = categoryTrendsRanked.find((c) => c.trendPct > 0)
  const biggestDecrease = [...categoryTrendsRanked].reverse().find((c) => c.trendPct < 0)

  // keep the drilled-into category valid whenever the underlying data changes
  useEffect(() => {
    if (selectedBreakdownCat && !categoryStats.find((c) => c.name === selectedBreakdownCat)) {
      setSelectedBreakdownCat(null)
    }
  }, [categoryStats, selectedBreakdownCat])

  // ---- wallet performance ----
  const walletPerf = useMemo(() => {
    return accounts.map((a) => {
      const allTxs = transactions.filter((t) => t.account_id === a.id && inRange(t.date, start, end))
      const income = sumBy(allTxs, 'income'), expense = sumBy(allTxs, 'expense')
      return {
        ...a,
        income, expense, net: income - expense, count: allTxs.length,
        sharePct: Math.round((Number(a.balance) / totalBalanceAll) * 100),
      }
    }).sort((a, b) => b.count - a.count)
  }, [accounts, transactions, start, end, totalBalanceAll])

  // ---- financial health insights ----
  const insights = useMemo(() => {
    const list = []
    if (prevExpense > 0) {
      list.push({ tone: expensePct <= 0 ? 'good' : 'warn', text: `Your spending ${expensePct <= 0 ? 'decreased' : 'increased'} by ${Math.abs(expensePct)}% ${compareLabel}.` })
    }
    if (monthIncome > 0 || prevIncome > 0) {
      const curRate = monthIncome ? Math.round((savings / monthIncome) * 100) : 0
      const prevRate = prevIncome ? Math.round((prevSavings / prevIncome) * 100) : 0
      const diff = curRate - prevRate
      list.push({ tone: diff >= 0 ? 'good' : 'warn', text: `Savings rate ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)} point${Math.abs(diff) === 1 ? '' : 's'} ${compareLabel}.` })
    }
    if (categoryStats[0]) list.push({ tone: 'neutral', text: `Most spending came from ${categoryStats[0].name} (${fmt0(categoryStats[0].value)}).` })
    const topExpenseTx = [...periodTx].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0]
    if (topExpenseTx) list.push({ tone: 'neutral', text: `Largest expense was ${topExpenseTx.merchant || topExpenseTx.category} at ${fmt0(topExpenseTx.amount)}.` })
    if (walletPerf[0] && walletPerf[0].count > 0) list.push({ tone: 'neutral', text: `${walletPerf[0].name} handled ${Math.round((walletPerf[0].count / (periodTx.length || 1)) * 100)}% of this period's transactions.` })
    if (!list.length) list.push({ tone: 'neutral', text: 'Add more transactions to unlock personalized insights.' })
    return list
  }, [prevExpense, expensePct, monthIncome, prevIncome, savings, prevSavings, compareLabel, categoryStats, periodTx, walletPerf])

  // ---- saving insights ----
  const savingsRate = monthIncome ? Math.round((savings / monthIncome) * 100) : 0
  const monthlyBuckets6 = useMemo(() => buildBuckets('month', 6), [])
  const avgMonthlySavings = useMemo(() => {
    const vals = monthlyBuckets6.map((b) => {
      const txs = scopedTx.filter((t) => inRange(t.date, b.start, b.end))
      return sumBy(txs, 'income') - sumBy(txs, 'expense')
    })
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }, [monthlyBuckets6, scopedTx])
  const goalsTargetTotal = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const goalsSavedTotal = goals.reduce((s, g) => s + Number(g.saved_amount), 0)
  const goalProgressPct = goalsTargetTotal ? Math.round((goalsSavedTotal / goalsTargetTotal) * 100) : 0
  const largestGoal = [...goals].sort((a, b) => b.saved_amount - a.saved_amount)[0]

  // ---- budget adherence (spending habits substitute for "missed savings target") ----
  const budgetStatus = useMemo(() => {
    return budgets.map((b) => {
      const spent = periodTx.filter((t) => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + Number(t.amount), 0)
      return { ...b, spent, pct: Math.round((spent / (b.limit_amount || 1)) * 100) }
    }).sort((a, b) => b.pct - a.pct)
  }, [budgets, periodTx])

  // ---- spending habits ----
  const weekendVsWeekday = useMemo(() => {
    let weekend = 0, weekday = 0
    periodTx.filter((t) => t.type === 'expense').forEach((t) => {
      const day = new Date(t.date).getDay()
      if (day === 0 || day === 6) weekend += Number(t.amount); else weekday += Number(t.amount)
    })
    return { weekend, weekday }
  }, [periodTx])
  const daysElapsed = Math.max(1, Math.min(Math.round((Math.min(Date.now(), end) - start) / DAY_MS) + 1, Math.round((end - start) / DAY_MS) + 1))
  const avgDailySpend = monthExpense / daysElapsed

  const spendingHabits = useMemo(() => {
    const list = []
    if (weekendVsWeekday.weekend > 0 || weekendVsWeekday.weekday > 0) {
      const weekendShare = Math.round((weekendVsWeekday.weekend / (weekendVsWeekday.weekend + weekendVsWeekday.weekday || 1)) * 100)
      list.push(`You spend ${weekendShare}% of your money on weekends.`)
    }
    if (biggestIncrease) list.push(`${biggestIncrease.name} is your fastest growing expense, up ${biggestIncrease.trendPct}%.`)
    if (biggestDecrease) list.push(`${biggestDecrease.name} costs decreased ${Math.abs(biggestDecrease.trendPct)}%.`)
    list.push(`Your average daily spending is ${fmt0(avgDailySpend)}.`)
    if (!list.length) list.push('Add more transactions to see spending habits.')
    return list
  }, [weekendVsWeekday, biggestIncrease, biggestDecrease, avgDailySpend])

  const activeWalletName = walletFilter !== 'all' ? accounts.find((a) => a.id === walletFilter)?.name : null

  return (
    <div className="finai-page">
      <div className="topbar"><div className="greeting"><div><h1>Analytics</h1><p>Your financial trends, in depth</p></div></div></div>

      {/* Global filter bar */}
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: activeWalletName ? 10 : 18 }}>
        <select className="filter-select" value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)}>
          <option value="all">All Wallets</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="filter-select" value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}>
          {RANGE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="segmented">
          {GRANULARITY_OPTIONS.map((g) => <button key={g.id} className={granularity === g.id ? 'active' : ''} onClick={() => setGranularity(g.id)}>{g.label}</button>)}
        </div>
      </div>

      {activeWalletName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12.5 }}>
          <span className="filter-select" style={{ cursor: 'default' }}>Filtered: {activeWalletName}</span>
          <button className="link-all" onClick={() => setWalletFilter('all')}>Clear</button>
        </div>
      )}

      {!hasAnyTx ? (
        <div className="card"><EmptyState text="Add transactions to see analytics for this wallet." /></div>
      ) : (
        <>
          <div className="stat-row">
            <SummaryCard icon={<Wallet2 size={14} />} label="Total Balance" value={fmt(balance)} trend={balanceDelta} compareLabel={compareLabel} sparkline={sparklines.balance} sparkColor="var(--green-dark)" onClick={() => {}} />
            <SummaryCard icon={<ArrowUp size={14} />} label="Income" value={fmt(monthIncome)} trend={incomePct} compareLabel={compareLabel} sparkline={sparklines.income} sparkColor="var(--green-dark)" />
            <SummaryCard icon={<ArrowDown size={14} />} label="Expenses" value={fmt(monthExpense)} trend={expensePct} positiveIsGood={false} compareLabel={compareLabel} sparkline={sparklines.expense} sparkColor="#ef4444" />
            <SummaryCard icon={<PiggyBank size={14} />} label="Savings" value={fmt(savings)} trend={savingsPct} compareLabel={compareLabel} sparkline={sparklines.savings} sparkColor="var(--green-dark)" />
          </div>

          {/* Financial health insights */}
          <div className="card chart-card" style={{ marginTop: 18 }}>
            <div className="card-head"><div><h2>Financial Health</h2><p className="card-sub">What changed {compareLabel.replace('vs ', 'vs. ')}</p></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 10px', borderRadius: 10, background: ins.tone === 'good' ? 'var(--green-pale)' : ins.tone === 'warn' ? 'var(--red-pale)' : '#f2f5f0' }}>
                  {ins.tone === 'good' ? <TrendingUp size={14} color="#15803d" /> : ins.tone === 'warn' ? <TrendingDown size={14} color="#dc2626" /> : <Info size={14} color="var(--muted)" />}
                  {ins.text}
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-stack" style={{ marginTop: 18 }}>
            <div className="card chart-card">
              <div className="card-head">
                <div><h2>Total Balance Trend</h2><p className="card-sub">Current period vs previous period</p></div>
              </div>
              {trend.cur.every((v) => v === trend.cur[0]) && trend.prev.every((v) => v === trend.prev[0]) ? (
                <EmptyState text="Not enough history yet to chart a balance trend for this wallet." />
              ) : (
                <BalanceTrendChart buckets={trendBuckets} cur={trend.cur} prev={trend.prev} />
              )}
            </div>

            <div className="card chart-card">
              <div className="card-head">
                <div><h2>Income vs Expenses</h2><p className="card-sub">Cash flow over time</p></div>
                <div className="segmented">
                  <button className={ieView === 'bar' ? 'active' : ''} onClick={() => setIeView('bar')}>Bar</button>
                  <button className={ieView === 'line' ? 'active' : ''} onClick={() => setIeView('line')}>Line</button>
                </div>
              </div>
              {!hasCashflowData ? <EmptyState text="No income or expenses recorded in this range yet." /> : <CashFlowChart buckets={cashflowBuckets} mode={ieView} />}
            </div>

            <div className="dashboard-grid">
              <div className="card chart-card">
                <div className="card-head">
                  <div><h2>Spending Breakdown</h2><p className="card-sub">Where your money went {compareLabel}</p></div>
                  <div className="segmented">
                    <button className={breakdownView === 'donut' ? 'active' : ''} onClick={() => setBreakdownView('donut')}>Donut</button>
                    <button className={breakdownView === 'bars' ? 'active' : ''} onClick={() => setBreakdownView('bars')}>Bars</button>
                  </div>
                </div>
                {!hasPeriodTx || categoryStats.length === 0 ? <EmptyState text="No expenses recorded this period." /> : breakdownView === 'bars' ? (
                  <div className="legend-list" style={{ marginTop: 14 }}>
                    {categoryStats.map((c) => (
                      <div key={c.name} className="legend-row" style={{ cursor: 'default' }}>
                        <span className="legend-dot" style={{ background: c.color }} />
                        <span className="legend-name">{c.name}</span>
                        <div style={{ flex: 1, height: 6, background: '#eef1ec', borderRadius: 20, margin: '0 8px', overflow: 'hidden' }}>
                          <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 20 }} />
                        </div>
                        <span className="legend-amount">{fmt0(c.value)}</span>
                        <span className="legend-pct">{c.pct}%</span>
                        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: c.trendPct > 0 ? '#dc2626' : c.trendPct < 0 ? '#15803d' : 'var(--muted)', minWidth: 40, textAlign: 'right' }}>
                          {c.trendPct > 0 ? '↑' : c.trendPct < 0 ? '↓' : '–'} {Math.abs(c.trendPct)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="donut-wrap">
                    <div className="donut-holder">
                      <CategoryDonut
                        data={categoryStats}
                        selected={selectedBreakdownCat}
                        onSlice={(n) => setSelectedBreakdownCat((c) => (c === n ? null : n))}
                      />
                      <div className="donut-center">
                        <span className="k1">{selectedBreakdownCat ? 'Selected' : 'Top Category'}</span>
                        <span className="k2">{selectedBreakdownCat || categoryStats[0]?.name}</span>
                      </div>
                    </div>

                    {!selectedBreakdownCat ? (
                      <div className="legend-panel">
                        <div className="spending-total">Total spent</div>
                        <div className="spending-amount">{fmt(monthExpense)}</div>
                        <div className="legend-list">
                          {categoryStats.map((c) => (
                            <button key={c.name} className="legend-row" onClick={() => setSelectedBreakdownCat(c.name)}>
                              <span className="legend-dot" style={{ background: c.color }} />
                              <span className="legend-name">{c.name}</span>
                              <div className="legend-info">
                                <span className="legend-amount">{fmt0(c.value)}</span>
                                <span className="legend-pct">{c.pct}%</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="legend-panel fade-enter">
                        <div className="detail-header">
                          <button className="back-btn" onClick={() => setSelectedBreakdownCat(null)}>←</button>
                          <div className="detail-heading">
                            <div className="detail-title">
                              <span className="detail-dot" style={{ background: categoryStats.find((c) => c.name === selectedBreakdownCat)?.color }} />
                              {selectedBreakdownCat}
                            </div>
                            <div className="detail-sub">
                              {fmt(categoryStats.find((c) => c.name === selectedBreakdownCat)?.value || 0)} this period
                            </div>
                          </div>
                        </div>
                        <div className="txn-detail-list">
                          {periodTx.filter((t) => t.type === 'expense' && t.category === selectedBreakdownCat)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map((t) => (
                              <div className="txn-row" key={t.id}>
                                <div className="txn-icon"><Wallet2 size={14} /></div>
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
              </div>

              <div className="card chart-card">
                <div className="card-head"><div><h2>Category Trends</h2><p className="card-sub">Biggest movers {compareLabel}</p></div></div>
                {categoryTrendsRanked.length === 0 ? <EmptyState text="Not enough category history yet." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                    {categoryTrendsRanked.map((c) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{fmt0(c.prevValue)} → {fmt0(c.value)}</span>
                        <span style={{ fontWeight: 700, color: c.trendPct > 0 ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {c.trendPct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(c.trendPct)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card chart-card">
                <div className="card-head"><div><h2>Wallet Performance</h2><p className="card-sub">Which wallets are doing the most work — click a wallet to filter the page</p></div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                  {walletPerf.map((w) => (
                    <div
                      key={w.id}
                      className="setting-row"
                      style={{
                        cursor: 'pointer',
                        padding: '10px 10px',
                        margin: '0 -10px',
                        borderRadius: 10,
                        background: w.id === walletFilter ? 'var(--green-pale)' : undefined,
                      }}
                      onClick={() => setWalletFilter((f) => (f === w.id ? 'all' : w.id))}
                    >
                      <div className="setting-info">
                        <div className="s-title">{w.name}</div>
                        <div className="s-sub">{fmt0(w.income)} in · {fmt0(w.expense)} out · {w.count} tx</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt0(w.balance)}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.sharePct}% of assets</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card chart-card">
                <div className="card-head"><div><h2>Saving Insights</h2><p className="card-sub">How you're tracking toward your goals</p></div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, fontSize: 13 }}>
                  <div className="setting-row"><span>Savings rate</span><strong>{savingsRate}%</strong></div>
                  <div className="setting-row"><span>Avg monthly savings (6 mo)</span><strong>{fmt0(avgMonthlySavings)}</strong></div>
                  <div className="setting-row"><span>Goal progress</span><strong>{goalProgressPct}% ({fmt0(goalsSavedTotal)} / {fmt0(goalsTargetTotal)})</strong></div>
                  {largestGoal && <div className="setting-row"><span>Top goal</span><strong>{largestGoal.name} — {fmt0(largestGoal.saved_amount)}</strong></div>}
                  {budgetStatus.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div className="s-sub" style={{ marginBottom: 6 }}>Budget adherence this period</div>
                      {budgetStatus.map((b) => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span>{b.category}</span>
                          <span style={{ color: b.pct > 100 ? 'var(--red)' : 'var(--muted)', fontWeight: 600 }}>{b.pct}% of {fmt0(b.limit_amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card chart-card">
              <div className="card-head"><div><h2>Spending Habits</h2><p className="card-sub">Patterns detected in your transactions</p></div></div>
              <ul style={{ marginTop: 12, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {spendingHabits.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
