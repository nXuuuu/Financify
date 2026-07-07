import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink text-muted font-mono text-sm">
        loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
