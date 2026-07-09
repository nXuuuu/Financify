/**
 * Shared stat card, replacing copy-pasted
 * `<div className="card stat-card"><span className="stat-label">...</span>
 * <div className="stat-amount">...</div></div>` blocks.
 *
 * Set `balance` for the dark gradient "Total Balance" card variant used on
 * Dashboard/Wallet (adds .balance-card and renders `icon` as a label icon
 * instead of a stat-icon chip).
 *
 * Usage:
 *   <StatCard label="Total Target" value={fmt(stats.totalTarget)} />
 *
 *   <StatCard label="Income" value={fmt(income)} tone="income" icon={<ArrowDown size={14} />} />
 *
 *   <StatCard balance label="Total Balance" value={fmt(balance)} icon={<Wallet size={13} />}
 *     trend={{ label: '+2.4%', tone: 'up' }} />
 */
export default function StatCard({
  label,
  value,
  sup,
  tone, // 'income' | 'expense' | 'savings' | 'net'
  icon,
  balance = false,
  trend, // { label, tone: 'up' | 'down' }
  className = '',
}) {
  if (balance) {
    return (
      <div className={`card stat-card balance-card ${className}`.trim()}>
        <div>
          <div className="label">
            {icon} {label}
          </div>
          <div className="amount">
            {value}
            {sup && <sup>{sup}</sup>}
          </div>
        </div>
        {trend && (
          <div className={`trend-chip trend-${trend.tone}`}>{trend.label}</div>
        )}
      </div>
    )
  }

  return (
    <div className={`card stat-card ${className}`.trim()}>
      {icon && (
        <div className="stat-top">
          <div className={`stat-icon ${tone || ''}`.trim()}>{icon}</div>
        </div>
      )}
      <span className="stat-label">{label}</span>
      <div className="stat-amount">
        {value}
        {sup && <sup>{sup}</sup>}
      </div>
    </div>
  )
}
