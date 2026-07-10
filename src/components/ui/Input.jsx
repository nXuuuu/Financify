import { forwardRef } from 'react'
import styles from './Input.module.css'

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <input ref={ref} {...props} className={`${styles.control} ${className}`} />
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
})

export default Input
