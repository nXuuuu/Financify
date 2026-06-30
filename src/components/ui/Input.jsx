export default function Input({ label, error, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <input
        {...props}
        className={`rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none focus:border-brass ${className}`}
      />
      {error && <span className="text-xs text-negative">{error}</span>}
    </label>
  )
}
