import styles from './Button.module.css'

const VARIANTS = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
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
      className={`${styles.btn} ${VARIANTS[variant]} ${full ? styles.full : ''} ${className}`}
    >
      {children}
    </button>
  )
}
