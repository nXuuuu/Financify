/**
 * Shared stat grid wrapper, replacing copy-pasted `.stat-row` divs.
 * Pass StatCard children (or any `.card.stat-card`-shaped markup).
 *
 * Usage:
 *   <StatRow>
 *     <StatCard label="Total Target" value={fmt(stats.totalTarget)} />
 *     <StatCard label="Total Saved" value={fmt(stats.totalSaved)} />
 *   </StatRow>
 *
 *   <StatRow variant="stat-row-3">...</StatRow>  // analytics' 3-up row
 */
export default function StatRow({ children, variant, className = '' }) {
  return <div className={`stat-row ${variant || ''} ${className}`.trim()}>{children}</div>
}
