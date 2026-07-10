import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './ProtectedRoute.module.css'

export default function ProtectedRoute({ children }) {
  const { user, loading, confirmed } = useAuth()

  if (loading) {
    return <div className={styles.loading}>loading…</div>
  }

  if (!user || !confirmed) return <Navigate to="/login" replace />

  return children
}
