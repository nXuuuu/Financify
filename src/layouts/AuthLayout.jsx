import { Outlet } from 'react-router-dom'
import styles from './AuthLayout.module.css'

const bubbles = [
  { className: styles.b1 },
  { className: styles.b2 },
  { className: styles.b3 },
  { className: styles.b4 },
  { className: styles.b5 },
  { className: styles.b6 },
]

export default function AuthLayout() {
  return (
    <div className={`${styles.container} ${styles.bg}`}>
      {/* floating glass bubbles */}
      {bubbles.map((b, i) => (
        <span key={i} className={`${styles.bubble} ${b.className}`} />
      ))}

      {/* centered auth card */}
      <div className={styles.cardWrap}>
        <div className={styles.header}>
          <img src="/financify-logo.png" alt="Financify" className={styles.logoIcon} />
          <span className={styles.logoText}>Financify</span>
        </div>

        <div className={styles.glassCard}>
          <Outlet />
        </div>

        <p className={styles.footerText}>Every entry, accounted for.</p>
      </div>
    </div>
  )
}