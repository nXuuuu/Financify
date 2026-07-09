import Avatar from './Avatar'

/**
 * Shared page header, replacing the copy-pasted
 * `topbar` / `greeting` / `topbar-actions` block at the top of every page.
 *
 * Pass `actions` for the right-hand side (buttons, filters, icon buttons,
 * search, etc.) — anything you'd have put inside `.topbar-actions`.
 *
 * Usage:
 *   <PageHeader title="Goals" subtitle="Track your savings targets"
 *     actions={<button className="btn-primary" onClick={...}>+ New Goal</button>} />
 *
 *   <PageHeader showAvatar avatarName={name} title={`Welcome, ${name} 👋`}
 *     subtitle="Here's your financial overview for today"
 *     actions={<>...select, search, bell...</>} />
 */
export default function PageHeader({
  title,
  subtitle,
  showAvatar = false,
  avatarName,
  avatarUrl,
  actions,
  className = '',
}) {
  return (
    <div className={`topbar ${className}`.trim()}>
      <div className="greeting">
        {showAvatar && <Avatar name={avatarName} url={avatarUrl} />}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </div>
  )
}
