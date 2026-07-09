import styles from './Card.module.css'

export function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h3 className={styles.title}>{title}</h3>
          <button onClick={onClose} className={styles.close}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
