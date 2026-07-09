import styles from './Input.module.css'

export default function Input({ label, error, className = '', ...props }) {
  return (
    <label className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <input {...props} className={`${styles.control} ${className}`} />
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
}
