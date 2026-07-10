import { Outlet } from 'react-router-dom'
import styles from './AuthLayout.module.css'

export default function AuthLayout() {
  return (
    <div className={styles.container}>
      <div className={styles.cardWrap}>
        <div className={styles.header}>
          <img src="/financify-logo.png" alt="Financify" className={styles.logoIcon} />
          <span className={styles.logoText}>Financify</span>
        </div>

        <Outlet />

        <p className={styles.footerText}>Every entry, accounted for.</p>
      </div>
    </div>
  )
}
