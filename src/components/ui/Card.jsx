export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
