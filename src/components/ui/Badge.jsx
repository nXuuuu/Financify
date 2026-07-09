/**
 * Shared status badge, replacing one-off `<span className="badge badge-...">`
 * spans. Works with any status keyword already styled in a page's CSS
 * (e.g. Goals: success / failed / warning — Budget: on_track / nearly_full /
 * exceeded / no_spend), since it just composes `badge-{status}`.
 *
 * Usage:
 *   <Badge status="success">✓ Success</Badge>
 *   <Badge status="on_track">On track</Badge>
 */
export default function Badge({ status, children, className = '' }) {
  return <span className={`badge badge-${status} ${className}`.trim()}>{children}</span>
}
