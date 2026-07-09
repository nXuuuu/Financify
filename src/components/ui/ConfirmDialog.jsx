import Modal from './Modal'

/**
 * Shared delete/confirm dialog, built on Modal.
 * Replaces the one-off "confirmDeleteGoal" style modal-card-sm markup
 * (currently only in GoalsPage) so every page's delete confirmation
 * looks and behaves the same.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={!!confirmDeleteGoal}
 *     onClose={() => setConfirmDeleteGoal(null)}
 *     title="Delete goal"
 *     message={<>Delete <strong>{confirmDeleteGoal?.name}</strong>? This can't be undone — it will be removed for good.</>}
 *     confirmLabel="Delete"
 *     onConfirm={confirmDelete}
 *   />
 */
export default function ConfirmDialog({
  open,
  onClose,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = true,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
        {message}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'btn-danger-solid' : 'btn-primary'}
          onClick={() => {
            onConfirm?.()
            onClose?.()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
