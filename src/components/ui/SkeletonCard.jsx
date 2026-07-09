/**
 * Shared loading placeholder. Only analytics.css currently defines the
 * `.skeleton` shimmer utility, so this component ships its own scoped
 * keyframes (under a `.ui-skeleton` class) rather than depending on a rule
 * that doesn't exist on every page yet — keeping it a true drop-in with no
 * other file changes required.
 *
 * Usage:
 *   {loading ? <SkeletonCard rows={3} /> : <div className="card stat-card">...</div>}
 *   {loading ? <SkeletonCard showAvatar rows={2} /> : <RealRow />}
 */
export default function SkeletonCard({ rows = 3, showAvatar = false, className = '' }) {
  return (
    <div className={`card ${className}`.trim()}>
      <style>{`
        .ui-skeleton {
          background: linear-gradient(90deg, var(--bg) 25%, var(--border) 37%, var(--bg) 63%);
          background-size: 400% 100%;
          animation: ui-skeleton-shimmer 1.4s infinite;
          border-radius: var(--radius-sm);
        }
        @keyframes ui-skeleton-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {showAvatar && (
          <div className="ui-skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        )}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="ui-skeleton"
            style={{ height: 14, width: i === rows - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    </div>
  )
}
