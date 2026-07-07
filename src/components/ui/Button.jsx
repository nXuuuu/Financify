const VARIANTS = {
  primary: 'bg-[var(--green)] text-white hover:bg-[var(--green-dark)]',
  ghost: 'bg-transparent text-text border border-border hover:bg-surface-2',
  danger: 'bg-transparent text-negative border border-negative/40 hover:bg-negative/10',
}

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled,
  className = '',
  full,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
