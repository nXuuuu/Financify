export default function Select({ label, children, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <select
        {...props}
        className={`rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:border-brass ${className}`}
      >
        {children}
      </select>
    </label>
  )
}
