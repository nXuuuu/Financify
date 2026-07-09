/**
 * Shared modal shell, replacing the copy-pasted
 * modal-overlay / modal-card / modal-head / modal-close markup.
 *
 * Relies on the .modal-overlay / .modal-card / .modal-head / .modal-close
 * classes that already exist in every page's finai/*.css — those rules stay
 * put until each page is migrated (Phase 2), so this renders correctly on
 * any page today without any CSS changes.
 *
 * Usage:
 *   <Modal open={modal?.type === 'new'} onClose={closeModal} title="New Goal">
 *     <form onSubmit={...}>
 *       ...fields...
 *       <div className="modal-actions">
 *         <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
 *         <button type="submit" className="btn-primary">Save</button>
 *       </div>
 *     </form>
 *   </Modal>
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md', // 'md' | 'sm' -> adds .modal-card-sm
  closeOnOverlayClick = true,
  className = '',
}) {
  if (!open) return null

  function handleOverlayClick(e) {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.()
    }
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className={`modal-card ${size === 'sm' ? 'modal-card-sm' : ''} ${className}`}>
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            {onClose && (
              <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
