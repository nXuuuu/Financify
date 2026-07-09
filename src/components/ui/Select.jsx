import styles from './Input.module.css'

export default function Select({ label, children, className = '', ...props }) {
  return (
    <label className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <select {...props} className={`${styles.control} ${className}`}>
        {children}
      </select>
    </label>
  )
}
